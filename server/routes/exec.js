const router = require('express').Router();
const fetch = require('node-fetch');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const { DebugProblem, CodingProblem } = require('../models/Problem');
const Submission = require('../models/Submission');
const Student = require('../models/Student');
const ExamState = require('../models/ExamState');

const PISTON_API = process.env.PISTON_API || 'https://emkc.org/api/v2/piston/execute';
const JUDGE0_API = process.env.JUDGE0_API || 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

const LANG_MAP = {
  cpp:        { language: 'cpp',        version: '10.2.0',  filename: 'solution.cpp' },
  python:     { language: 'python',     version: '3.10.0',  filename: 'solution.py' },
  java:       { language: 'java',       version: '15.0.2',  filename: 'Main.java' },
  javascript: { language: 'javascript', version: '18.15.0', filename: 'solution.js' },
};

const JUDGE0_LANG_MAP = {
  cpp: 54,
  python: 71,
  java: 62,
  javascript: 63,
};

const sha256 = (text) =>
  crypto.createHash('sha256').update((text || '').trim()).digest('hex');

async function runOnPiston(code, lang, stdin = '') {
  const lc = LANG_MAP[lang];
  if (!lc) throw new Error(`Unsupported language: ${lang}`);

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(PISTON_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          language:        lc.language,
          version:         lc.version,
          files:           [{ name: lc.filename, content: code }],
          stdin,
          run_timeout:     10000,
          compile_timeout: 15000,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (attempt === 1 && res.status >= 500) continue;
        throw new Error(`Piston API error: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err?.name === 'AbortError';
      const isTransient = isAbort || /network|fetch failed|ECONNRESET|ETIMEDOUT/i.test(err?.message || '');

      if (attempt === 1 && isTransient) continue;
      if (isAbort) throw new Error('Code runner timeout. Please try again.');
      throw err;
    }
  }

  throw new Error('Code runner unavailable. Please try again.');
}

async function runOnJudge0(code, lang, stdin = '') {
  const languageId = JUDGE0_LANG_MAP[lang];
  if (!languageId) throw new Error(`Unsupported language: ${lang}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(JUDGE0_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin,
      }),
    });

    if (!res.ok) throw new Error(`Judge0 API error: ${res.status}`);
    const data = await res.json();

    return {
      run: {
        stdout: data.stdout || '',
        stderr: data.stderr || data.message || '',
        code: data.status?.id,
        signal: null,
      },
      compile: {
        stderr: data.compile_output || '',
      },
    };
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('Code runner timeout. Please try again.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runCode(code, lang, stdin = '') {
  try {
    return await runOnPiston(code, lang, stdin);
  } catch (err) {
    const msg = err?.message || '';
    const shouldFallback = /Piston API error: 401|Piston API error: 403|Piston API error: 5\d\d|Code runner unavailable|Code runner timeout|network|fetch failed/i.test(msg);
    if (!shouldFallback) throw err;
    return runOnJudge0(code, lang, stdin);
  }
}

// POST /api/exec/run — run code against custom input (no submission recorded)
router.post('/run', protect, async (req, res) => {
  try {
    const { code, language, stdin } = req.body;
    if (!code || !language) return res.status(400).json({ error: 'code and language required' });

    const result = await runCode(code, language, stdin || '');
    res.json({
      stdout:     result.run?.stdout || '',
      stderr:     result.run?.stderr || '',
      compileErr: result.compile?.stderr || '',
      exitCode:   result.run?.code,
      signal:     result.run?.signal,
    });
  } catch (err) {
    const message = err?.message || 'Execution failed';
    const status = /Piston API error|Code runner timeout|Code runner unavailable|network|fetch failed/i.test(message) ? 502 : 500;
    res.status(status).json({ error: message });
  }
});

// POST /api/exec/submit — submit code for judging
router.post('/submit', protect, async (req, res) => {
  try {
    const { problemId, round, language, code } = req.body;
    if (!problemId || !round || !language || !code)
      return res.status(400).json({ error: 'Missing fields' });

    const student = req.student;
    const examState = await ExamState.findById('global');

    // Check if already solved (idempotent)
    const roundKey = `r${round}`;
    const alreadySolved = student[roundKey]?.solved?.some(
      s => s.problemId.toString() === problemId.toString()
    );

    let result, verdict, passedCount = 0, totalCount = 0, penaltyAdded = 0;

    if (round === 2) {
      // ── Debug submission ────────────────────────────────────
      const problem = await DebugProblem.findById(problemId);
      if (!problem) return res.status(404).json({ error: 'Problem not found' });

      const pistonResult = await runCode(code, language, problem.sampleInput || '');
      const stdout = (pistonResult.run?.stdout || '').trim();
      const stderr = pistonResult.run?.stderr || '';
      const compileErr = pistonResult.compile?.stderr || '';

      const outputHash = sha256(stdout);
      const accepted = outputHash === problem.expectedOutputHash && !compileErr && !stderr;

      verdict     = accepted ? 'Accepted' : compileErr ? 'Compile Error' : stderr ? 'Runtime Error' : 'Wrong Answer';
      passedCount = accepted ? 1 : 0;
      totalCount  = 1;

      // Apply penalty
      if (!accepted && !alreadySolved) {
        const pen = examState?.penalties?.r2 || 10;
        penaltyAdded = pen;
        student.r2.penalty = (student.r2.penalty || 0) + pen;
      }

      // Update attempts
      const prevAttempts = student.r2.attempts?.get?.(problemId) || 0;
      student.r2.attempts.set(problemId, prevAttempts + 1);

      if (accepted && !alreadySolved) {
        student.r2.solved.push({
          problemId,
          language,
          attempts: prevAttempts + 1,
        });
        student.r2.score = (student.r2.score || 0) + 1;
      }

      result = { stdout, stderr, compileErr };

    } else if (round === 3) {
      // ── Coding submission ───────────────────────────────────
      const problem = await CodingProblem.findById(problemId);
      if (!problem) return res.status(404).json({ error: 'Problem not found' });

      totalCount = problem.testCases.length;
      const tcResults = [];

      for (const tc of problem.testCases) {
        const pistonResult = await runCode(code, language, tc.input);
        const stdout    = (pistonResult.run?.stdout || '').trim();
        const stderr    = pistonResult.run?.stderr || '';
        const compileErr = pistonResult.compile?.stderr || '';

        if (compileErr) {
          verdict = 'Compile Error';
          tcResults.push({ ok: false, stderr: compileErr, compileErr });
          break;
        }

        const outputHash = sha256(stdout);
        const ok = outputHash === tc.outputHash;
        if (ok) passedCount++;
        tcResults.push({ ok, stdout, stderr });
      }

      const allPassed = passedCount === totalCount && !verdict;
      verdict = verdict || (allPassed ? 'Accepted' : 'Wrong Answer');

      // Apply penalty
      if (!allPassed && !alreadySolved) {
        const pen = examState?.penalties?.r3 || 10;
        penaltyAdded = pen;
        student.r3.penalty = (student.r3.penalty || 0) + pen;
      }

      // Update attempts
      const prevAttempts = student.r3.attempts?.get?.(problemId) || 0;
      student.r3.attempts.set(problemId, prevAttempts + 1);

      if (allPassed && !alreadySolved) {
        student.r3.solved.push({
          problemId,
          language,
          attempts: prevAttempts + 1,
        });
        student.r3.score = (student.r3.score || 0) + 1;
      }

      result = { tcResults };
    }

    await student.save();

    // Record submission
    const submission = await Submission.create({
      studentId:    student._id,
      rollNo:       student.rollNo,
      problemId,
      round,
      language,
      code,
      verdict,
      passedCount,
      totalCount,
      penaltyAdded,
      stdout: result.stdout || '',
      stderr: result.stderr || result.compileErr || '',
    });

    res.json({
      verdict,
      passedCount,
      totalCount,
      penaltyAdded,
      submissionId: submission._id,
      tcResults:    result.tcResults || [],
      stdout:       result.stdout || '',
      stderr:       result.stderr || '',
      compileErr:   result.compileErr || '',
      alreadySolved,
    });

  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

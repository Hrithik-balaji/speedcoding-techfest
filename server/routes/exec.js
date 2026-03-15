const router = require('express').Router();
const fetch = require('node-fetch');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const { DebugProblem, CodingProblem } = require('../models/Problem');
const Submission = require('../models/Submission');
const Student = require('../models/Student');
const ExamState = require('../models/ExamState');

const JUDGE0_URL = process.env.JUDGE0_URL || 'https://ce.judge0.com';

const LANGUAGE_IDS = {
  python: 71,
  java: 62,
  c: 50,
  cpp: 54,
};

const lastSubmitTime = new Map();
setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [id, time] of lastSubmitTime.entries()) {
    if (time < cutoff) lastSubmitTime.delete(id);
  }
}, 60000);

function resolveLanguage(inputLanguage) {
  const lang = String(inputLanguage || '').toLowerCase();
  if (!LANGUAGE_IDS[lang]) {
    console.warn('Unknown language, defaulting to python:', inputLanguage);
    return 'python';
  }
  return lang;
}

function enforceCooldown(req, res) {
  const studentId = String(req.student?._id || '');
  const now = Date.now();
  const last = lastSubmitTime.get(studentId) || 0;
  const cooldownMs = 5000;
  const elapsed = now - last;

  if (elapsed < cooldownMs) {
    const waitMs = cooldownMs - elapsed;
    res.status(429).json({
      error: 'cooldown',
      waitMs,
      waitSeconds: Math.ceil(waitMs / 1000),
      message: `Please wait ${Math.ceil(waitMs / 1000)} second(s) before trying again`,
    });
    return false;
  }

  lastSubmitTime.set(studentId, now);
  return true;
}

function applyRoundScore(student, roundNum, isCorrect) {
  const delta = isCorrect ? 10 : -5;
  if (roundNum === 2) {
    student.r2.score = Number(student.r2.score || 0) + delta;
  }
  if (roundNum === 3) {
    student.r3.score = Number(student.r3.score || 0) + delta;
  }
}

const JUDGE0_STATUS = {
  1:  'In Queue',
  2:  'Processing',
  3:  'Accepted',
  4:  'Wrong Answer',
  5:  'Time Limit Exceeded',
  6:  'Compilation Error',
  7:  'Runtime Error (SIGSEGV)',
  8:  'Runtime Error (SIGXFSZ)',
  9:  'Runtime Error (SIGFPE)',
  10: 'Runtime Error (SIGABRT)',
  11: 'Runtime Error (NZEC)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error',
};

const sha256 = (text) =>
  crypto.createHash('sha256').update((text || '').trim()).digest('hex');

async function runCode(code, lang, stdin = '') {
  const language = resolveLanguage(lang);
  const languageId = LANGUAGE_IDS[language];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(`${JUDGE0_URL}/submissions?wait=true`, {
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

    const statusId = data.status?.id;
    const statusMsg = JUDGE0_STATUS[statusId] || `Unknown status (${statusId})`;

    return {
      run: {
        stdout: data.stdout || '',
        stderr: data.stderr || data.message || '',
        code: statusId,
        signal: null,
        status: statusMsg,
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

// POST /api/exec/run — run code against custom input (no submission recorded)
router.post('/run', protect, async (req, res) => {
  try {
    const { code, language, stdin, problemId, round } = req.body;
    const roundNum = Number(round || 0);
    if (!code) return res.status(400).json({ error: 'code is required' });
    if (!enforceCooldown(req, res)) return;

    const lang = resolveLanguage(language);
    if (lang === 'java' && !code.includes('class Solution')) {
      return res.status(400).json({ error: 'Java class must be named Solution' });
    }

    const student = req.student;
    const result = await runCode(code, lang, stdin || '');

    let correct = false;
    if (roundNum === 2 && problemId) {
      const problem = await DebugProblem.findById(problemId);
      if (problem) {
        const stdout = String(result.run?.stdout || '').trim();
        const stderr = String(result.run?.stderr || '').trim();
        const compileErr = String(result.compile?.stderr || '').trim();
        correct = sha256(stdout) === problem.expectedOutputHash && !stderr && !compileErr;
      }
    }

    if (roundNum === 3 && problemId) {
      const problem = await CodingProblem.findById(problemId);
      if (problem) {
        if (problem.allowedLanguages?.length && !problem.allowedLanguages.includes(lang)) {
          return res.status(400).json({ error: 'This language is not allowed for this problem' });
        }
        correct = true;
        for (const tc of problem.testCases) {
          const tcResult = await runCode(code, lang, tc.input);
          const stdout = String(tcResult.run?.stdout || '').trim();
          const stderr = String(tcResult.run?.stderr || '').trim();
          const compileErr = String(tcResult.compile?.stderr || '').trim();
          if (compileErr || stderr || sha256(stdout) !== tc.outputHash) {
            correct = false;
            break;
          }
        }
      }
    }

    if (roundNum === 2 || roundNum === 3) {
      applyRoundScore(student, roundNum, correct);
      await student.save();
    }

    res.json({
      correct,
      stdout: result.run?.stdout || '',
      stderr: result.run?.stderr || '',
      compileErr: result.compile?.stderr || '',
      exitCode: result.run?.code,
      signal: result.run?.signal,
    });
  } catch (err) {
    const message = err?.message || 'Execution failed';
    const status = /Judge0 API error|Code runner timeout|network|fetch failed/i.test(message) ? 502 : 500;
    res.status(status).json({ error: message });
  }
});

// POST /api/exec/submit — submit code for judging
router.post('/submit', protect, async (req, res) => {
  try {
    const { problemId, round, language, code } = req.body;
    const roundNum = Number(round);
    if (!problemId || !round || !code)
      return res.status(400).json({ error: 'Missing fields' });

    if (!enforceCooldown(req, res)) return;

    const lang = resolveLanguage(language);
    if (lang === 'java' && !code.includes('class Solution')) {
      return res.status(400).json({ error: 'Java class must be named Solution' });
    }

    const student = req.student;
    if (student.eliminated) {
      return res.status(403).json({ error: 'You are eliminated from the contest' });
    }
    const examState = await ExamState.findById('global');

    if (roundNum === 2) {
      const r2End = Number(examState?.roundEndTimes?.r2 || 0);
      const r2Over = examState?.forceEnded?.r2 === true || (r2End > 0 && Date.now() >= r2End);
      if (r2Over && Number(student.debugSolvedCount || 0) < 2) {
        student.eliminated = true;
        student.eliminatedReason = 'Did not pass Round 2';
        await student.save();
        return res.status(403).json({ error: 'You did not pass Round 2' });
      }
    }

    // Check if already solved (idempotent)
    const roundKey = `r${roundNum}`;
    const alreadySolved = student[roundKey]?.solved?.some(
      s => s.problemId.toString() === problemId.toString()
    );

    let result, verdict, passedCount = 0, totalCount = 0, penaltyAdded = 0;

    if (roundNum === 2) {
      // ── Debug submission ────────────────────────────────────
      const problem = await DebugProblem.findById(problemId);
      if (!problem) return res.status(404).json({ error: 'Problem not found' });

      const execResult = await runCode(code, lang, problem.sampleInput || '');
      const stdout = (execResult.run?.stdout || '').trim();
      const stderr = execResult.run?.stderr || '';
      const compileErr = execResult.compile?.stderr || '';

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
          language: lang,
          attempts: prevAttempts + 1,
        });
        const pid = String(problemId);
        const solvedIds = new Set((student.debugSolvedIds || []).map((id) => String(id)));
        if (!solvedIds.has(pid)) {
          student.debugSolvedIds.push(problemId);
          student.debugSolvedCount = Number(student.debugSolvedCount || 0) + 1;
        }

        if (Number(student.debugSolvedCount || 0) >= 2) {
          student.currentRound = 3;
          student.debugCompletedAt = new Date();
        }
      }

      result = { stdout, stderr, compileErr };
      applyRoundScore(student, 2, accepted);

    } else if (roundNum === 3) {
      // ── Coding submission ───────────────────────────────────
      const problem = await CodingProblem.findById(problemId);
      if (!problem) return res.status(404).json({ error: 'Problem not found' });

      if (problem.allowedLanguages?.length && !problem.allowedLanguages.includes(lang)) {
        return res.status(400).json({ error: 'This language is not allowed for this problem' });
      }

      totalCount = problem.testCases.length;
      const tcResults = [];

      for (const tc of problem.testCases) {
        const execResult = await runCode(code, lang, tc.input);
        const stdout    = (execResult.run?.stdout || '').trim();
        const stderr    = execResult.run?.stderr || '';
        const compileErr = execResult.compile?.stderr || '';

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
          language: lang,
          attempts: prevAttempts + 1,
        });
        if (Number(student.codingSolvedCount || 0) < 1) {
          student.codingSolvedCount = 1;
          student.codingCompletedAt = new Date();
          const contestStartTime = Number(examState?.contestStartTime || 0);
          if (contestStartTime > 0) {
            student.totalTimeMs = Math.max(0, student.codingCompletedAt.getTime() - contestStartTime);
          }
        }
      }

      result = { tcResults };
      applyRoundScore(student, 3, allPassed);
    }

    await student.save();

    // Record submission
    const submission = await Submission.create({
      studentId:    student._id,
      rollNo:       student.rollNo,
      problemId,
      round,
      language: lang,
      code,
      verdict,
      passedCount,
      totalCount,
      penaltyAdded,
      stdout: result.stdout || '',
      stderr: result.stderr || result.compileErr || '',
    });

    if (roundNum === 2) {
      if (verdict === 'Accepted') {
        if (Number(student.debugSolvedCount || 0) >= 2) {
          return res.json({ correct: true, promoted: true, nextRound: 3 });
        }
        return res.json({
          correct: true,
          promoted: false,
          solvedCount: Number(student.debugSolvedCount || 0),
          needed: 2,
        });
      }
      return res.json({ correct: false, message: 'Wrong answer. Try again.' });
    }

    if (roundNum === 3) {
      if (verdict === 'Accepted') {
        return res.json({ correct: true, finished: true, message: 'You have completed the contest!' });
      }
      return res.json({ correct: false, message: 'Wrong answer. Try again.' });
    }

    res.json({ correct: verdict === 'Accepted' });

  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

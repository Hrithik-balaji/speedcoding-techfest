const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Student = require('../models/Student');
const ExamState = require('../models/ExamState');

async function resetStudentsForRound(roundNumber) {
  const r = Number(roundNumber);

  if (r === 1) {
    await Student.updateMany(
      {},
      {
        currentRound: 1,
        mcqCompletedAt: null,
        mcqAnswers: [],
        mcqCorrectCount: 0,
        eliminated: false,
        eliminatedReason: '',
        debugCompletedAt: null,
        debugSolvedCount: 0,
        debugSolvedIds: [],
        codingCompletedAt: null,
        codingSolvedCount: 0,
        totalTimeMs: null,
        finalRank: null,
        'r1.answers': {},
        'r1.score': 0,
        'r1.submitted': false,
        'r1.submitTime': null,
        'r2.solved': [],
        'r2.score': 0,
        'r2.penalty': 0,
        'r2.attempts': {},
        'r3.solved': [],
        'r3.score': 0,
        'r3.penalty': 0,
        'r3.attempts': {},
        'r3.totalTime': 0,
      }
    );
  }

  if (r === 2) {
    await Student.updateMany(
      { currentRound: 2 },
      {
        debugCompletedAt: null,
        debugSolvedCount: 0,
        debugSolvedIds: [],
        eliminated: false,
        eliminatedReason: '',
      }
    );
  }

  if (r === 3) {
    await Student.updateMany(
      { currentRound: 3 },
      {
        codingCompletedAt: null,
        codingSolvedCount: 0,
        totalTimeMs: null,
        finalRank: null,
      }
    );
  }
}

// GET /api/students/me — get own profile + state
router.get('/me', protect, async (req, res) => {
  try {
    const examState = await ExamState.findById('global');

    // Safety net: when contest is not running, stale elimination flags should not block login flow.
    if (!examState?.contestStarted && req.student.eliminated) {
      req.student.eliminated = false;
      req.student.eliminatedReason = '';
      req.student.currentRound = 1;
      await req.student.save();
    }

    // If round 2 is over and threshold unmet, mark eliminated.
    const r2End = Number(examState?.roundEndTimes?.r2 || 0);
    const r2Over = examState?.forceEnded?.r2 === true || (r2End > 0 && Date.now() >= r2End);
    if (
      Number(req.student.currentRound || 0) === 2 &&
      !req.student.eliminated &&
      r2Over &&
      Number(req.student.debugSolvedCount || 0) < 2
    ) {
      req.student.eliminated = true;
      req.student.eliminatedReason = 'Did not pass Round 2';
      await req.student.save();
    }

    res.json({ student: req.student, examState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/students/me/heartbeat — update lastSeen
router.patch('/me/heartbeat', protect, async (req, res) => {
  try {
    req.student.lastSeen = new Date();
    const activeSession = req.student.sessions?.find(
      s => s.sessionId === req.student.activeSessionId && !s.revokedAt
    );
    if (activeSession) activeSession.lastSeenAt = new Date();
    await req.student.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/me/violation — report a violation
router.post('/me/violation', protect, async (req, res) => {
  try {
    const { type, description, round } = req.body;
    const student = req.student;
    console.log('Violation received:', req.body, 'Student:', String(student?._id || req.user?.id || 'unknown'));

    if (!type || !String(type).trim()) {
      return res.status(400).json({ error: 'Violation type is required' });
    }

    student.violationCount = Number(student.violationCount || 0) + 1;
    student.violations.push({
      type: String(type).trim(),
      timestamp: new Date(),
      description: String(description || '').trim(),
      round: Number(round || 0),
    });

    if (student.violationCount >= 1) {
      student.terminated = true;
      student.terminatedReason = String(type).trim();
      student.status = 'Kicked';
    }

    await student.save();
    res.json({
      terminated: Boolean(student.terminated),
      violationCount: Number(student.violationCount || 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/me/mcq-submit — submit MCQ round
router.post('/me/mcq-submit', protect, async (req, res) => {
  try {
    const { answers } = req.body;
    const student = req.student;

    if (student.r1.submitted)
      return res.status(400).json({ error: 'MCQ already submitted' });

    const { MCQ } = require('../models/Problem');
    const questions = await MCQ.find().select('_id correct');

    // Supports either:
    // 1) object map: { [questionId]: selectedAnswer }
    // 2) array: [{ questionId, selectedAnswer }]
    const normalizedAnswers = Array.isArray(answers)
      ? answers
          .map((a) => ({
            questionId: String(a?.questionId || '').trim(),
            selectedAnswer: Number(a?.selectedAnswer),
          }))
          .filter((a) => a.questionId && Number.isInteger(a.selectedAnswer))
      : Object.entries(answers || {}).map(([questionId, selectedAnswer]) => ({
          questionId: String(questionId),
          selectedAnswer: Number(selectedAnswer),
        })).filter((a) => a.questionId && Number.isInteger(a.selectedAnswer));

    const answerMap = new Map(normalizedAnswers.map((a) => [a.questionId, a.selectedAnswer]));

    const mcqAnswers = [];
    let mcqCorrectCount = 0;
    let mcqScore = 0;
    for (const q of questions) {
      const selectedAnswer = answerMap.get(String(q._id));
      if (!Number.isInteger(selectedAnswer)) continue;
      const isCorrect = selectedAnswer === Number(q.correct);
      if (isCorrect) mcqCorrectCount += 1;
      mcqScore += isCorrect ? 4 : -2;
      mcqAnswers.push({
        questionId: q._id,
        selectedAnswer,
        correct: isCorrect,
      });
    }

    student.mcqAnswers = mcqAnswers;
    student.mcqCorrectCount = mcqCorrectCount;

    student.r1.answers = Object.fromEntries(answerMap.entries());
    student.r1.score = mcqScore;
    student.r1.submitted  = true;
    student.r1.submitTime = new Date();
    student.mcqCompletedAt = new Date();

    if (mcqCorrectCount >= 5) {
      student.currentRound = 2;
      student.eliminated = false;
      student.eliminatedReason = '';
      await student.save();
      return res.json({ promoted: true, nextRound: 2 });
    }

    student.eliminated = true;
    student.eliminatedReason = 'Did not pass Round 1';
    await student.save();
    res.json({ promoted: false, eliminated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/students/me/submissions — all submissions for current student
router.get('/me/submissions', protect, async (req, res) => {
  try {
    const Submission = require('../models/Submission');
    const subs = await Submission.find({ rollNo: req.student.rollNo })
      .sort({ createdAt: -1 })
      .select('-code'); // don't return code to client for security
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.resetStudentsForRound = resetStudentsForRound;

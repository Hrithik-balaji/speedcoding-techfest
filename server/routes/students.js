const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Student = require('../models/Student');
const ExamState = require('../models/ExamState');

// GET /api/students/me — get own profile + state
router.get('/me', protect, async (req, res) => {
  try {
    const examState = await ExamState.findById('global');
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
    const { type, round } = req.body;
    const student = req.student;

    student.violations.push({ type, round });

    // Auto-warn on first violation
    const nonKickViolations = student.violations.filter(v =>
      !v.type.includes('Kicked')
    );
    if (nonKickViolations.length >= 1 && student.status === 'Active') {
      student.status = 'Warned';
    }

    await student.save();
    res.json({ status: student.status, warned: nonKickViolations.length >= 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/me/mcq-submit — submit MCQ round
router.post('/me/mcq-submit', protect, async (req, res) => {
  try {
    const { answers } = req.body; // { questionId: selectedIndex }
    const student = req.student;

    if (student.r1.submitted)
      return res.status(400).json({ error: 'MCQ already submitted' });

    // Score is computed server-side
    const { MCQ } = require('../models/Problem');
    const questions = await MCQ.find();

    let score = 0;
    questions.forEach(q => {
      const ans = answers?.[q._id.toString()];
      if (ans === undefined || ans === null) return;
      if (ans === q.correct) score += q.points;
      else score -= 0.25;
    });

    student.r1.answers    = answers || {};
    student.r1.score      = Math.max(0, parseFloat(score.toFixed(2)));
    student.r1.submitted  = true;
    student.r1.submitTime = new Date();
    await student.save();

    res.json({ score: student.r1.score, submitted: true });
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

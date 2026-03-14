const router = require('express').Router();
const { protect, adminProtect } = require('../middleware/auth');
const Submission = require('../models/Submission');

// GET /api/submissions/problem/:problemId — get student's submissions for a problem
router.get('/problem/:problemId', protect, async (req, res) => {
  try {
    const subs = await Submission.find({
      rollNo:    req.student.rollNo,
      problemId: req.params.problemId,
    }).sort({ createdAt: -1 }).select('-code');
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/submissions/admin/all — admin: all submissions
router.get('/admin/all', adminProtect, async (req, res) => {
  try {
    const subs = await Submission.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .select('-code');
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

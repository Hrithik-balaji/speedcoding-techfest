const router = require('express').Router();
const { adminProtect } = require('../middleware/auth');
const Student = require('../models/Student');
const Submission = require('../models/Submission');
const ExamState = require('../models/ExamState');

// Helper: get or create global exam state
async function getState() {
  let state = await ExamState.findById('global');
  if (!state) state = await ExamState.create({ _id: 'global' });
  return state;
}

// GET /api/admin/students — all students
router.get('/students', adminProtect, async (req, res) => {
  try {
    const students = await Student.find()
      .select('_id name rollNo college phoneNumber department academicSession status lastSeen overrides violations r1.score r2.score r2.solved r2.penalty r3.score r3.solved r3.penalty')
      .sort({ createdAt: 1 });
    res.json(students);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/students/:id/kick
router.patch('/students/:id/kick', adminProtect, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Kicked',
        $push: { violations: { type: 'Kicked by admin', round: 0 } },
      },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/students/:id/warn
router.patch('/students/:id/warn', adminProtect, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Warned',
        $push: { violations: { type: 'Warned by admin', round: 0 } },
      },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/students/:id/reinstate
router.patch('/students/:id/reinstate', adminProtect, async (req, res) => {
  try {
    const { reason } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: 'Active' },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const state = await getState();
    state.reinstateLog.push({ studentName: student.name, rollNo: student.rollNo, reason: reason || '' });
    await state.save();

    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/students/bulk-reinstate
router.post('/students/bulk-reinstate', adminProtect, async (req, res) => {
  try {
    await Student.updateMany({ status: 'Kicked' }, { status: 'Active' });
    const state = await getState();
    state.reinstateLog.push({ studentName: 'ALL', rollNo: 'BULK', reason: 'Bulk reinstate by admin' });
    await state.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/students/:id/override — score override
router.patch('/students/:id/override', adminProtect, async (req, res) => {
  try {
    const { r1Score, r2Score, r3Score, reason } = req.body;

    const toValidScore = (val, label) => {
      const n = Number(val);
      if (!Number.isFinite(n) || n < 0 || n > 10000) return null;
      return n;
    };

    if (r1Score !== undefined && toValidScore(r1Score) === null) return res.status(400).json({ error: 'R1 Score must be 0–10000' });
    if (r2Score !== undefined && toValidScore(r2Score) === null) return res.status(400).json({ error: 'R2 Score must be 0–10000' });
    if (r3Score !== undefined && toValidScore(r3Score) === null) return res.status(400).json({ error: 'R3 Score must be 0–10000' });

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const state = await getState();
    const log = (field, from, to) => {
      if (from !== to) state.overrideLog.push({
        studentName: student.name, rollNo: student.rollNo,
        field, from, to, reason: reason || '',
      });
    };

    if (r1Score !== undefined) { const v = Number(r1Score); log('R1 Score', student.r1.score, v); student.r1.score = v; student.overrides.set('r1Score', v); }
    if (r2Score !== undefined) { const v = Number(r2Score); log('R2 Score', student.r2.score || 0, v); student.r2.score = v; student.overrides.set('r2Score', v); }
    if (r3Score !== undefined) { const v = Number(r3Score); log('R3 Score', student.r3.score || 0, v); student.r3.score = v; student.overrides.set('r3Score', v); }

    await student.save();
    await state.save();
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/violations — all violations
router.get('/violations', adminProtect, async (req, res) => {
  try {
    const students = await Student.find({ 'violations.0': { $exists: true } })
      .select('name rollNo violations');
    const all = [];
    students.forEach(s => {
      s.violations.forEach(v => all.push({
        name: s.name, rollNo: s.rollNo,
        type: v.type, round: v.round, timestamp: v.timestamp,
      }));
    });
    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(all);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/state — exam state
router.get('/state', adminProtect, async (req, res) => {
  res.json(await getState());
});

// GET /api/admin/logs — override + reinstate logs
router.get('/logs', adminProtect, async (req, res) => {
  const state = await getState();
  res.json({ overrideLog: state.overrideLog, reinstateLog: state.reinstateLog });
});

module.exports = router;

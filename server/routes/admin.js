const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { adminProtect } = require('../middleware/auth');
const Student = require('../models/Student');
const Submission = require('../models/Submission');
const ExamState = require('../models/ExamState');
const { calculateRankings } = require('./leaderboard');

// Generous rate limit for admin routes (keyed by user id, not raw IP)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  keyGenerator: (req) => (req.user && req.user.id) ? req.user.id : req.ip,
  message: { error: 'Too many admin requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(adminLimiter);

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
      .select('_id name rollNo college phoneNumber department academicSession status terminated terminatedReason violationCount lastSeen overrides violations r1.score r2.score r2.solved r2.penalty r3.score r3.solved r3.penalty')
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
        terminated: true,
        terminatedReason: 'admin_kick',
        $push: { violations: { type: 'admin_kick', round: 0, description: 'Kicked by admin' } },
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
      {
        $set: {
          status: 'Active',
          terminated: false,
          terminatedReason: '',
          violationCount: 0,
          violations: [],
        },
      },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const state = await getState();
    state.reinstateLog.push({ studentName: student.name, rollNo: student.rollNo, reason: reason || '' });
    await state.save();

    res.json({
      success: true,
      message: 'Student reinstated',
      student: {
        terminated: false,
        terminatedReason: '',
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/students/bulk-reinstate
router.post('/students/bulk-reinstate', adminProtect, async (req, res) => {
  try {
    await Student.updateMany(
      { $or: [{ status: 'Kicked' }, { terminated: true }] },
      { status: 'Active', terminated: false, terminatedReason: '', violationCount: 0 }
    );
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

    if (r1Score !== undefined) {
      const v = Number(r1Score);
      log('R1 Score', Number(student.r1Score ?? student.r1?.score ?? 0), v);
      student.r1.score = v;
      student.r1Score = v;
      student.overrides.set('r1Score', v);
    }
    if (r2Score !== undefined) {
      const v = Number(r2Score);
      log('R2 Score', Number(student.r2Score ?? student.r2?.score ?? 0), v);
      student.r2.score = v;
      student.r2Score = v;
      student.overrides.set('r2Score', v);
    }
    if (r3Score !== undefined) {
      const v = Number(r3Score);
      log('R3 Score', Number(student.r3Score ?? student.r3?.score ?? 0), v);
      student.r3.score = v;
      student.r3Score = v;
      student.overrides.set('r3Score', v);
    }

    student.totalScore =
      Number(student.r1Score || 0) +
      Number(student.r2Score || 0) +
      Number(student.r3Score || 0);

    student.overrideLog.push({
      changedAt: new Date(),
      r1Score: r1Score !== undefined ? Number(r1Score) : student.r1.score,
      r2Score: r2Score !== undefined ? Number(r2Score) : (student.r2?.score || 0),
      r3Score: r3Score !== undefined ? Number(r3Score) : (student.r3?.score || 0),
      changedBy: 'admin',
    });

    await student.save();
    await state.save();
    await calculateRankings();

    const updatedStudent = await Student.findById(student._id);
    res.json({ success: true, student: updatedStudent, newRank: updatedStudent?.finalRank ?? null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/violations — all violations
router.get('/violations', adminProtect, async (req, res) => {
  try {
    const students = await Student.find({ 'violations.0': { $exists: true } })
      .select('_id name rollNo violationCount terminated terminatedReason violations');

    const rows = students
      .map((s) => ({
        _id: s._id,
        studentName: s.name,
        rollNo: s.rollNo,
        violationCount: Number(s.violationCount || s.violations?.length || 0),
        terminated: Boolean(s.terminated),
        terminatedReason: s.terminatedReason || '',
        violations: (s.violations || [])
          .map((v) => ({
            type: v.type,
            description: v.description || '',
            timestamp: v.timestamp,
            round: v.round,
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      }))
      .sort((a, b) => b.violationCount - a.violationCount);

    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/state — exam state
router.get('/state', adminProtect, async (req, res) => {
  const state = await getState();
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const connectedStudents = await Student.countDocuments({
    status: { $ne: 'Kicked' },
    lastSeen: { $gte: twoMinutesAgo },
  });

  res.json({
    ...state.toObject(),
    connectedStudents,
  });
});

// GET /api/admin/logs — override + reinstate logs
router.get('/logs', adminProtect, async (req, res) => {
  const state = await getState();
  res.json({ overrideLog: state.overrideLog, reinstateLog: state.reinstateLog });
});

// GET /api/admin/round-status — progression summary
router.get('/round-status', adminProtect, async (_req, res) => {
  try {
    const students = await Student.find().select(
      'currentRound eliminated eliminatedReason mcqCorrectCount debugSolvedCount codingCompletedAt r1.submitted'
    );

    const round1Total = students.length;
    const round1Promoted = students.filter((s) => Number(s.currentRound || 0) >= 2 || Number(s.mcqCorrectCount || 0) >= 5).length;
    const round1Eliminated = students.filter((s) => s.eliminated && String(s.eliminatedReason || '') === 'Did not pass Round 1').length;

    const round2Pool = students.filter((s) => Number(s.currentRound || 0) >= 2 || Number(s.debugSolvedCount || 0) > 0);
    const round2Total = round2Pool.length;
    const round2Promoted = round2Pool.filter((s) => Number(s.currentRound || 0) >= 3 || Number(s.debugSolvedCount || 0) >= 2).length;
    const round2Eliminated = students.filter((s) => s.eliminated && String(s.eliminatedReason || '') === 'Did not pass Round 2').length;

    const round3Pool = students.filter((s) => Number(s.currentRound || 0) >= 3 || s.codingCompletedAt);
    const round3Total = round3Pool.length;
    const round3Finished = round3Pool.filter((s) => Boolean(s.codingCompletedAt)).length;

    const notStarted = students.filter((s) => Number(s.currentRound || 1) === 1 && !s.r1?.submitted).length;

    return res.json({
      round1: { total: round1Total, promoted: round1Promoted, eliminated: round1Eliminated },
      round2: { total: round2Total, promoted: round2Promoted, eliminated: round2Eliminated },
      round3: { total: round3Total, finished: round3Finished },
      notStarted,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/scores — all student scores and times
router.get('/scores', adminProtect, async (req, res) => {
  try {
    const state = await getState();
    const contestStartTime = state.contestStartTime; // epoch ms or null

    const students = await Student.find().select(
      '_id name rollNo currentRound eliminated terminated r1 r2 r3 r1Score r2Score r3Score totalScore mcqCorrectCount mcqCompletedAt debugSolvedCount debugCompletedAt codingSolvedCount codingCompletedAt totalTimeMs finalRank overrideLog'
    );

    function fmtMs(ms) {
      if (ms === null || ms === undefined || isNaN(ms) || ms < 0) return null;
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    const result = students.map((s) => {
      const mcqTs    = s.mcqCompletedAt    ? new Date(s.mcqCompletedAt).getTime()    : null;
      const debugTs  = s.debugCompletedAt  ? new Date(s.debugCompletedAt).getTime()  : null;
      const codingTs = s.codingCompletedAt ? new Date(s.codingCompletedAt).getTime() : null;

      const r1TimeTaken = (mcqTs && contestStartTime) ? fmtMs(mcqTs - contestStartTime) : null;
      const r2TimeTaken = (debugTs && mcqTs)           ? fmtMs(debugTs - mcqTs)          : null;
      const r3TimeTaken = (codingTs && debugTs)         ? fmtMs(codingTs - debugTs)       : null;
      const totalTime   = (codingTs && contestStartTime) ? fmtMs(codingTs - contestStartTime) : null;

      return {
        _id:              s._id,
        name:             s.name,
        rollNo:           s.rollNo,
        currentRound:     s.currentRound,
        eliminated:       s.eliminated,
        terminated:       s.terminated,
        mcqCorrectCount:  s.mcqCorrectCount,
        mcqCompletedAt:   s.mcqCompletedAt,
        r1Score:          Number(s.r1Score ?? s.r1?.score ?? 0),
        debugSolvedCount: s.debugSolvedCount,
        debugCompletedAt: s.debugCompletedAt,
        r2Score:          Number(s.r2Score ?? s.r2?.score ?? 0),
        codingSolvedCount: s.codingSolvedCount,
        codingCompletedAt: s.codingCompletedAt,
        r3Score:          Number(s.r3Score ?? s.r3?.score ?? 0),
        totalScore:       Number(s.totalScore ?? 0),
        totalTimeMs:      s.totalTimeMs,
        finalRank:        s.finalRank,
        overrideLog:      s.overrideLog || [],
        r1TimeTaken,
        r2TimeTaken,
        r3TimeTaken,
        totalTime,
      };
    });

    result.sort((a, b) => {
      const aRank = a.finalRank != null ? a.finalRank : Infinity;
      const bRank = b.finalRank != null ? b.finalRank : Infinity;
      return aRank - bRank;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

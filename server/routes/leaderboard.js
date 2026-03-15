const router = require('express').Router();
const { adminProtect } = require('../middleware/auth');
const Student = require('../models/Student');

function formatMs(ms) {
  const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// GET /api/leaderboard — admin-only leaderboard
router.get('/', adminProtect, async (req, res) => {
  try {
    const students = await Student.find({ codingCompletedAt: { $ne: null }, totalTimeMs: { $ne: null } })
      .sort({ totalTimeMs: 1, codingCompletedAt: 1, createdAt: 1 });

    const updates = [];
    const leaderboard = students.map((student, index) => {
      const rank = index + 1;
      if (student.finalRank !== rank) {
        student.finalRank = rank;
        updates.push(student.save());
      }
      return {
        rank,
        name: student.name,
        rollNo: student.rollNo,
        totalTimeMs: student.totalTimeMs,
        totalTimeFormatted: formatMs(student.totalTimeMs),
      };
    });

    if (updates.length) await Promise.all(updates);
    res.json(leaderboard);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leaderboard/export — CSV export (admin)
router.get('/export', adminProtect, async (req, res) => {
  try {
    const lb = await Student.find({ codingCompletedAt: { $ne: null }, totalTimeMs: { $ne: null } })
      .sort({ finalRank: 1, totalTimeMs: 1 })
      .select('finalRank name rollNo totalTimeMs');

    // Sanitize a CSV cell: escape quotes and neutralise formula injection
    const cell = (v) => {
      const s = String(v ?? '').replace(/"/g, '""');
      return /^[=+\-@\t\r]/.test(s) ? `"\t${s}"` : `"${s}"`;
    };

    let csv = 'Rank,Name,Roll No,Total Time (MM:SS),Total Time (ms)\n';
    lb.forEach(s => {
      csv += `${s.finalRank || ''},${cell(s.name)},${cell(s.rollNo)},${formatMs(s.totalTimeMs)},${Number(s.totalTimeMs || 0)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leaderboard.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

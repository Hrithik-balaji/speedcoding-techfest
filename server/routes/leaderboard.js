const router = require('express').Router();
const { adminProtect } = require('../middleware/auth');
const Student = require('../models/Student');

function formatMs(ms) {
  const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function scoreOf(student, key) {
  const top = Number(student?.[key]);
  if (Number.isFinite(top)) return top;
  const nested = Number(student?.[key.replace('Score', '')]?.score || 0);
  return Number.isFinite(nested) ? nested : 0;
}

function statusOf(student) {
  if (student.terminated) return 'Terminated';
  if (student.eliminated) return 'Eliminated';
  if (student.codingCompletedAt) return 'Finished';
  if (Number(student.currentRound || 1) >= 3 || Number(student.codingSolvedCount || 0) > 0) return 'Round 3';
  if (Number(student.currentRound || 1) >= 2 || Number(student.debugSolvedCount || 0) > 0) return 'Round 2';
  return 'Round 1';
}

async function calculateRankings() {
  const rankingFilter = {
    terminated: { $ne: true },
    eliminated: { $ne: true },
    $or: [
      { r1Score: { $gt: 0 } },
      { r2Score: { $gt: 0 } },
      { r3Score: { $gt: 0 } },
      { 'r1.score': { $gt: 0 } },
      { 'r2.score': { $gt: 0 } },
      { 'r3.score': { $gt: 0 } },
      { codingCompletedAt: { $ne: null } },
    ],
  };

  const students = await Student.find(rankingFilter)
    .select('name rollNo r1Score r2Score r3Score totalScore totalTimeMs finalRank currentRound codingCompletedAt terminated eliminated debugSolvedCount codingSolvedCount r1.score r2.score r3.score');

  const ranked = students.map((student) => {
    const r1Score = scoreOf(student, 'r1Score');
    const r2Score = scoreOf(student, 'r2Score');
    const r3Score = scoreOf(student, 'r3Score');
    const totalScore = r1Score + r2Score + r3Score;
    return {
      student,
      r1Score,
      r2Score,
      r3Score,
      totalScore,
      totalTimeMs: student.totalTimeMs,
    };
  });

  ranked.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    const aTime = Number.isFinite(Number(a.totalTimeMs)) ? Number(a.totalTimeMs) : Number.MAX_SAFE_INTEGER;
    const bTime = Number.isFinite(Number(b.totalTimeMs)) ? Number(b.totalTimeMs) : Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) return aTime - bTime;
    return String(a.student.rollNo || '').localeCompare(String(b.student.rollNo || ''));
  });

  const bulkOps = ranked.map((row, index) => ({
    updateOne: {
      filter: { _id: row.student._id },
      update: {
        $set: {
          r1Score: row.r1Score,
          r2Score: row.r2Score,
          r3Score: row.r3Score,
          totalScore: row.totalScore,
          finalRank: index + 1,
        },
      },
    },
  }));

  if (bulkOps.length) {
    await Student.bulkWrite(bulkOps);
    ranked.forEach((row, index) => {
      row.student.r1Score = row.r1Score;
      row.student.r2Score = row.r2Score;
      row.student.r3Score = row.r3Score;
      row.student.totalScore = row.totalScore;
      row.student.finalRank = index + 1;
    });
  }

  return ranked;
}

// GET /api/leaderboard — public live leaderboard
router.get('/', async (req, res) => {
  try {
    const ranked = await calculateRankings();

    const leaderboard = ranked
      .filter((row) => {
        const s = row.student;
        const participated = Number(s.currentRound || 1) > 1 || row.r1Score > 0 || row.r2Score > 0 || row.r3Score > 0;
        return participated && !s.terminated && !s.eliminated;
      })
      .map((row) => ({
        rank: row.student.finalRank,
        name: row.student.name,
        rollNo: row.student.rollNo,
        r1Score: row.r1Score,
        r2Score: row.r2Score,
        r3Score: row.r3Score,
        totalScore: row.totalScore,
        totalTime: row.student.totalTimeMs != null ? formatMs(row.student.totalTimeMs) : '--',
        status: statusOf(row.student),
      }))
      .sort((a, b) => Number(a.rank || Number.MAX_SAFE_INTEGER) - Number(b.rank || Number.MAX_SAFE_INTEGER));

    res.json(leaderboard);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leaderboard/export — CSV export (admin)
router.get('/export', adminProtect, async (req, res) => {
  try {
    const ranked = await calculateRankings();

    // Sanitize a CSV cell: escape quotes and neutralise formula injection
    const cell = (v) => {
      const s = String(v ?? '').replace(/"/g, '""');
      return /^[=+\-@\t\r]/.test(s) ? `"\t${s}"` : `"${s}"`;
    };

    let csv = 'Rank,Name,Roll No,R1,R2,R3,Total Score,Total Time (MM:SS),Total Time (ms)\n';
    ranked.forEach((row) => {
      const s = row.student;
      csv += `${s.finalRank || ''},${cell(s.name)},${cell(s.rollNo)},${row.r1Score},${row.r2Score},${row.r3Score},${row.totalScore},${s.totalTimeMs == null ? '--' : formatMs(s.totalTimeMs)},${Number(s.totalTimeMs || 0)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leaderboard.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.calculateRankings = calculateRankings;

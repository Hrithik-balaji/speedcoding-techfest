const router = require('express').Router();
const { protect, adminProtect } = require('../middleware/auth');
const Student = require('../models/Student');
const { CodingProblem, DebugProblem } = require('../models/Problem');

function buildLeaderboard(students, codingProblems, debugProblems) {
  return students
    .map(st => {
      const r3Solved = st.r3?.solved?.length || 0;
      const r3Penalty = st.r3?.penalty || 0;
      const r2Solved = st.r2?.solved?.length || 0;
      const r1Score = st.r1?.score || 0;
      const r2Score = st.r2?.score ?? r2Solved;
      const r3Score = st.r3?.score ?? r3Solved;

      const codingStatus = {};
      codingProblems.forEach(p => {
        const solved = st.r3?.solved?.find(s => s.problemId?.toString() === p._id?.toString());
        const attempts = st.r3?.attempts?.get?.(p._id.toString()) || 0;
        codingStatus[p._id] = solved ? 'solved' : attempts > 0 ? 'attempted' : 'unsolved';
      });

      return {
        _id:         st._id,
        name:        st.name,
        rollNo:      st.rollNo,
        status:      st.status,
        r1Score,
        r2Score,
        r2Solved,
        r2Total:     debugProblems.length,
        r3Score,
        r3Solved,
        r3Total:     codingProblems.length,
        r3Penalty,
        codingStatus,
        lastSeen:    st.lastSeen,
      };
    })
    .sort((a, b) => {
      if (b.r3Score !== a.r3Score) return b.r3Score - a.r3Score;
      if (a.r3Penalty !== b.r3Penalty) return a.r3Penalty - b.r3Penalty;
      if (b.r2Score !== a.r2Score) return b.r2Score - a.r2Score;
      return b.r1Score - a.r1Score;
    })
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// GET /api/leaderboard — admin-only leaderboard
router.get('/', adminProtect, async (req, res) => {
  try {
    const [students, codingProblems, debugProblems] = await Promise.all([
      Student.find().sort({ createdAt: 1 }),
      CodingProblem.find().sort({ order: 1 }),
      DebugProblem.find().sort({ order: 1 }),
    ]);
    res.json({
      leaderboard:    buildLeaderboard(students, codingProblems, debugProblems),
      codingProblems: codingProblems.map(p => ({ _id: p._id, title: p.title, difficulty: p.difficulty })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/leaderboard/export — CSV export (admin)
router.get('/export', adminProtect, async (req, res) => {
  try {
    const [students, codingProblems, debugProblems] = await Promise.all([
      Student.find(),
      CodingProblem.find(),
      DebugProblem.find(),
    ]);
    const lb = buildLeaderboard(students, codingProblems, debugProblems);

    // Sanitize a CSV cell: escape quotes and neutralise formula injection
    const cell = (v) => {
      const s = String(v ?? '').replace(/"/g, '""');
      return /^[=+\-@\t\r]/.test(s) ? `"\t${s}"` : `"${s}"`;
    };

    let csv = 'Rank,Name,Roll No,R1 Score,R2 Score,R3 Score,R3 Penalty (min),Status\n';
    lb.forEach(s => {
      csv += `${s.rank},${cell(s.name)},${cell(s.rollNo)},${s.r1Score},${s.r2Score},${s.r3Score},${s.r3Penalty},${cell(s.status)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leaderboard.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

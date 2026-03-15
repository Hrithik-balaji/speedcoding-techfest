const router = require('express').Router();
const { protect, adminProtect } = require('../middleware/auth');
const ExamState = require('../models/ExamState');
const Student = require('../models/Student');
const { resetStudentsForRound } = require('./students');

async function getState() {
  let state = await ExamState.findById('global');
  if (!state) state = await ExamState.create({ _id: 'global' });
  return state;
}

function getCurrentRoundDurationMs(state) {
  const round = Number(state.currentRound || 0);
  if (![1, 2, 3].includes(round)) return 0;
  const minutes = Number(state?.timers?.[`r${round}`] || 0);
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return minutes * 60 * 1000;
}

function toEpochMs(value) {
  if (!value) return null;
  const dt = new Date(value);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : null;
}

// GET /api/timer — get current timer state (students poll this)
router.get('/', protect, async (req, res) => {
  const state = await getState();

  // Auto-eliminate round 2 students when timer is over and threshold is unmet.
  try {
    const student = await Student.findById(req.student._id).select('currentRound debugSolvedCount eliminated eliminatedReason');
    const r2End = Number(state?.roundEndTimes?.r2 || 0);
    const r2Over = (state?.forceEnded?.r2 === true) || (r2End > 0 && Date.now() >= r2End);
    if (
      student &&
      Number(student.currentRound || 0) === 2 &&
      !student.eliminated &&
      r2Over &&
      Number(student.debugSolvedCount || 0) < 2
    ) {
      student.eliminated = true;
      student.eliminatedReason = 'Did not pass Round 2';
      await student.save();
    }
  } catch (err) {
    console.error('Timer elimination check failed:', err.message);
  }

  res.json({
    timers:        state.timers,
    penalties:     state.penalties,
    paused:        state.paused,
    roundEndTimes: state.roundEndTimes,
    forceEnded:    state.forceEnded,
  });
});

// PATCH /api/timer/set — admin sets round duration
router.patch('/set', adminProtect, async (req, res) => {
  try {
    const { round, minutes } = req.body;
    const r = Number(round);
    const m = Number(minutes);
    if (![1, 2, 3].includes(r)) return res.status(400).json({ error: 'round must be 1, 2, or 3' });
    if (!Number.isFinite(m) || m <= 0 || m > 999) return res.status(400).json({ error: 'minutes must be between 1 and 999' });
    const state = await getState();
    state.timers[`r${r}`] = m;
    state.roundEndTimes[`r${r}`] = Date.now() + m * 60 * 1000;
    await state.save();
    res.json(state.timers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/timer/start-round — admin starts a round (sets absolute end time)
router.post('/start-round', adminProtect, async (req, res) => {
  try {
    const requestedRound = Number(req.body?.round);
    const state = await getState();

    const r = [1, 2, 3].includes(requestedRound)
      ? requestedRound
      : (state.currentRound > 0 ? state.currentRound : 1);

    const dur = state.timers[`r${r}`] || [20, 30, 60][r - 1];
    const now = new Date();

    state.currentRound = r;
    state.roundActive = true;
    state.contestStarted = true;
    if (!state.contestStartTime && r === 1) {
      state.contestStartTime = now.getTime();
    }
    state.roundStartedAt = now;
    state.roundEndedAt = null;

    state.roundEndTimes[`r${r}`] = now.getTime() + dur * 60 * 1000;
    state.forceEnded[`r${r}`] = false;

    await state.save();

    const remainingMs = Math.max(0, getCurrentRoundDurationMs(state));
    res.json({
      currentRound: state.currentRound,
      roundActive: state.roundActive,
      contestStarted: state.contestStarted,
      roundStartedAt: state.roundStartedAt,
      roundEndedAt: state.roundEndedAt,
      remainingMs,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/timer/stop-round — admin stops current round
router.post('/stop-round', adminProtect, async (req, res) => {
  try {
    const state = await getState();
    const now = new Date();
    const r = Number(state.currentRound || 0);

    state.roundActive = false;
    state.roundEndedAt = now;

    if ([1, 2, 3].includes(r)) {
      state.roundEndTimes[`r${r}`] = now.getTime();
      state.forceEnded[`r${r}`] = true;
      state.roundHistory = state.roundHistory || [];
      state.roundHistory.push({
        round: r,
        startedAt: state.roundStartedAt || null,
        endedAt: now,
        restartedAt: null,
      });
    }

    await state.save();
    res.json({
      currentRound: state.currentRound,
      roundActive: state.roundActive,
      contestStarted: state.contestStarted,
      roundEndedAt: state.roundEndedAt,
      remainingMs: 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/timer/restart-round — admin restarts a completed/stopped round
router.post('/restart-round', adminProtect, async (req, res) => {
  try {
    const r = Number(req.body?.round);
    if (![1, 2, 3].includes(r)) {
      return res.status(400).json({ error: 'round must be 1, 2, or 3' });
    }

    const state = await getState();
    const now = new Date();
    const dur = Number(state.timers?.[`r${r}`] || [20, 30, 60][r - 1]);

    state.currentRound = r;
    state.roundActive = true;
    state.contestStarted = true;
    state.roundStartedAt = now;
    state.roundEndedAt = null;
    state.roundEndTimes[`r${r}`] = now.getTime() + dur * 60 * 1000;
    state.forceEnded[`r${r}`] = false;
    state.roundHistory = state.roundHistory || [];
    state.roundHistory.push({
      round: r,
      startedAt: null,
      endedAt: null,
      restartedAt: now,
    });

    await state.save();
    await resetStudentsForRound(r);

    res.json({
      success: true,
      currentRound: state.currentRound,
      roundActive: state.roundActive,
      roundStartedAt: state.roundStartedAt,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/timer/next-round — admin moves to next round
router.post('/next-round', adminProtect, async (req, res) => {
  try {
    const state = await getState();
    const next = Math.min(3, Number(state.currentRound || 0) + 1);

    state.currentRound = next;
    state.roundActive = false;
    state.contestStarted = true;
    state.roundStartedAt = null;
    state.roundEndedAt = null;

    await state.save();
    res.json({
      currentRound: state.currentRound,
      roundActive: state.roundActive,
      contestStarted: state.contestStarted,
      remainingMs: 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/timer/status — admin/student round control status
router.get('/status', adminProtect, async (req, res) => {
  try {
    const state = await getState();
    let remainingMs = 0;

    if (state.roundActive && state.roundStartedAt) {
      const elapsed = Date.now() - toEpochMs(state.roundStartedAt);
      remainingMs = Math.max(0, getCurrentRoundDurationMs(state) - elapsed);
    }

    const roundHistory = (state.roundHistory || []).map((h) => ({
      round: h.round,
      startedAt: h.startedAt,
      endedAt: h.endedAt,
      restartedAt: h.restartedAt,
    }));

    const hasRoundStarted = {
      r1: Boolean(state.roundEndTimes?.r1) || roundHistory.some((h) => Number(h.round) === 1),
      r2: Boolean(state.roundEndTimes?.r2) || roundHistory.some((h) => Number(h.round) === 2),
      r3: Boolean(state.roundEndTimes?.r3) || roundHistory.some((h) => Number(h.round) === 3),
    };

    res.json({
      currentRound: Number(state.currentRound || 0),
      roundActive: Boolean(state.roundActive),
      contestStarted: Boolean(state.contestStarted),
      remainingMs,
      roundHistory,
      hasRoundStarted,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/timer/pause — admin pause/resume
router.patch('/pause', adminProtect, async (req, res) => {
  try {
    const state = await getState();
    if (!state.paused) {
      state.paused   = true;
      state.pausedAt = new Date();
    } else {
      // Extend end times by paused duration
      const delta = Date.now() - new Date(state.pausedAt).getTime();
      ['r1', 'r2', 'r3'].forEach(r => {
        if (state.roundEndTimes[r]) state.roundEndTimes[r] += delta;
      });
      state.paused   = false;
      state.pausedAt = null;
    }
    await state.save();
    res.json({ paused: state.paused });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/timer/force-end — force end a round
router.post('/force-end', adminProtect, async (req, res) => {
  try {
    const { round } = req.body;
    const r = Number(round);
    if (![1, 2, 3].includes(r)) return res.status(400).json({ error: 'round must be 1, 2, or 3' });
    const state = await getState();
    state.roundEndTimes[`r${r}`] = Date.now();
    state.forceEnded[`r${r}`]   = true;
    await state.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/timer/penalties — update penalties
router.patch('/penalties', adminProtect, async (req, res) => {
  try {
    const { r2, r3 } = req.body;
    const state = await getState();
    if (r2 !== undefined) {
      const v = Number(r2);
      if (!Number.isFinite(v) || v < 0 || v > 999) return res.status(400).json({ error: 'r2 penalty must be 0–999 minutes' });
      state.penalties.r2 = v;
    }
    if (r3 !== undefined) {
      const v = Number(r3);
      if (!Number.isFinite(v) || v < 0 || v > 999) return res.status(400).json({ error: 'r3 penalty must be 0–999 minutes' });
      state.penalties.r3 = v;
    }
    await state.save();
    res.json(state.penalties);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/timer/reset — reset contest timing to waiting state
router.post('/reset', adminProtect, async (req, res) => {
  try {
    const state = await getState();
    state.paused = false;
    state.pausedAt = null;
    state.contestStarted = false;
    state.contestStartTime = null;
    state.currentRound = 0;
    state.roundActive = false;
    state.roundStartedAt = null;
    state.roundEndedAt = null;
    state.roundHistory = [];
    state.roundEndTimes = { r1: null, r2: null, r3: null };
    state.forceEnded = { r1: false, r2: false, r3: false };
    state.timers = { r1: 20, r2: 30, r3: 60 };
    await state.save();
    await resetStudentsForRound(1);
    res.json({
      paused: state.paused,
      roundEndTimes: state.roundEndTimes,
      forceEnded: state.forceEnded,
      timers: state.timers,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

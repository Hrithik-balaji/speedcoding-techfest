const router = require('express').Router();
const { protect, adminProtect } = require('../middleware/auth');
const ExamState = require('../models/ExamState');

async function getState() {
  let state = await ExamState.findById('global');
  if (!state) state = await ExamState.create({ _id: 'global' });
  return state;
}

// GET /api/timer — get current timer state (students poll this)
router.get('/', protect, async (req, res) => {
  const state = await getState();
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
    const { round } = req.body;
    const r = Number(round);
    if (![1, 2, 3].includes(r)) return res.status(400).json({ error: 'round must be 1, 2, or 3' });
    const state = await getState();
    const dur = state.timers[`r${r}`] || [20, 30, 60][r - 1];
    state.roundEndTimes[`r${r}`] = Date.now() + dur * 60 * 1000;
    state.forceEnded[`r${r}`] = false;
    await state.save();
    res.json({ endTime: state.roundEndTimes[`r${r}`] });
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
    state.roundEndTimes = { r1: null, r2: null, r3: null };
    state.forceEnded = { r1: false, r2: false, r3: false };
    state.timers = { r1: 20, r2: 30, r3: 60 };
    await state.save();
    res.json({
      paused: state.paused,
      roundEndTimes: state.roundEndTimes,
      forceEnded: state.forceEnded,
      timers: state.timers,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

const router = require('express').Router();
const { adminProtect } = require('../middleware/auth');
const ExamState = require('../models/ExamState');
const { resetStudentsForRound } = require('./students');

const autoEndTimers = new Map();

async function getState() {
  let state = await ExamState.findById('global');
  if (!state) state = await ExamState.create({ _id: 'global' });
  return state;
}

function durationField(round) {
  return `round${round}Duration`;
}

function endsAtField(round) {
  return `round${round}EndsAt`;
}

function roundKey(round) {
  return `r${round}`;
}

function clearAutoEndTimer(round) {
  const existing = autoEndTimers.get(round);
  if (existing) {
    clearTimeout(existing);
    autoEndTimers.delete(round);
  }
}

function setRoundEndTime(state, round, endsAt) {
  state[endsAtField(round)] = endsAt;
  state.roundEndTimes = {
    ...(state.roundEndTimes || {}),
    [roundKey(round)]: endsAt ? endsAt.getTime() : null,
  };
  state.markModified('roundEndTimes');
}

function setForceEnded(state, round, value) {
  state.forceEnded = {
    ...(state.forceEnded || {}),
    [roundKey(round)]: value,
  };
  state.markModified('forceEnded');
}

function hasRoundStarted(state, round) {
  const key = roundKey(round);
  return Boolean(
    state?.roundHistory?.some((entry) => entry.round === round && (entry.startedAt || entry.restartedAt)) ||
    state?.roundEndTimes?.[key] ||
    state?.[endsAtField(round)]
  );
}

function currentRoundEndsAt(state) {
  const round = Number(state?.currentRound || 0);
  if (![1, 2, 3].includes(round)) return null;
  return state?.[endsAtField(round)] || null;
}

function computeRemainingMs(state) {
  const endsAt = currentRoundEndsAt(state);
  if (!endsAt) return null;
  const now = state?.paused && state?.pausedAt
    ? new Date(state.pausedAt).getTime()
    : Date.now();
  return Math.max(0, new Date(endsAt).getTime() - now);
}

function buildTimerStatus(state) {
  return {
    contestStarted: Boolean(state?.contestStarted),
    currentRound: Number(state?.currentRound || 0),
    roundActive: Boolean(state?.roundActive),
    paused: Boolean(state?.paused),
    round1Duration: Number(state?.round1Duration || 15),
    round2Duration: Number(state?.round2Duration || 20),
    round3Duration: Number(state?.round3Duration || 25),
    currentRoundEndsAt: currentRoundEndsAt(state),
    remainingMs: computeRemainingMs(state),
    roundHistory: state?.roundHistory || [],
    hasRoundStarted: {
      r1: hasRoundStarted(state, 1),
      r2: hasRoundStarted(state, 2),
      r3: hasRoundStarted(state, 3),
    },
    roundEndTimes: state?.roundEndTimes || {},
    forceEnded: state?.forceEnded || {},
  };
}

async function scheduleAutoEnd(round, msRemaining) {
  clearAutoEndTimer(round);
  autoEndTimers.set(round, setTimeout(async () => {
    try {
      const state = await getState();
      if (state.roundActive && Number(state.currentRound) === round) {
        state.roundActive = false;
        state.paused = false;
        state.pausedAt = null;
        state.roundEndedAt = new Date();
        await state.save();
        console.log(`Round ${round} auto-ended by timer`);
      }
    } catch (err) {
      console.error(`Failed to auto-end round ${round}:`, err.message);
    } finally {
      clearAutoEndTimer(round);
    }
  }, msRemaining));
}

router.get('/', async (_req, res) => {
  try {
    const state = await getState();
    res.json({
      ...state.toObject(),
      ...buildTimerStatus(state),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', async (_req, res) => {
  try {
    const state = await getState();
    res.json(buildTimerStatus(state));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/set-duration', adminProtect, async (req, res) => {
  try {
    const round = Number(req.body?.round);
    const minutes = Number(req.body?.minutes);
    if (![1, 2, 3].includes(round)) {
      return res.status(400).json({ error: 'Round must be 1, 2, or 3' });
    }
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) {
      return res.status(400).json({ error: 'Minutes must be between 1 and 180' });
    }

    const state = await getState();
    if (state.roundActive && Number(state.currentRound) === round) {
      return res.status(400).json({ error: 'Cannot change duration of active round' });
    }

    state[durationField(round)] = minutes;
    await state.save();
    res.json(buildTimerStatus(state));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/start-round', adminProtect, async (_req, res) => {
  try {
    const state = await getState();
    let round = Number(state.currentRound || 0);

    if (state.roundActive) {
      return res.status(400).json({ error: 'Round is already active' });
    }

    if (round < 1) {
      round = 1;
      state.currentRound = 1;
    }
    if (round > 3) {
      return res.status(400).json({ error: 'All rounds are already complete' });
    }

    const duration = Number(state[durationField(round)] || 0);
    const startedAt = new Date();
    const endsAt = new Date(Date.now() + duration * 60 * 1000);

    state.contestStarted = true;
    if (!state.contestStartTime) state.contestStartTime = Date.now();
    state.roundActive = true;
    state.paused = false;
    state.pausedAt = null;
    state.roundStartedAt = startedAt;
    state.roundEndedAt = null;
    setRoundEndTime(state, round, endsAt);
    setForceEnded(state, round, false);
    state.roundHistory.push({ round, startedAt, endedAt: null, restartedAt: null });
    await state.save();

    await scheduleAutoEnd(round, duration * 60 * 1000);

    res.json({ currentRound: round, roundActive: true, endsAt, duration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stop-round', adminProtect, async (_req, res) => {
  try {
    const state = await getState();
    const round = Number(state.currentRound || 0);
    if (![1, 2, 3].includes(round) || !state.roundActive) {
      return res.status(400).json({ error: 'No active round to stop' });
    }

    clearAutoEndTimer(round);
    const endedAt = new Date();
    state.roundActive = false;
    state.paused = false;
    state.pausedAt = null;
    state.roundEndedAt = endedAt;
    setRoundEndTime(state, round, endedAt);
    await state.save();

    res.json(buildTimerStatus(state));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/next-round', adminProtect, async (_req, res) => {
  try {
    const state = await getState();
    const currentRound = Number(state.currentRound || 0);
    if (currentRound >= 3) {
      return res.status(400).json({ error: 'Already on the final round' });
    }

    if ([1, 2, 3].includes(currentRound)) clearAutoEndTimer(currentRound);

    state.roundActive = false;
    state.paused = false;
    state.pausedAt = null;
    state.roundEndedAt = currentRound > 0 ? new Date() : null;
    state.currentRound = Math.max(1, currentRound + 1);
    state.roundStartedAt = null;
    await state.save();

    res.json(buildTimerStatus(state));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restart-round', adminProtect, async (req, res) => {
  try {
    const round = Number(req.body?.round);
    if (![1, 2, 3].includes(round)) {
      return res.status(400).json({ error: 'Round must be 1, 2, or 3' });
    }

    const state = await getState();
    clearAutoEndTimer(Number(state.currentRound || 0));
    clearAutoEndTimer(round);

    await resetStudentsForRound(round);

    state.contestStarted = true;
    if (!state.contestStartTime) state.contestStartTime = Date.now();
    state.currentRound = round;
    state.roundActive = false;
    state.paused = false;
    state.pausedAt = null;
    state.roundStartedAt = null;
    state.roundEndedAt = null;
    setRoundEndTime(state, round, null);
    setForceEnded(state, round, false);
    state.roundHistory.push({ round, startedAt: null, endedAt: null, restartedAt: new Date() });
    await state.save();

    res.json(buildTimerStatus(state));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/pause', adminProtect, async (_req, res) => {
  try {
    const state = await getState();
    const round = Number(state.currentRound || 0);
    if (![1, 2, 3].includes(round) || !state.roundActive) {
      return res.status(400).json({ error: 'No active round to pause' });
    }

    if (!state.paused) {
      state.paused = true;
      state.pausedAt = new Date();
      clearAutoEndTimer(round);
      await state.save();
      return res.json(buildTimerStatus(state));
    }

    const pausedDuration = state.pausedAt
      ? Date.now() - new Date(state.pausedAt).getTime()
      : 0;
    const existingEndsAt = state[endsAtField(round)]
      ? new Date(state[endsAtField(round)]).getTime()
      : Date.now();
    const shiftedEndsAt = new Date(existingEndsAt + pausedDuration);

    state.paused = false;
    state.pausedAt = null;
    setRoundEndTime(state, round, shiftedEndsAt);
    await state.save();

    await scheduleAutoEnd(round, Math.max(0, shiftedEndsAt.getTime() - Date.now()));
    return res.json(buildTimerStatus(state));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/force-end', adminProtect, async (req, res) => {
  try {
    const round = Number(req.body?.round);
    if (![1, 2, 3].includes(round)) {
      return res.status(400).json({ error: 'Round must be 1, 2, or 3' });
    }

    const state = await getState();
    clearAutoEndTimer(round);
    const endedAt = new Date();
    setRoundEndTime(state, round, endedAt);
    setForceEnded(state, round, true);

    if (Number(state.currentRound || 0) === round) {
      state.roundActive = false;
      state.paused = false;
      state.pausedAt = null;
      state.roundEndedAt = endedAt;
    }

    await state.save();
    res.json(buildTimerStatus(state));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset', adminProtect, async (_req, res) => {
  try {
    clearAutoEndTimer(1);
    clearAutoEndTimer(2);
    clearAutoEndTimer(3);

    const state = await getState();
    state.contestStarted = false;
    state.contestStartTime = null;
    state.currentRound = 0;
    state.roundActive = false;
    state.paused = false;
    state.pausedAt = null;
    state.roundStartedAt = null;
    state.roundEndedAt = null;
    state.roundHistory = [];
    setRoundEndTime(state, 1, null);
    setRoundEndTime(state, 2, null);
    setRoundEndTime(state, 3, null);
    setForceEnded(state, 1, false);
    setForceEnded(state, 2, false);
    setForceEnded(state, 3, false);
    await state.save();

    await resetStudentsForRound(1);

    res.json(buildTimerStatus(state));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
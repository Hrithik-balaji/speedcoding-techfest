const mongoose = require('mongoose');

const ExamStateSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },

  // Timer settings (minutes)
  timers: {
    r1: { type: Number, default: 20 },
    r2: { type: Number, default: 30 },
    r3: { type: Number, default: 60 },
  },

  // Penalty settings (minutes per wrong attempt)
  penalties: {
    r2: { type: Number, default: 10 },
    r3: { type: Number, default: 10 },
  },

  // Global pause
  paused:   { type: Boolean, default: false },
  pausedAt: { type: Date },

  // Contest lifecycle state
  contestStarted: { type: Boolean, default: false },
  contestStartTime: { type: Number, default: null },
  currentRound:   { type: Number, default: 0 }, // 0 = not started
  roundActive:    { type: Boolean, default: false },
  roundStartedAt: { type: Date, default: null },
  roundEndedAt:   { type: Date, default: null },
  roundHistory: [{
    round: { type: Number },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    restartedAt: { type: Date, default: null },
  }],

  // Round end times (epoch ms — set when a round starts)
  roundEndTimes: {
    r1: { type: Number },
    r2: { type: Number },
    r3: { type: Number },
  },

  // Force ended rounds
  forceEnded: {
    r1: { type: Boolean, default: false },
    r2: { type: Boolean, default: false },
    r3: { type: Boolean, default: false },
  },

  // Admin override log
  overrideLog: [{
    studentName: String,
    rollNo:      String,
    field:       String,
    from:        mongoose.Schema.Types.Mixed,
    to:          mongoose.Schema.Types.Mixed,
    reason:      String,
    timestamp:   { type: Date, default: Date.now },
  }],

  // Reinstatement log
  reinstateLog: [{
    studentName: String,
    rollNo:      String,
    reason:      String,
    timestamp:   { type: Date, default: Date.now },
  }],

  // Admin login session tracking
  activeAdminSessionId: { type: String, default: null },
  adminSessions: [{
    sessionId:  { type: String, required: true },
    createdAt:  { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt:  { type: Date },
    userAgent:  { type: String, default: '' },
    ipAddress:  { type: String, default: '' },
  }],

}, { timestamps: true });

module.exports = mongoose.model('ExamState', ExamStateSchema);

const mongoose = require('mongoose');

const ViolationSchema = new mongoose.Schema({
  type:      { type: String, required: true },
  round:     { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

const SessionSchema = new mongoose.Schema({
  sessionId:  { type: String, required: true },
  createdAt:  { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  revokedAt:  { type: Date },
  userAgent:  { type: String, default: '' },
  ipAddress:  { type: String, default: '' },
}, { _id: false });

const SolvedProblemSchema = new mongoose.Schema({
  problemId:  { type: String, required: true },
  solvedAt:   { type: Date, default: Date.now },
  attempts:   { type: Number, default: 1 },
  language:   { type: String },
  timeTaken:  { type: Number }, // seconds from round start
});

const StudentSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  rollNo:   { type: String, required: true, unique: true, trim: true, uppercase: true },
  college:  { type: String, default: '', trim: true },
  phoneNumber: { type: String, default: '', trim: true },
  department: { type: String, default: '', trim: true },
  academicSession: { type: String, default: '', trim: true },
  passwordHash: { type: String, default: '' },
  status:   { type: String, enum: ['Active', 'Warned', 'Kicked'], default: 'Active' },
  activeSessionId: { type: String, default: null },
  sessions: [SessionSchema],

  // Round 1 — MCQ
  r1: {
    score:       { type: Number, default: 0 },
    submitted:   { type: Boolean, default: false },
    submitTime:  { type: Date },
    answers:     { type: Map, of: Number, default: {} }, // questionId -> selectedOptionIndex
  },

  // Round 2 — Debugging
  r2: {
    solved:   [SolvedProblemSchema],
    score:    { type: Number, default: 0 },
    penalty:  { type: Number, default: 0 }, // minutes
    attempts: { type: Map, of: Number, default: {} }, // problemId -> count
  },

  // Round 3 — Coding
  r3: {
    solved:    [SolvedProblemSchema],
    score:     { type: Number, default: 0 },
    penalty:   { type: Number, default: 0 }, // minutes
    attempts:  { type: Map, of: Number, default: {} },
    totalTime: { type: Number, default: 0 }, // minutes
  },

  violations:   [ViolationSchema],
  overrides:    { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

  // Timestamps
  joinedAt:     { type: Date, default: Date.now },
  lastSeen:     { type: Date, default: Date.now },

  // Round session start times (absolute epoch ms)
  r1StartTime:  { type: Number },
  r2StartTime:  { type: Number },
  r3StartTime:  { type: Number },
}, { timestamps: true });

// Virtual: R3 problems solved count
StudentSchema.virtual('r3SolvedCount').get(function () {
  return this.r3.solved.length;
});

// Virtual: R2 problems solved count
StudentSchema.virtual('r2SolvedCount').get(function () {
  return this.r2.solved.length;
});

module.exports = mongoose.model('Student', StudentSchema);

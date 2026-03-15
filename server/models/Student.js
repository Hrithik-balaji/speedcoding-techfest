const mongoose = require('mongoose');

const ViolationSchema = new mongoose.Schema({
  type:        { type: String, required: true },
  timestamp:   { type: Date, default: Date.now },
  description: { type: String, default: '' },
  round:       { type: Number, default: 0 },
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
  violationCount: { type: Number, default: 0 },
  terminated: { type: Boolean, default: false },
  terminatedReason: { type: String, default: '' },
  overrides:    { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

  // Round progression
  currentRound:      { type: Number, default: 1 },
  eliminated:        { type: Boolean, default: false },
  eliminatedReason:  { type: String, default: '' },

  // Round 1 tracking
  mcqAnswers: [{
    questionId:      { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedAnswer:  { type: Number, required: true },
    correct:         { type: Boolean, default: false },
  }],
  mcqCorrectCount:   { type: Number, default: 0 },
  mcqCompletedAt:    { type: Date, default: null },

  // Round 2 tracking
  debugSolvedCount:  { type: Number, default: 0 },
  debugSolvedIds:    [{ type: mongoose.Schema.Types.ObjectId }],
  debugCompletedAt:  { type: Date, default: null },

  // Round 3 tracking
  codingSolvedCount: { type: Number, default: 0 },
  codingCompletedAt: { type: Date, default: null },

  // Final ranking
  totalTimeMs:       { type: Number, default: null },
  finalRank:         { type: Number, default: null },

  // Timestamps
  joinedAt:     { type: Date, default: Date.now },
  lastSeen:     { type: Date, default: Date.now },

  // Round session start times (absolute epoch ms)
  r1StartTime:  { type: Number },
  r2StartTime:  { type: Number },
  r3StartTime:  { type: Number },

  // Admin override history
  overrideLog: [{
    changedAt:  { type: Date, default: Date.now },
    r1Score:    { type: Number },
    r2Score:    { type: Number },
    r3Score:    { type: Number },
    changedBy:  { type: String, default: 'admin' },
  }],
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

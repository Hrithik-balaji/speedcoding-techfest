const mongoose = require('mongoose');

// ── MCQ ───────────────────────────────────────────────────────
const MCQSchema = new mongoose.Schema({
  text:       { type: String, required: true },
  options:    { type: [String], required: true, validate: v => v.length === 4 },
  correct:    { type: Number, required: true, min: 0, max: 3 }, // index of correct option
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
  points:     { type: Number, default: 1 },
  order:      { type: Number, default: 0 },
}, { timestamps: true });

// ── Debug Problem ─────────────────────────────────────────────
const DebugProblemSchema = new mongoose.Schema({
  title:              { type: String, required: true },
  description:        { type: String, required: true },
  buggyCode:          { type: String, required: true },
  expectedOutput:     { type: String, default: '' },
  expectedOutputHash: { type: String, required: true }, // SHA-256 of expected output
  hint:               { type: String, default: '' },
  points:             { type: Number, default: 30 },
  allowedLanguages:   { type: [String], default: ['python'] },
  language:           { type: String, enum: ['python', 'cpp', 'java', 'javascript', 'c'], default: 'python' },
  difficulty:         { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
  sampleInput:        { type: String, default: '' },
  order:              { type: Number, default: 0 },
}, { timestamps: true });

// ── Coding Problem ────────────────────────────────────────────
const TestCaseSchema = new mongoose.Schema({
  input:      { type: String, required: true },
  outputPlain:{ type: String, default: '' },
  outputHash: { type: String, required: true }, // SHA-256 of expected output
  isSample:   { type: Boolean, default: false },
  // outputPlain is stored for admin editing; judging still uses outputHash.
});

const CodingProblemSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  difficulty:   { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  description:  { type: String, required: true },
  constraints:  { type: String, default: '' },
  sampleInput:  { type: String, default: '' },
  sampleOutput: { type: String, default: '' },
  points:       { type: Number, default: 50 },
  tags:             { type: [String], default: [] },
  allowedLanguages: { type: [String], default: ['python', 'cpp', 'c', 'java', 'javascript'] },
  testCases:        [TestCaseSchema],
  order:            { type: Number, default: 0 },
}, { timestamps: true });

module.exports = {
  MCQ:           mongoose.model('MCQ', MCQSchema),
  DebugProblem:  mongoose.model('DebugProblem', DebugProblemSchema),
  CodingProblem: mongoose.model('CodingProblem', CodingProblemSchema),
};

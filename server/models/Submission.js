const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  rollNo:     { type: String, required: true },
  problemId:  { type: String, required: true },
  round:      { type: Number, required: true, enum: [2, 3] },
  language:   { type: String, required: true },
  code:       { type: String, required: true },
  verdict:    {
    type: String,
    enum: ['Accepted', 'Wrong Answer', 'Runtime Error', 'Compile Error', 'Time Limit Exceeded'],
    required: true,
  },
  passedCount: { type: Number, default: 0 },
  totalCount:  { type: Number, default: 0 },
  runtime:     { type: Number }, // ms
  stderr:      { type: String, default: '' },
  stdout:      { type: String, default: '' },
  penaltyAdded: { type: Number, default: 0 }, // minutes
}, { timestamps: true });

SubmissionSchema.index({ studentId: 1, problemId: 1 });
SubmissionSchema.index({ rollNo: 1 });
SubmissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Submission', SubmissionSchema);

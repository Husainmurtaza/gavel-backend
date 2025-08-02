const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema({
  positionName: { type: String, required: true },
  candidateId: { type: String, required: true },
  email: { type: String, required: true },
  interviewID: { type: String, required: true },
  positionDescription: { type: String },
  positionId: { type: String, required: true },
  summary: { type: mongoose.Schema.Types.Mixed },
  transcript: { type: mongoose.Schema.Types.Mixed },
  status: { type: String },
  reviewStatus: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Interview', InterviewSchema); 
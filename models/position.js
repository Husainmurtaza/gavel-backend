const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  projectDescription: { type: String },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  redFlag: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Position', positionSchema, 'positions'); 
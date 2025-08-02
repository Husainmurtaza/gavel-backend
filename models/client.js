const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  redFlag: { type: String },
  deleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema, 'client'); 
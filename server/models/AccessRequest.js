const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Email must be valid'],
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'],
  },
  address: { type: String, required: true, trim: true },
  message: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('AccessRequest', accessRequestSchema);

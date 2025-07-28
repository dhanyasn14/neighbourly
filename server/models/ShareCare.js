//models/ShareCare.js
const mongoose = require('mongoose');

const shareCareSchema = new mongoose.Schema({
  username: { type: String, required: true },
  contact: { type: String, required: true },
  type: {
    type: String,
    enum: ['pickup', 'drop', 'tuitions', 'tools', 'share'],
    required: true,
    lowercase: true
  },
  road: String,               // Only applicable for pickup/drop
  date: Date,                 // Only applicable for pickup/drop
  time: String,               // Only applicable for pickup/drop
  details: String,            // Optional description for other types
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ShareCare', shareCareSchema);

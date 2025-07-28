//models/Meeting.js
const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  meetingId: {
    type: String,
    required: true
  },
  request: {
    type: String,
    enum: ['Pending', 'Done'],
    default: 'Pending',
  },
});

module.exports = mongoose.model('Meeting', meetingSchema);

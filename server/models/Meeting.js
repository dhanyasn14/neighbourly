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
  time: {
    type: String,
    trim: true,
  },
  meetingMode: {
    type: String,
    enum: ['In-person', 'Zoom'],
    default: 'In-person',
  },
  meetingLink: {
    type: String,
    trim: true,
  },
  meetingId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  parentMeetingId: {
    type: String,
    trim: true,
  },
  continuationSuffix: {
    type: String,
    trim: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  request: {
    type: String,
    enum: ['Pending', 'Done', 'Rejected'],
    default: 'Pending',
  },
  notes: [
    {
      username: { type: String, required: true, trim: true },
      note: { type: String, required: true, trim: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Meeting', meetingSchema);

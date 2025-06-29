const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  meet_id: String,
  date: String,
  link: String,
  place: String,
  username: String,
  reason: String,
  req: String
});

// 👇 Explicitly name collection as "meeting"
module.exports = mongoose.model('Meeting', meetingSchema, 'meeting');

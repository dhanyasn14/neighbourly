// ✅ models/event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  date: Date,
  purpose: String,
  location: String,
  time: String,
  eventId: { type: String, unique: true },
  participants: [String],
  organizer: [String],
  username: String
});

module.exports = mongoose.model('Event', eventSchema);

// ✅ models/event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  title: { type: String, trim: true },
  info: { type: String, trim: true },
  purpose: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  time: { type: String, required: true, trim: true },
  eventId: { type: String, required: true, unique: true, trim: true },
  participants: [{ type: String, trim: true }],
  organizer: [{ type: String, trim: true }],
  username: { type: String, required: true, trim: true }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Event', eventSchema);

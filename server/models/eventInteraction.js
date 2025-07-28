const mongoose = require('mongoose');

const eventInteractionSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  likes: { type: Number, default: 0 },
  comments: [
    {
      username: String,
      comment: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model('EventInteraction', eventInteractionSchema);

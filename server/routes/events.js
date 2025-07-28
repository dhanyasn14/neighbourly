//models/events.js
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// Create a new event
router.post('/', async (req, res) => {
  const {
    date,
    purpose,
    location,
    time,
    eventId,
    participants,
    organizer,
    username,
  } = req.body;

  if (!date || !purpose || !location || !time || !eventId || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = await Event.findOne({ eventId });
    if (existing) {
      return res.status(400).json({ error: 'Event ID must be unique' });
    }

    const newEvent = new Event({
      date,
      purpose,
      location,
      time,
      eventId,
      participants,
      organizer,
      username,
    });

    await newEvent.save();
    res.status(201).json({ message: 'Event created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;

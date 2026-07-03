//models/events.js
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Counter = require('../models/Counter');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const EVENT_COUNTER_KEY = 'eventId';

function formatEventId(sequence) {
  return `EVT-${String(sequence).padStart(4, '0')}`;
}

function eventSequenceFromId(eventId) {
  const match = String(eventId || '').match(/(?:^|[-_])(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function getMaxExistingEventSequence() {
  const existingEvents = await Event.find({}, 'eventId').lean();
  return existingEvents.reduce((max, event) => Math.max(max, eventSequenceFromId(event.eventId)), 0);
}

async function getNextEventIdPreview() {
  const [maxExisting, counter] = await Promise.all([
    getMaxExistingEventSequence(),
    Counter.findById(EVENT_COUNTER_KEY).lean(),
  ]);

  return formatEventId(Math.max(maxExisting, counter?.sequence || 0) + 1);
}

async function generateUniqueEventId() {
  const maxExisting = await getMaxExistingEventSequence();
  const counter = await Counter.findById(EVENT_COUNTER_KEY);

  if (!counter || counter.sequence < maxExisting) {
    await Counter.findByIdAndUpdate(
      EVENT_COUNTER_KEY,
      { $set: { sequence: maxExisting } },
      { upsert: true }
    );
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const updatedCounter = await Counter.findByIdAndUpdate(
      EVENT_COUNTER_KEY,
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    const eventId = formatEventId(updatedCounter.sequence);
    const exists = await Event.exists({ eventId });

    if (!exists) {
      return eventId;
    }
  }

  throw new Error('Unable to generate a unique event ID');
}

router.get('/next-id', async (_req, res) => {
  try {
    const eventId = await getNextEventIdPreview();
    return res.json({ eventId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate next event ID' });
  }
});

// Create a new event
router.post('/', async (req, res) => {
  const {
    date,
    title,
    info,
    purpose,
    location,
    time,
    participants,
    organizer,
  } = req.body;

  const eventTitle = String(title || purpose || '').trim();
  const eventInfo = String(info || '').trim();
  const requiredFields = { date, title: eventTitle, location, time };
  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => !String(value || '').trim())
    .map(([field]) => field);

  if (missingFields.length) {
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields,
    });
  }

  try {
    const eventId = await generateUniqueEventId();
    const participantList = Array.isArray(participants)
      ? participants
      : String(participants || '').split(',').map(item => item.trim()).filter(Boolean);
    const organizerList = Array.isArray(organizer)
      ? organizer
      : String(organizer || '').split(',').map(item => item.trim()).filter(Boolean);

    const newEvent = new Event({
      date: new Date(date),
      title: eventTitle,
      info: eventInfo,
      purpose: eventTitle,
      location: String(location).trim(),
      time: String(time).trim(),
      eventId,
      participants: participantList,
      organizer: organizerList,
      username: req.user.username,
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1, _id: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = router;

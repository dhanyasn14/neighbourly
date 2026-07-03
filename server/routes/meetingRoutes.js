// ✅ Extend backend: server/routes/meetingRoutes.js

const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Counter = require('../models/Counter');
const { isAfter } = require('date-fns');
const { requireAuth, requireSelfOrAdmin } = require('../middleware/auth');

router.use(requireAuth);

const MEETING_COUNTER_KEY = 'meetingId';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatMeetingId(sequence) {
  return `M${String(sequence).padStart(3, '0')}`;
}

function meetingSequenceFromId(meetingId) {
  const match = String(meetingId || '').match(/^(?:MTG-)?M?(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function rootMeetingId(meetingId) {
  return String(meetingId || '').trim().replace(/-[A-Z]+$/i, '');
}

function continuationSuffixFromId(meetingId) {
  const match = String(meetingId || '').match(/-([A-Z]+)$/i);
  return match ? match[1].toUpperCase() : '';
}

function suffixToNumber(suffix) {
  return String(suffix || '').toUpperCase().split('').reduce((total, char) => {
    const value = char.charCodeAt(0) - 64;
    return total * 26 + Math.max(value, 0);
  }, 0);
}

function numberToSuffix(number) {
  let value = number;
  let suffix = '';

  while (value > 0) {
    value -= 1;
    suffix = String.fromCharCode(65 + (value % 26)) + suffix;
    value = Math.floor(value / 26);
  }

  return suffix || 'A';
}

async function getMaxExistingMeetingSequence() {
  const meetings = await Meeting.find({}, 'meetingId').lean();
  return meetings.reduce((max, meeting) => Math.max(max, meetingSequenceFromId(meeting.meetingId)), 0);
}

async function getNextMeetingIdPreview() {
  const [maxExisting, counter] = await Promise.all([
    getMaxExistingMeetingSequence(),
    Counter.findById(MEETING_COUNTER_KEY).lean(),
  ]);

  return formatMeetingId(Math.max(maxExisting, counter?.sequence || 0) + 1);
}

async function generateUniqueMeetingId() {
  const maxExisting = await getMaxExistingMeetingSequence();
  const counter = await Counter.findById(MEETING_COUNTER_KEY);

  if (!counter || counter.sequence < maxExisting) {
    await Counter.findByIdAndUpdate(
      MEETING_COUNTER_KEY,
      { $set: { sequence: maxExisting } },
      { upsert: true }
    );
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const updatedCounter = await Counter.findByIdAndUpdate(
      MEETING_COUNTER_KEY,
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    const meetingId = formatMeetingId(updatedCounter.sequence);
    const exists = await Meeting.exists({ meetingId });

    if (!exists) {
      return meetingId;
    }
  }

  throw new Error('Unable to generate a unique meeting ID');
}

async function getNextContinuationId(baseMeetingId) {
  const rootId = rootMeetingId(baseMeetingId);

  if (!rootId) {
    throw new Error('Base meeting ID is required');
  }

  const rootMeeting = await Meeting.findOne({ meetingId: rootId }).lean();

  if (!rootMeeting) {
    throw new Error('Base meeting was not found');
  }

  if (rootMeeting.parentMeetingId || continuationSuffixFromId(baseMeetingId)) {
    throw new Error('Continuations can only be created from a main meeting ID');
  }

  const relatedMeetings = await Meeting.find({
    $or: [
      { meetingId: rootId },
      { parentMeetingId: rootId },
      { meetingId: { $regex: `^${escapeRegex(rootId)}-[A-Z]+$`, $options: 'i' } },
    ],
  }, 'meetingId continuationSuffix version').lean();

  const maxSuffixNumber = relatedMeetings.reduce((max, meeting) => {
    const suffix = meeting.continuationSuffix || continuationSuffixFromId(meeting.meetingId);
    return Math.max(max, suffixToNumber(suffix));
  }, 0);
  const suffix = numberToSuffix(maxSuffixNumber + 1);

  return {
    meetingId: `${rootId}-${suffix}`,
    parentMeetingId: rootId,
    continuationSuffix: suffix,
    version: maxSuffixNumber + 2,
  };
}

function isValidMeetingLink(value) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (err) {
    return false;
  }
}

function getDateKey(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function getMeetingDateTime(meeting) {
  return new Date(`${getDateKey(meeting.date)}T${meeting.time || '23:59'}`);
}

router.get('/next-id', async (req, res) => {
  try {
    if (req.query.baseMeetingId) {
      const continuation = await getNextContinuationId(req.query.baseMeetingId);
      return res.json(continuation);
    }

    const meetingId = await getNextMeetingIdPreview();
    return res.json({ meetingId, version: 1 });
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Failed to generate meeting ID' });
  }
});

// Create new meeting
router.post('/', async (req, res) => {
  try {
    const {
      date,
      purpose,
      continuationOf,
      time,
      meetingMode = 'In-person',
      meetingLink = '',
      notes = '',
    } = req.body;

    if (!date || !purpose || !time) {
      return res.status(400).json({ message: 'Date, time, and purpose are required' });
    }

    if (!['In-person', 'Zoom'].includes(meetingMode)) {
      return res.status(400).json({ message: 'Invalid meeting mode' });
    }

    if (meetingMode === 'Zoom' && !isValidMeetingLink(meetingLink)) {
      return res.status(400).json({ message: 'A valid Zoom meeting link is required' });
    }

    const meetingDate = new Date(date);
    const meetingDateTime = new Date(`${date}T${time}`);

    if (!isAfter(meetingDateTime, new Date())) {
      return res.status(400).json({ message: 'Meeting date and time must be in the future' });
    }

    const identity = continuationOf
      ? await getNextContinuationId(continuationOf)
      : { meetingId: await generateUniqueMeetingId(), parentMeetingId: '', version: 1 };

    const initialNotes = String(notes || '').trim()
      ? [{ username: req.user.username, note: String(notes).trim(), createdAt: new Date() }]
      : [];

    const newMeeting = new Meeting({
      username: req.user.username,
      date: meetingDate,
      purpose: purpose.trim(),
      meetingId: identity.meetingId,
      parentMeetingId: identity.parentMeetingId,
      continuationSuffix: identity.continuationSuffix || '',
      version: identity.version,
      time: time.trim(),
      meetingMode,
      meetingLink: meetingMode === 'Zoom' ? meetingLink.trim() : '',
      notes: initialNotes,
      request: 'Pending'
    });

    await newMeeting.save();
    res.status(201).json({ message: 'Meeting scheduled successfully', meeting: newMeeting });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// 🔍 Search meeting IDs by prefix
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const filter = {
      meetingId: { $regex: `^${escapeRegex(query)}`, $options: 'i' },
    };

    if (req.query.mainOnly === 'true') {
      filter.$or = [
        { parentMeetingId: { $exists: false } },
        { parentMeetingId: '' },
        { parentMeetingId: null },
      ];
    }

    const meetings = await Meeting.find(filter).distinct('meetingId');
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Error searching meetings', error: err.message });
  }
});

router.get('/all', async (_req, res) => {
  try {
    const meetings = await Meeting.find().sort({ date: -1, time: -1, createdAt: -1 }).lean();
    return res.json(meetings);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching meetings', error: err.message });
  }
});

router.get('/reference/:meetingId', async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId }).lean();

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    return res.json(meeting);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching meeting', error: err.message });
  }
});

router.post('/:id/notes', async (req, res) => {
  const note = String(req.body.note || '').trim();

  if (!note || note.length > 1000) {
    return res.status(400).json({ message: 'A note up to 1000 characters is required' });
  }

  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: {
            username: req.user.username,
            note,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    return res.status(201).json(meeting);
  } catch (err) {
    return res.status(500).json({ message: 'Error adding note', error: err.message });
  }
});

// 🧑 Get meetings created by a specific user
router.get('/user/:username', requireSelfOrAdmin('username'), async (req, res) => {
  try {
    const meetings = await Meeting.find({ username: req.params.username });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user meetings', error: err.message });
  }
});

// ✅ Get completed meetings (past date AND request is Done)
// ✅ Completed meetings (past date AND request is 'done')
router.get('/completed', async (req, res) => {
  try {
    const now = new Date();
    const meetings = await Meeting.find({
      request: 'Done'
    }).lean();
    res.json(
      meetings
        .filter(meeting => getMeetingDateTime(meeting) < now)
        .sort((a, b) => getMeetingDateTime(b) - getMeetingDateTime(a))
    );
  } catch (err) {
    res.status(500).json({ message: 'Error fetching completed meetings', error: err.message });
  }
});

// ✅ Upcoming meetings (future date AND request is 'done')
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const meetings = await Meeting.find({
      request: 'Done'
    }).lean();
    res.json(
      meetings
        .filter(meeting => getMeetingDateTime(meeting) >= now)
        .sort((a, b) => getMeetingDateTime(a) - getMeetingDateTime(b))
    );
  } catch (err) {
    res.status(500).json({ message: 'Error fetching upcoming meetings', error: err.message });
  }
});



module.exports = router;

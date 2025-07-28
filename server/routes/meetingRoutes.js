// ✅ Extend backend: server/routes/meetingRoutes.js

const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const { isAfter } = require('date-fns');

// Create new meeting
router.post('/', async (req, res) => {
  try {
    const { username, date, purpose, meetingId } = req.body;
    const meetingDate = new Date(date);

    if (!isAfter(meetingDate, new Date())) {
      return res.status(400).json({ message: 'Date must be in the future' });
    }

    const newMeeting = new Meeting({
      username,
      date: meetingDate,
      purpose,
      meetingId,
      request: 'pending'
    });

    await newMeeting.save();
    res.status(201).json({ message: 'Meeting scheduled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// 🔍 Search meeting IDs by prefix
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const meetings = await Meeting.find({ meetingId: { $regex: `^${query}`, $options: 'i' } }).distinct('meetingId');
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Error searching meetings', error: err.message });
  }
});

// 🧑 Get meetings created by a specific user
router.get('/user/:username', async (req, res) => {
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
      date: { $lt: now },
      request: 'done'   // 👈 lowercase
    });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching completed meetings', error: err.message });
  }
});

// ✅ Upcoming meetings (future date AND request is 'done')
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const meetings = await Meeting.find({ 
      date: { $gt: now },
      request: 'done'   // 👈 lowercase
    });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching upcoming meetings', error: err.message });
  }
});



module.exports = router;

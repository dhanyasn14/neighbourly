const express = require('express');
const router = express.Router();
const User = require('../models/LocalUser');
const Meeting = require('../models/Meeting');
const Transaction = require('../models/Account');
const Event = require('../models/Event');

// Add User
router.post('/add-user', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send('User added');
  } catch (err) {
    res.status(400).send('Error adding user');
  }
});

// Get all pending meetings
router.get('/pending-meetings', async (req, res) => {
  try {
    const pending = await Meeting.find({ request: 'Pending' });
    res.json(pending);
  } catch (err) {
    res.status(500).send('Error fetching meetings');
  }
});

// Update meeting request status
router.patch('/update-meeting/:id', async (req, res) => {
  try {
    await Meeting.findByIdAndUpdate(req.params.id, { request: req.body.status });
    res.send('Meeting updated');
  } catch (err) {
    res.status(400).send('Error updating meeting');
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username');
    res.json(users);
  } catch (err) {
    res.status(500).send('Error fetching users');
  }
});

// Get a specific user by username
router.get('/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    res.json(user);
  } catch (err) {
    res.status(500).send('Error fetching user');
  }
});

// Edit user
router.put('/edit-user/:username', async (req, res) => {
  try {
    await User.findOneAndUpdate({ username: req.params.username }, req.body);
    res.send('User updated');
  } catch (err) {
    res.status(400).send('Error updating user');
  }
});

// Get all IDs for transactions
router.get('/all-ids', async (req, res) => {
  try {
    const meetings = await Meeting.find({}, 'meetingId');
    const events = await Event.find({}, 'eventId');
    const users = await User.find({}, 'username');

    res.json({
      meetingIds: meetings.map(m => m.meetingId).filter(Boolean),
      eventIds: events.map(e => e.eventId).filter(Boolean),
      usernames: users.map(u => u.username).filter(Boolean)
    });
  } catch (err) {
    res.status(500).send('Error fetching IDs');
  }
});

// Submit transaction
router.post('/transaction', async (req, res) => {
  const { type, amount, meetingIds, eventIds, username, transactionDate } = req.body;
  try {
    const newTransaction = new Transaction({
      type,
      amount,
      meetingIds,
      eventIds,
      username,
      transactionDate
    });
    await newTransaction.save();
    res.status(201).json({ message: 'Transaction recorded' });
  } catch (err) {
    res.status(500).json({ message: 'Error saving transaction', error: err });
  }
});


module.exports = router;

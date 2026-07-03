const express = require('express');
const router = express.Router();
const User = require('../models/LocalUser');
const Meeting = require('../models/Meeting');
const Transaction = require('../models/Account');
const Event = require('../models/Event');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const { hashPassword, hashPasswordIfNeeded } = require('../utils/password');
const { validateRequiredProfileFields } = require('../utils/userValidation');

router.use(requireAuth, requireAdmin);

const USER_FIELDS = ['username', 'password', 'name', 'phoneNumber', 'ownership', 'email', 'address', 'bio'];

async function buildUserPayload(body, options = {}) {
  const payload = {};

  USER_FIELDS.forEach(field => {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  });

  payload.role = 'User';

  const validation = validateRequiredProfileFields(payload, {
    includePassword: options.requirePassword,
  });

  if (!validation.isValid) {
    const error = new Error('Missing required user fields');
    error.statusCode = 400;
    error.missingFields = validation.missingFields;
    throw error;
  }

  if (payload.password) {
    payload.password = await hashPasswordIfNeeded(payload.password);
  } else {
    delete payload.password;
  }

  return payload;
}

// Add User
router.post('/add-user', async (req, res) => {
  try {
    const payload = await buildUserPayload(req.body, { requirePassword: true });
    const user = new User(payload);
    await user.save();
    res.status(201).json({ message: 'User added' });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      error: err.message || 'Error adding user',
      missingFields: err.missingFields,
    });
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
    const allowedStatuses = ['Pending', 'Done', 'Rejected'];

    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid meeting status' });
    }

    await Meeting.findByIdAndUpdate(req.params.id, { request: req.body.status });
    res.json({ message: 'Meeting updated' });
  } catch (err) {
    res.status(400).json({ error: 'Error updating meeting' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find(
      {},
      'username name email phoneNumber address bio isRemoved loginDisabled removedAt'
    ).sort({ isRemoved: 1, username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).send('Error fetching users');
  }
});

// Get a specific user by username
router.get('/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).send('Error fetching user');
  }
});

// Edit user
router.put('/edit-user/:username', async (req, res) => {
  try {
    const payload = await buildUserPayload({
      ...req.body,
      username: req.params.username,
    });
    delete payload.username;

    await User.findOneAndUpdate({ username: req.params.username }, payload, {
      new: true,
      runValidators: true,
    });
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      error: err.message || 'Error updating user',
      missingFields: err.missingFields,
    });
  }
});

// Remove user access while retaining historical records
router.delete('/user/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username }, '_id username isRemoved');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isRemoved) {
      return res.json({ message: 'User access was already removed. Historical records remain retained.' });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          isRemoved: true,
          loginDisabled: true,
          removedAt: new Date(),
          removedBy: req.user.username,
          password: await hashPassword(`removed-${user._id}-${Date.now()}-${Math.random()}`),
        },
      }
    );

    return res.json({ message: 'User access removed. Historical records were retained.' });
  } catch (err) {
    return res.status(500).json({ error: 'Error removing user access' });
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
  const { amount, meetingIds, eventIds, username, transactionDate } = req.body;
  const type = req.body.type || req.body.transactionType;

  if (!['Credited', 'Debited'].includes(type) || !amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Valid type and amount are required' });
  }

  try {
    const newTransaction = new Transaction({
      type,
      amount: Number(amount),
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

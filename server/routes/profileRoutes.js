// server/routes/profileRoutes.js

const express = require('express');
const router = express.Router();
const LocalUser = require('../models/LocalUser');
const Admin = require('../models/Admin');

// Get profile
router.get('/:type/:username', async (req, res) => {
  const { type, username } = req.params;
  const Model = type === 'admin' ? Admin : LocalUser;

  try {
    const user = await Model.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update profile bio
router.put('/:type/:username', async (req, res) => {
  const { type, username } = req.params;
  const Model = type === 'admin' ? Admin : LocalUser;
  const { bio } = req.body;

  try {
    const updated = await Model.findOneAndUpdate(
      { username },
      { bio },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

module.exports = router;

// routes/commspace.js
const express = require('express');
const router = express.Router();
const LocalUser = require('../models/LocalUser');

// GET all users for Commspace
router.get('/', async (req, res) => {
  try {
    const users = await LocalUser.find({}, {
      _id: 0,
      username: 1,
      name: 1,
      phoneNumber: 1,
      email: 1,
      address: 1,   // ← include full address
      bio: 1    // ← include full bi
    });

    // console.log("COMMSPACE USERS:\n", JSON.stringify(users, null, 2));
    res.json(users);
  } catch (err) {
    console.error('Commspace fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;

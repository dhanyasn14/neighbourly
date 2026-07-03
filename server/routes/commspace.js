// routes/commspace.js
const express = require('express');
const router = express.Router();
const LocalUser = require('../models/LocalUser');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET all users for Commspace
router.get('/', async (req, res) => {
  try {
    const query = req.user.isAdmin ? {} : { isRemoved: { $ne: true }, loginDisabled: { $ne: true } };
    const users = await LocalUser.find(query, {
      _id: 0,
      username: 1,
      name: 1,
      phoneNumber: 1,
      email: 1,
      address: 1,
      bio: 1,
      isRemoved: 1,
      loginDisabled: 1,
      removedAt: 1,
    });

    // console.log("COMMSPACE USERS:\n", JSON.stringify(users, null, 2));
    res.json(users);
  } catch (err) {
    console.error('Commspace fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;

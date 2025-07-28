const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const LocalUser = require('../models/LocalUser');

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await Admin.findOne({ username, password });
    if (user) {
      return res.json({ userType: 'admin', username: user.username });
    }

    user = await LocalUser.findOne({ username, password });
    if (user) {
      return res.json({ userType: 'local', username: user.username });
    }

    res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

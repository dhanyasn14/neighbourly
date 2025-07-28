const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const LocalUser = require('../models/LocalUser');

// Get all usernames (autocomplete suggestions)
router.get('/all-usernames', async (req, res) => {
  try {
    const q = req.query.q?.toLowerCase() || '';

    const [admins, locals] = await Promise.all([
      Admin.find({}, 'username'),
      LocalUser.find({}, 'username'),
    ]);

    const allUsernames = [...admins, ...locals]
      .map(u => u.username)
      .filter(name => name.toLowerCase().includes(q));

    res.json(allUsernames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

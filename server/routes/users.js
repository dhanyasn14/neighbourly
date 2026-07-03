const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const LocalUser = require('../models/LocalUser');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/directory', async (req, res) => {
  try {
    const localQuery = req.user.isAdmin ? {} : { isRemoved: { $ne: true }, loginDisabled: { $ne: true } };
    const [admins, locals] = await Promise.all([
      Admin.find({}, 'username name role bio address'),
      LocalUser.find(localQuery, 'username name role bio address isRemoved'),
    ]);

    const directory = [...admins, ...locals].map(user => ({
      username: user.username,
      name: user.name || user.username,
      role: user.role,
      profession: user.bio?.profession || '',
      houseNumber: user.address?.houseNumber || '',
      businessLocation: user.bio?.businessLocation || '',
      isRemoved: Boolean(user.isRemoved),
    }));

    res.json(directory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all usernames (autocomplete suggestions)
router.get('/all-usernames', async (req, res) => {
  try {
    const q = req.query.q?.toLowerCase() || '';

    const [admins, locals] = await Promise.all([
      Admin.find({}, 'username'),
      LocalUser.find({ isRemoved: { $ne: true }, loginDisabled: { $ne: true } }, 'username'),
    ]);

    const allUsernames = [...admins, ...locals]
      .map(u => u.username)
      .filter(name => name.toLowerCase().includes(q))
      .slice(0, 20);

    res.json(allUsernames);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

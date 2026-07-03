// server/routes/profileRoutes.js

const express = require('express');
const router = express.Router();
const LocalUser = require('../models/LocalUser');
const Admin = require('../models/Admin');
const { requireAuth } = require('../middleware/auth');
const { hashPassword, verifyPassword } = require('../utils/password');
const { validateRequiredProfileFields } = require('../utils/userValidation');

router.use(requireAuth);

function getModel(type) {
  if (type === 'admin') return Admin;
  if (type === 'local' || type === 'user') return LocalUser;
  return null;
}

function canAccessProfile(req, type, username) {
  if (req.user.isAdmin) {
    return true;
  }

  return type !== 'admin' && req.user.username === username;
}

function normalizeProfilePayload(body) {
  const source = body.profile || body;

  return {
    name: source.name,
    email: source.email,
    phoneNumber: source.phoneNumber,
    ownership: source.ownership,
    address: {
      houseNumber: source.address?.houseNumber,
      streetName: source.address?.streetName,
      areaName: source.address?.areaName,
      landmark: source.address?.landmark || '',
    },
    bio: {
      profession: source.bio?.profession,
      about: source.bio?.about,
      businessName: source.bio?.businessName || '',
      businessLocation: source.bio?.businessLocation || '',
      helpOffer: source.bio?.helpOffer || '',
    },
  };
}

router.patch('/password', async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const Model = req.user.userType === 'admin' ? Admin : LocalUser;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Old password, new password, and confirmation are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New password and confirmation do not match' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }

  if (newPassword === oldPassword) {
    return res.status(400).json({ message: 'New password must be different from old password' });
  }

  try {
    const user = await Model.findOne({ username: req.user.username }).select('+password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    const passwordResult = await verifyPassword(oldPassword, user.password);

    if (!passwordResult.isValid) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    await Model.updateOne(
      { _id: user._id },
      { $set: { password: await hashPassword(newPassword) } }
    );

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error changing password' });
  }
});

// Get profile
router.get('/:type/:username', async (req, res) => {
  const { type, username } = req.params;
  const Model = getModel(type);

  if (!Model) return res.status(400).json({ message: 'Invalid profile type' });
  if (!canAccessProfile(req, type, username)) return res.status(403).json({ message: 'Access denied' });

  try {
    const user = await Model.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!req.user.isAdmin && type !== 'admin' && user.isRemoved) {
      return res.status(404).json({ message: 'User profile is not available' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update profile details
router.put('/:type/:username', async (req, res) => {
  const { type, username } = req.params;
  const Model = getModel(type);
  const payload = normalizeProfilePayload(req.body);

  if (!Model) return res.status(400).json({ message: 'Invalid profile type' });
  if (!canAccessProfile(req, type, username)) return res.status(403).json({ message: 'Access denied' });

  const validation = validateRequiredProfileFields({ ...payload, username });
  if (!validation.isValid) {
    return res.status(400).json({
      message: 'Missing required profile fields',
      missingFields: validation.missingFields,
    });
  }

  try {
    if (!req.user.isAdmin && type !== 'admin') {
      const existing = await Model.findOne({ username }, 'isRemoved');
      if (existing?.isRemoved) {
        return res.status(403).json({ message: 'User profile is not available' });
      }
    }

    const updated = await Model.findOneAndUpdate(
      { username },
      payload,
      { new: true, runValidators: true }
    );
    res.json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Error updating profile' });
  }
});

module.exports = router;

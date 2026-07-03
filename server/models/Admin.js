const mongoose = require('mongoose');
const { hashPasswordIfNeeded } = require('../utils/password');

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true },
  address: {
    houseNumber: { type: String, required: true, trim: true },
    streetName: { type: String, required: true, trim: true },
    areaName: { type: String, required: true, trim: true },
    landmark: String,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'],
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Email must be valid'],
  },
  role: { type: String, default: 'Administrator' },
  ownership: { type: String, enum: ['Owner', 'Renter'], required: true },
  bio: {
    profession: { type: String, required: true, trim: true },
    about: { type: String, required: true, trim: true },
    businessName: String,
    businessLocation: String,
    helpOffer: String
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.password;
      return ret;
    }
  },
  toObject: {
    transform: (_doc, ret) => {
      delete ret.password;
      return ret;
    }
  }
});

adminSchema.pre('save', async function hashPassword(next) {
  try {
    if (this.isModified('password')) {
      this.password = await hashPasswordIfNeeded(this.password);
    }

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Admin', adminSchema);

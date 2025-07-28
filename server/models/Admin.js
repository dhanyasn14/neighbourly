const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  address: {
    houseNumber: String,
    streetName: String,
    areaName: String,
    landmark: String,
  },
  phoneNumber: {
    type: String,
    match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'],
  },
  email: {
    type: String,
    match: [/.+@.+\..+/, 'Email must be valid'],
  },
  role: { type: String, default: 'Administrator' },
  ownership: { type: String, enum: ['Owner', 'Renter'] },
  bio: {
  profession: String,
  about: String,
  businessName: String,
  businessLocation: String,
  helpOffer: String
}
});

module.exports = mongoose.model('Admin', adminSchema);

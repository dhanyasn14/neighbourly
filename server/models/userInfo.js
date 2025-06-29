const mongoose = require('mongoose');

const userInfoSchema = new mongoose.Schema({
  username: String,
  name: String,
  email: String,
  profession: String,
  houseNumber: String,
  address: String,
  ownershipStatus: String,
  residingFrom: String,
  contactInfo: String,
  additionalInfo: String
});

// ✅ Force collection name as 'user_info'
module.exports = mongoose.model('UserInfo', userInfoSchema, 'user_info');

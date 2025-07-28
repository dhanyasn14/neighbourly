const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  transactionDate: Date,
  type: { type: String, enum: ['Credited', 'Debited'] }, // Changed from 'transactionType'
  meetingIds: [String],
  eventIds: [String],
  amount: Number,
  username: String
});


module.exports = mongoose.model('Account', accountSchema);

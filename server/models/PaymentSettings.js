const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'community-donation' },
  accountHolderName: { type: String, trim: true },
  bankName: { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  ifscCode: { type: String, trim: true, uppercase: true },
  branchName: { type: String, trim: true },
  upiId: {
    type: String,
    trim: true,
    lowercase: true,
  },
  upiDisplayName: { type: String, trim: true },
  paymentNote: { type: String, trim: true },
  updatedBy: { type: String, trim: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);

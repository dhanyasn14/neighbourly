const mongoose = require('mongoose');

const passwordResetOtpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userType: { type: String, enum: ['admin', 'local'], required: true, index: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
  usedAt: Date,
}, {
  timestamps: true,
});

module.exports = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);

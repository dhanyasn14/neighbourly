const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Weather', 'Security', 'Maintenance', 'Health', 'Community', 'Other'],
    required: true,
    default: 'Community',
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    required: true,
    default: 'warning',
  },
  audience: {
    type: String,
    enum: ['all-residents'],
    required: true,
    default: 'all-residents',
  },
  sendEmail: { type: Boolean, required: true, default: false },
  startsAt: { type: Date, required: true, default: Date.now },
  expiresAt: Date,
  status: {
    type: String,
    enum: ['active', 'resolved'],
    required: true,
    default: 'active',
  },
  createdBy: { type: String, required: true, trim: true },
  alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'Alert', required: true },
  email: {
    enabled: { type: Boolean, required: true, default: false },
    sent: { type: Boolean, required: true, default: false },
    recipients: { type: Number, required: true, default: 0 },
    message: { type: String, required: true, trim: true, default: 'Email was not requested.' },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Broadcast', broadcastSchema);

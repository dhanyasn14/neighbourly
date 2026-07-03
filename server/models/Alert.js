const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Weather', 'Security', 'Maintenance', 'Health', 'Community', 'Other'],
    default: 'Community',
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning',
  },
  startsAt: { type: Date, default: Date.now },
  expiresAt: Date,
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active',
  },
  createdBy: { type: String, required: true, trim: true },
  emailSent: { type: Boolean, default: false },
  emailRecipients: { type: Number, default: 0 },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Alert', alertSchema);

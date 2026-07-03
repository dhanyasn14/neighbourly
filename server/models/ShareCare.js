const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  comment: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const shareCareSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  contact: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['tuition', 'carpool', 'resource'],
    required: true,
    lowercase: true,
  },
  title: { type: String, required: true, trim: true },
  details: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['active', 'done'],
    default: 'active',
  },
  tuition: {
    subject: String,
    classLevel: String,
    mode: { type: String, enum: ['Online', 'At tutor home', 'At student home', 'Community space', ''], default: '' },
    schedule: String,
    location: String,
    feeExpectation: String,
  },
  carpool: {
    direction: { type: String, enum: ['Offering ride', 'Need ride', ''], default: '' },
    pickupLocation: String,
    dropLocation: String,
    travelDate: Date,
    travelTime: String,
    seats: Number,
  },
  resource: {
    requestType: { type: String, enum: ['Need item', 'Lending item', 'Giving away', ''], default: '' },
    itemName: String,
    condition: String,
    availabilityWindow: String,
    returnExpectation: String,
  },
  comments: [commentSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('ShareCare', shareCareSchema);

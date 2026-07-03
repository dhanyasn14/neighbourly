const mongoose = require('mongoose');
require('dotenv').config();

const Counter = require('../models/Counter');
const Meeting = require('../models/Meeting');

function rootMeetingId(meetingId) {
  return String(meetingId || '').trim().replace(/-[A-Z]+$/i, '');
}

function continuationSuffixFromId(meetingId) {
  const match = String(meetingId || '').match(/-([A-Z]+)$/i);
  return match ? match[1].toUpperCase() : '';
}

function suffixToNumber(suffix) {
  return String(suffix || '').toUpperCase().split('').reduce((total, char) => {
    const value = char.charCodeAt(0) - 64;
    return total * 26 + Math.max(value, 0);
  }, 0);
}

function meetingSequenceFromId(meetingId) {
  const match = String(meetingId || '').match(/^(?:MTG-)?M?(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function needsValue(value) {
  return value === undefined || value === null;
}

async function migrateMeetings() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const meetings = await Meeting.find().lean();
  const operations = [];
  let maxSequence = 0;

  for (const meeting of meetings) {
    const update = {};
    const suffix = continuationSuffixFromId(meeting.meetingId);
    const rootId = rootMeetingId(meeting.meetingId);

    maxSequence = Math.max(maxSequence, meetingSequenceFromId(meeting.meetingId));

    if (needsValue(meeting.time)) update.time = '';
    if (needsValue(meeting.meetingMode)) update.meetingMode = 'In-person';
    if (needsValue(meeting.meetingLink)) update.meetingLink = '';
    if (needsValue(meeting.parentMeetingId)) update.parentMeetingId = suffix ? rootId : '';
    if (needsValue(meeting.continuationSuffix)) update.continuationSuffix = suffix;
    if (needsValue(meeting.version)) update.version = suffix ? suffixToNumber(suffix) + 1 : 1;
    if (!Array.isArray(meeting.notes)) update.notes = [];

    if (Object.keys(update).length > 0) {
      operations.push({
        updateOne: {
          filter: { _id: meeting._id },
          update: { $set: update },
        },
      });
    }
  }

  if (operations.length > 0) {
    await Meeting.bulkWrite(operations);
  }

  if (maxSequence > 0) {
    await Counter.updateOne(
      { _id: 'meetingId' },
      { $max: { sequence: maxSequence } },
      { upsert: true }
    );
  }

  console.log(`Meeting migration complete. Checked ${meetings.length} document(s), updated ${operations.length}.`);
}

migrateMeetings()
  .catch((err) => {
    console.error(`Meeting migration failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

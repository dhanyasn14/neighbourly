const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('../models/Event');

async function migrateEvents() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const events = await Event.collection.find({}).toArray();
  const operations = events
    .map((event) => {
      const title = String(event.title || event.purpose || 'Community event').trim();
      const info = typeof event.info === 'string' ? event.info : '';
      const purpose = String(event.purpose || title).trim();

      const needsUpdate = event.title !== title || event.info !== info || event.purpose !== purpose;
      if (!needsUpdate) return null;

      return {
        updateOne: {
          filter: { _id: event._id },
          update: { $set: { title, info, purpose } },
        },
      };
    })
    .filter(Boolean);

  if (operations.length > 0) {
    await Event.collection.bulkWrite(operations);
  }

  console.log(`Event migration complete. Checked ${events.length} document(s), updated ${operations.length}.`);
}

migrateEvents()
  .catch((err) => {
    console.error(`Event migration failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

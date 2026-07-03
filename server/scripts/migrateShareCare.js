const mongoose = require('mongoose');
require('dotenv').config();

const ShareCare = require('../models/ShareCare');

function normalizeType(type) {
  if (type === 'pickup' || type === 'drop') return 'carpool';
  if (type === 'tools' || type === 'share') return 'resource';
  if (type === 'tuitions') return 'tuition';
  return type;
}

async function migrateShareCare() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const posts = await ShareCare.collection.find({}).toArray();
  const operations = [];

  for (const post of posts) {
    const type = normalizeType(post.type);
    const update = {
      status: post.status || 'active',
      comments: Array.isArray(post.comments) ? post.comments : [],
      type,
      title: post.title || post.details || `${type} request`,
      details: post.details || 'Details not provided',
      contact: post.contact || 'Not provided',
    };

    if (type === 'tuition') {
      update.tuition = {
        subject: post.tuition?.subject || post.subject || 'General',
        classLevel: post.tuition?.classLevel || post.classLevel || 'Not specified',
        mode: post.tuition?.mode || '',
        schedule: post.tuition?.schedule || post.time || 'Not specified',
        location: post.tuition?.location || post.road || 'Not specified',
        feeExpectation: post.tuition?.feeExpectation || '',
      };
    }

    if (type === 'carpool') {
      update.carpool = {
        direction: post.carpool?.direction || (post.type === 'drop' ? 'Offering ride' : 'Need ride'),
        pickupLocation: post.carpool?.pickupLocation || post.road || 'Not specified',
        dropLocation: post.carpool?.dropLocation || post.road || 'Not specified',
        travelDate: post.carpool?.travelDate || post.date,
        travelTime: post.carpool?.travelTime || post.time || '',
        seats: post.carpool?.seats,
      };
    }

    if (type === 'resource') {
      update.resource = {
        requestType: post.resource?.requestType || (post.type === 'tools' ? 'Need item' : 'Lending item'),
        itemName: post.resource?.itemName || post.details || 'Resource',
        condition: post.resource?.condition || '',
        availabilityWindow: post.resource?.availabilityWindow || 'Not specified',
        returnExpectation: post.resource?.returnExpectation || '',
      };
    }

    operations.push({
      updateOne: {
        filter: { _id: post._id },
        update: { $set: update },
      },
    });
  }

  if (operations.length > 0) {
    await ShareCare.collection.bulkWrite(operations);
  }

  console.log(`ShareCare migration complete. Checked ${posts.length} document(s), updated ${operations.length}.`);
}

migrateShareCare()
  .catch((err) => {
    console.error(`ShareCare migration failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

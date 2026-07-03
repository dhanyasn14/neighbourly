const express = require('express');
const router = express.Router();
const ShareCare = require('../models/ShareCare');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const groupedTypes = ['tuition', 'carpool', 'resource'];

function normalizePayload(body, username) {
  const type = String(body.type || '').toLowerCase();
  const payload = {
    username,
    type,
    title: String(body.title || '').trim(),
    details: String(body.details || '').trim(),
    contact: String(body.contact || '').trim(),
    tuition: {},
    carpool: {},
    resource: {},
  };

  if (type === 'tuition') {
    payload.tuition = {
      subject: body.subject,
      classLevel: body.classLevel,
      mode: body.mode,
      schedule: body.schedule,
      location: body.location,
      feeExpectation: body.feeExpectation,
    };
  }

  if (type === 'carpool') {
    payload.carpool = {
      direction: body.direction,
      pickupLocation: body.pickupLocation,
      dropLocation: body.dropLocation,
      travelDate: body.travelDate ? new Date(body.travelDate) : undefined,
      travelTime: body.travelTime,
      seats: body.seats ? Number(body.seats) : undefined,
    };
  }

  if (type === 'resource') {
    payload.resource = {
      requestType: body.requestType,
      itemName: body.itemName,
      condition: body.condition,
      availabilityWindow: body.availabilityWindow,
      returnExpectation: body.returnExpectation,
    };
  }

  return payload;
}

function validatePayload(payload) {
  const missing = [];

  ['type', 'title', 'details', 'contact'].forEach(field => {
    if (!payload[field]) missing.push(field);
  });

  if (!groupedTypes.includes(payload.type)) missing.push('valid type');

  if (payload.type === 'tuition') {
    if (!payload.tuition.subject) missing.push('subject');
    if (!payload.tuition.classLevel) missing.push('class level');
    if (!payload.tuition.schedule) missing.push('schedule');
    if (!payload.tuition.location) missing.push('location');
  }

  if (payload.type === 'carpool') {
    if (!payload.carpool.direction) missing.push('ride type');
    if (!payload.carpool.pickupLocation) missing.push('pickup location');
    if (!payload.carpool.dropLocation) missing.push('drop location');
    if (!payload.carpool.travelDate) missing.push('travel date');
    if (!payload.carpool.travelTime) missing.push('travel time');
  }

  if (payload.type === 'resource') {
    if (!payload.resource.requestType) missing.push('resource type');
    if (!payload.resource.itemName) missing.push('item name');
    if (!payload.resource.availabilityWindow) missing.push('availability');
  }

  return missing;
}

router.post('/', async (req, res) => {
  try {
    const payload = normalizePayload(req.body, req.user.username);
    const missing = validatePayload(payload);

    if (missing.length) {
      return res.status(400).json({ error: 'Missing required fields', missing });
    }

    const post = await ShareCare.create(payload);
    return res.status(201).json(post);
  } catch (err) {
    return res.status(500).json({ error: 'Server error while creating post', details: err.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const posts = await ShareCare.find().sort({ status: 1, createdAt: -1 }).lean();
    const grouped = groupedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {});

    posts.forEach(post => {
      if (grouped[post.type]) {
        grouped[post.type].push(post);
      }
    });

    return res.json(grouped);
  } catch (err) {
    return res.status(500).json({ error: 'Server error while fetching posts' });
  }
});

router.post('/:id/comments', async (req, res) => {
  const comment = String(req.body.comment || '').trim();

  if (!comment || comment.length > 500) {
    return res.status(400).json({ error: 'A comment up to 500 characters is required' });
  }

  try {
    const post = await ShareCare.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            username: req.user.username,
            comment,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.status(201).json(post);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.patch('/:id/done', async (req, res) => {
  try {
    const post = await ShareCare.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.username !== req.user.username) {
      return res.status(403).json({ error: 'Only the creator can close this post' });
    }

    post.status = 'done';
    const saved = await post.save();
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to close post' });
  }
});

module.exports = router;

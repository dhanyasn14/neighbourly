// routes/sharecare.js
const express = require('express');
const router = express.Router();
const ShareCare = require('../models/ShareCare');

// POST /api/sharecare - Add a new post
router.post('/', async (req, res) => {
  try {
    const post = new ShareCare(req.body);
    await post.save();
    res.status(201).json({ message: 'Post created successfully' });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Server error while creating post' });
  }
});

// GET /api/sharecare - Fetch grouped and filtered posts
router.get('/', async (req, res) => {
  try {
    const allPosts = await ShareCare.find();

    // Filter out expired posts (date+time in past)
    const now = new Date();

    const validPosts = allPosts.filter(post => {
      if (post.date && post.time) {
        const dateTime = new Date(post.date);
        const [hours, minutes] = post.time.split(':');
        dateTime.setHours(hours, minutes);
        return dateTime >= now;
      }
      return true; // keep posts without date/time
    });

    // Group posts by type
    const grouped = {
      pickup: [],
      drop: [],
      tuitions: [],
      tools: [],
      share: []
    };

    validPosts.forEach(post => {
      const type = post.type.toLowerCase();
      if (grouped[type]) {
        grouped[type].push(post);
      }
    });

    // Sort each group by date + time (if available)
    for (const type in grouped) {
      grouped[type].sort((a, b) => {
        const aDate = a.date ? new Date(`${a.date}T${a.time}`) : new Date(0);
        const bDate = b.date ? new Date(`${b.date}T${b.time}`) : new Date(0);
        return aDate - bDate;
      });
    }

    res.json(grouped);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Server error while fetching posts' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const EventInteraction = require('../models/eventInteraction');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET all event interactions
router.get('/', async (req, res) => {
  try {
    const interactions = await EventInteraction.find({});
    res.json(interactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

// Get interactions for an event
router.get('/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    let interaction = await EventInteraction.findOne({ eventId });

    // Initialize if not exists
    if (!interaction) {
      interaction = new EventInteraction({ eventId });
      await interaction.save();
    }

    res.json(interaction);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interaction' });
  }
});

// Like an event
router.post('/:eventId/like', async (req, res) => {
  const { eventId } = req.params;

  try {
    let interaction = await EventInteraction.findOneAndUpdate(
      { eventId },
      { $setOnInsert: { eventId } },
      { new: true, upsert: true }
    );

    interaction.likedBy = interaction.likedBy || [];

    if (interaction.likedBy.includes(req.user.username)) {
      interaction.likedBy = interaction.likedBy.filter(username => username !== req.user.username);
    } else {
      interaction.likedBy.push(req.user.username);
    }

    interaction.likes = interaction.likedBy.length;
    interaction = await interaction.save();

    res.json(interaction);
  } catch (err) {
    res.status(500).json({ error: 'Failed to like event' });
  }
});

// Comment on an event
router.post('/:eventId/comment', async (req, res) => {
  const { eventId } = req.params;
  const { comment } = req.body;

  if (!comment || comment.trim().length > 500) {
    return res.status(400).json({ error: 'A comment up to 500 characters is required' });
  }

  try {
    const interaction = await EventInteraction.findOneAndUpdate(
      { eventId },
      {
        $push: {
          comments: {
            username: req.user.username,
            comment: comment.trim(),
            timestamp: new Date(),
          },
        },
      },
      { new: true, upsert: true }
    );

    res.status(201).json(interaction);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.delete('/:eventId/comment/:commentId', async (req, res) => {
  const { eventId, commentId } = req.params;

  try {
    const interaction = await EventInteraction.findOne({ eventId });

    if (!interaction) {
      return res.status(404).json({ error: 'Interaction not found' });
    }

    const comment = interaction.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (!req.user.isAdmin && comment.username !== req.user.username) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    interaction.comments.pull({ _id: commentId });
    const updated = await interaction.save();

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;

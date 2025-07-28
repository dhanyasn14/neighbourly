const express = require('express');
const router = express.Router();
const EventInteraction = require('../models/eventinteraction');


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
    const interaction = await EventInteraction.findOneAndUpdate(
      { eventId },
      { $inc: { likes: 1 } },
      { new: true, upsert: true }
    );
    res.json({ likes: interaction.likes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to like event' });
  }
});

// Comment on an event
router.post('/:eventId/comment', async (req, res) => {
  const { eventId } = req.params;
  const { username, comment } = req.body;

  if (!username || !comment) {
    return res.status(400).json({ error: 'Username and comment required' });
  }

  try {
    const interaction = await EventInteraction.findOneAndUpdate(
      { eventId },
      {
        $push: {
          comments: {
            username,
            comment,
            timestamp: new Date(),
          },
        },
      },
      { new: true, upsert: true }
    );

    res.status(201).json(interaction.comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;

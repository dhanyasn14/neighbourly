const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Meeting = require('../models/Meeting');
const ShareCare = require('../models/ShareCare');

function getStartAndEnd(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in ms

    const todayIST = new Date(now.getTime() + istOffset);
    todayIST.setHours(0, 0, 0, 0);

    const { start: todayStart, end: todayEnd } = getStartAndEnd(todayIST);

    // Logging date ranges
    console.log("===== IST Date Ranges =====");
    console.log("Today Start:", todayStart.toISOString());
    console.log("Today End:", todayEnd.toISOString());

    // Fetching events, meetings, and share care posts for today only
    const eventsToday = await Event.find()
      .where('date').gte(todayStart)
      .where('date').lte(todayEnd);

    const meetingsToday = await Meeting.find()
      .where('date').gte(todayStart)
      .where('date').lte(todayEnd);

    const postsToday = await ShareCare.find()
      .where('date').gte(todayStart)
      .where('date').lte(todayEnd);

    // Log raw data for inspection

    res.json({
      today: {
        events: eventsToday,
        meetings: meetingsToday,
        posts: postsToday,
      }
    });
  } catch (err) {
    console.error('❌ Error fetching today data:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Meeting = require('../models/Meeting');
const Alert = require('../models/Alert');
const Broadcast = require('../models/Broadcast');
const Admin = require('../models/Admin');
const LocalUser = require('../models/LocalUser');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const { escapeHtml, getResidentEmailList, sendMail } = require('../utils/mailer');

router.use(requireAuth);

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

const allParticipantLabels = new Set([
  'all',
  'all residents',
  'all users',
  'everyone',
  'community',
  'residents',
]);

async function getKnownUsernames() {
  const [admins, locals] = await Promise.all([
    Admin.find({}, 'username').lean(),
    LocalUser.find({}, 'username').lean(),
  ]);

  return new Set([...admins, ...locals].map(user => String(user.username || '').trim().toLowerCase()).filter(Boolean));
}

function eventTargetsEveryone(event, knownUsernames) {
  const participants = Array.isArray(event.participants)
    ? event.participants.map(item => String(item || '').trim()).filter(Boolean)
    : [];

  if (!participants.length) {
    return true;
  }

  const loweredParticipants = participants.map(item => item.toLowerCase());
  if (loweredParticipants.some(item => allParticipantLabels.has(item))) {
    return true;
  }

  return !participants.every(participant => knownUsernames.has(participant.toLowerCase()));
}

function eventVisibleToUser(event, user, knownUsernames) {
  if (user.isAdmin || eventTargetsEveryone(event, knownUsernames)) {
    return true;
  }

  const username = String(user.username || '').trim().toLowerCase();
  return (event.participants || []).some(participant => String(participant || '').trim().toLowerCase() === username);
}

async function sendMassWarningEmail(alert) {
  const recipients = await getResidentEmailList();

  if (!recipients.length) {
    return { enabled: false, sent: false, recipients: 0, message: 'No resident email addresses are available.' };
  }

  return sendMail({
    bcc: recipients,
    subject: `[Neighborly ${alert.severity.toUpperCase()}] ${alert.title}`,
    text: `${alert.title}\n\n${alert.message}\n\nCategory: ${alert.category}\nSeverity: ${alert.severity}`,
    html: `
      <h2>${escapeHtml(alert.title)}</h2>
      <p>${escapeHtml(alert.message)}</p>
      <p><strong>Category:</strong> ${escapeHtml(alert.category)}</p>
      <p><strong>Severity:</strong> ${escapeHtml(alert.severity)}</p>
    `,
  });
}

router.get('/', async (req, res) => {
  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const dayAfterTomorrowStart = addDays(todayStart, 2);
  const now = new Date();

  try {
    const [eventsToday, eventsTomorrow, meetingsToday, meetingsTomorrow, warnings, knownUsernames] = await Promise.all([
      Event.find({ date: { $gte: todayStart, $lt: tomorrowStart } }).sort({ time: 1, createdAt: -1 }).lean(),
      Event.find({ date: { $gte: tomorrowStart, $lt: dayAfterTomorrowStart } }).sort({ time: 1, createdAt: -1 }).lean(),
      Meeting.find({ date: { $gte: todayStart, $lt: tomorrowStart }, request: { $ne: 'Rejected' } }).sort({ date: 1 }).lean(),
      Meeting.find({ date: { $gte: tomorrowStart, $lt: dayAfterTomorrowStart }, request: { $ne: 'Rejected' } }).sort({ date: 1 }).lean(),
      Alert.find({
        status: 'active',
        startsAt: { $lte: now },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gte: now } },
        ],
      }).sort({ createdAt: -1 }).lean(),
      getKnownUsernames(),
    ]);
    const severityRank = { critical: 3, warning: 2, info: 1 };
    warnings.sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0));
    const visibleEventsToday = eventsToday.filter(event => eventVisibleToUser(event, req.user, knownUsernames));
    const visibleEventsTomorrow = eventsTomorrow.filter(event => eventVisibleToUser(event, req.user, knownUsernames));

    return res.json({
      generatedAt: now,
      events: {
        today: visibleEventsToday,
        tomorrow: visibleEventsTomorrow,
      },
      meetings: {
        today: meetingsToday,
        tomorrow: meetingsTomorrow,
      },
      warnings,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load alerts' });
  }
});

router.post('/warnings', requireAdmin, async (req, res) => {
  const {
    title,
    message,
    category = 'Community',
    severity = 'warning',
    startsAt,
    expiresAt,
    sendEmail = false,
  } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  try {
    const warning = await Alert.create({
      title: title.trim(),
      message: message.trim(),
      category,
      severity,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: req.user.username,
    });

    let email = { enabled: false, sent: false, recipients: 0, message: 'Email was not requested.' };

    if (sendEmail) {
      email = await sendMassWarningEmail(warning);
      warning.emailSent = email.sent;
      warning.emailRecipients = email.recipients;
      await warning.save();
    }

    const broadcast = await Broadcast.create({
      title: warning.title,
      message: warning.message,
      category: warning.category,
      severity: warning.severity,
      audience: 'all-residents',
      sendEmail: Boolean(sendEmail),
      startsAt: warning.startsAt,
      expiresAt: warning.expiresAt,
      status: warning.status,
      createdBy: req.user.username,
      alertId: warning._id,
      email: {
        enabled: Boolean(email.enabled),
        sent: Boolean(email.sent),
        recipients: Number(email.recipients || 0),
        message: email.message || 'Email was not requested.',
      },
    });

    return res.status(201).json({ warning, broadcast, email });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create warning alert' });
  }
});

router.patch('/warnings/:id/resolve', requireAdmin, async (req, res) => {
  try {
    const warning = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true }
    );

    if (!warning) {
      return res.status(404).json({ error: 'Warning not found' });
    }

    await Broadcast.updateMany(
      { alertId: warning._id },
      { status: 'resolved' }
    );

    return res.json(warning);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resolve warning' });
  }
});

module.exports = router;

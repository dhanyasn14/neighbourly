const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Account = require('../models/Account');
const Admin = require('../models/Admin');
const Alert = require('../models/Alert');
const Event = require('../models/Event');
const LocalUser = require('../models/LocalUser');
const Meeting = require('../models/Meeting');
const ShareCare = require('../models/ShareCare');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const { createResponse, parseJsonOutput } = require('../utils/openaiResponses');

router.use(requireAuth);

const allParticipantLabels = new Set([
  'all',
  'all residents',
  'all users',
  'everyone',
  'community',
  'residents',
]);

const stopWords = new Set([
  'about',
  'after',
  'alert',
  'alerts',
  'all',
  'and',
  'any',
  'are',
  'can',
  'community',
  'done',
  'event',
  'events',
  'for',
  'from',
  'give',
  'have',
  'help',
  'meeting',
  'meetings',
  'need',
  'neighborly',
  'next',
  'show',
  'the',
  'this',
  'today',
  'tomorrow',
  'upcoming',
  'what',
  'when',
  'where',
  'which',
  'who',
  'with',
]);

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getQuestionTokens(question) {
  return String(question || '')
    .toLowerCase()
    .split(/[^a-z0-9@.]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3 && !stopWords.has(token))
    .slice(0, 8);
}

function tokenSearch(fields, tokens) {
  if (!tokens.length) {
    return {};
  }

  return {
    $or: tokens.flatMap(token => fields.map(field => ({
      [field]: { $regex: escapeRegex(token), $options: 'i' },
    }))),
  };
}

function compactDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
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

async function getKnownUsernames() {
  const [admins, locals] = await Promise.all([
    Admin.find({}, 'username').lean(),
    LocalUser.find({}, 'username').lean(),
  ]);

  return new Set([...admins, ...locals].map(user => String(user.username || '').trim().toLowerCase()).filter(Boolean));
}

function serializeResident(user, type) {
  return {
    collection: type,
    recordId: user.username,
    name: user.name,
    username: user.username,
    role: user.role,
    house: user.address?.houseNumber || '',
    area: user.address?.areaName || '',
    profession: user.bio?.profession || '',
    businessName: user.bio?.businessName || '',
    businessLocation: user.bio?.businessLocation || '',
    helpOffer: user.bio?.helpOffer || '',
  };
}

function serializeMeeting(meeting) {
  return {
    collection: 'meetings',
    recordId: meeting.meetingId,
    meetingId: meeting.meetingId,
    parentMeetingId: meeting.parentMeetingId || '',
    purpose: meeting.purpose,
    owner: meeting.username,
    date: compactDate(meeting.date),
    time: meeting.time || '',
    mode: meeting.meetingMode,
    requestStatus: meeting.request,
    notesCount: meeting.notes?.length || 0,
    latestNotes: (meeting.notes || []).slice(-3).map(note => ({
      username: note.username,
      note: note.note,
      createdAt: compactDate(note.createdAt),
    })),
  };
}

function serializeEvent(event) {
  return {
    collection: 'events',
    recordId: event.eventId,
    eventId: event.eventId,
    title: event.title || event.purpose,
    purpose: event.purpose,
    info: event.info || '',
    location: event.location,
    date: compactDate(event.date),
    time: event.time,
    organizer: event.username,
    participants: event.participants || [],
  };
}

function serializeShareCare(post) {
  return {
    collection: 'sharecare',
    recordId: String(post._id),
    type: post.type,
    title: post.title,
    details: post.details,
    status: post.status,
    username: post.username,
    contact: post.contact,
    tuition: post.tuition || {},
    carpool: post.carpool || {},
    resource: post.resource || {},
    commentsCount: post.comments?.length || 0,
  };
}

function serializeAlert(alert) {
  return {
    collection: 'alerts',
    recordId: String(alert._id),
    title: alert.title,
    message: alert.message,
    category: alert.category,
    severity: alert.severity,
    startsAt: alert.startsAt,
    expiresAt: alert.expiresAt || '',
    createdBy: alert.createdBy,
  };
}

function serializeAccount(account) {
  return {
    collection: 'accounts',
    recordId: String(account._id),
    transactionDate: compactDate(account.transactionDate),
    type: account.type,
    amount: account.amount,
    username: account.username,
    meetingIds: account.meetingIds || [],
    eventIds: account.eventIds || [],
  };
}

async function buildCommunityContext(question, user) {
  const now = new Date();
  const tokens = getQuestionTokens(question);
  const residentQuery = tokenSearch([
    'username',
    'name',
    'address.houseNumber',
    'address.areaName',
    'bio.profession',
    'bio.businessName',
    'bio.businessLocation',
    'bio.helpOffer',
  ], tokens);
  const eventQuery = tokenSearch(['eventId', 'title', 'purpose', 'info', 'location', 'participants', 'username'], tokens);
  const meetingQuery = tokenSearch(['meetingId', 'purpose', 'username', 'request', 'notes.note'], tokens);
  const shareCareQuery = tokenSearch(['title', 'details', 'username', 'type', 'tuition.subject', 'carpool.pickupLocation', 'carpool.dropLocation', 'resource.itemName'], tokens);
  const asksAboutSelf = /\b(my|mine|me|i)\b/i.test(question);

  const activeWarningFilter = {
    status: 'active',
    startsAt: { $lte: now },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: now } },
    ],
  };

  const [knownUsernames, admins, residents, meetings, events, shareCarePosts, alerts, accounts, accountLeaders] = await Promise.all([
    getKnownUsernames(),
    Admin.find(residentQuery, 'username name role address bio').limit(5).lean(),
    LocalUser.find({
      isRemoved: { $ne: true },
      loginDisabled: { $ne: true },
      ...residentQuery,
    }, 'username name role address bio').limit(10).lean(),
    Meeting.find({
      date: { $gte: addDays(now, -45), $lte: addDays(now, 120) },
      ...(asksAboutSelf ? { username: user.username } : {}),
      ...meetingQuery,
    }).sort({ date: 1, time: 1, createdAt: -1 }).limit(14).lean(),
    Event.find({
      date: { $gte: addDays(now, -30), $lte: addDays(now, 180) },
      ...eventQuery,
    }).sort({ date: 1, time: 1, createdAt: -1 }).limit(18).lean(),
    ShareCare.find({
      ...shareCareQuery,
    }).sort({ status: 1, createdAt: -1 }).limit(12).lean(),
    Alert.find(activeWarningFilter).sort({ createdAt: -1 }).limit(8).lean(),
    Account.find({}).sort({ transactionDate: -1 }).limit(12).lean(),
    Account.aggregate([
      { $group: { _id: { username: '$username', type: '$type' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    generatedAt: now.toISOString(),
    currentUser: {
      username: user.username,
      userType: user.userType,
      isAdmin: user.isAdmin,
    },
    residents: [
      ...admins.map(admin => serializeResident(admin, 'admins')),
      ...residents.map(resident => serializeResident(resident, 'residents')),
    ],
    meetings: meetings.map(serializeMeeting),
    events: events
      .filter(event => eventVisibleToUser(event, user, knownUsernames))
      .slice(0, 12)
      .map(serializeEvent),
    shareCare: shareCarePosts.map(serializeShareCare),
    activeWarnings: alerts.map(serializeAlert),
    recentTransactions: accounts.map(serializeAccount),
    transactionLeaders: accountLeaders.map(item => ({
      username: item._id?.username || 'Unknown',
      type: item._id?.type || 'Unknown',
      total: item.total || 0,
      count: item.count || 0,
    })),
  };
}

const assistantSchema = {
  type: 'json_schema',
  name: 'neighborly_assistant_answer',
  schema: {
    type: 'object',
    properties: {
      answer: { type: 'string' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            collection: { type: 'string' },
            recordId: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['collection', 'recordId', 'label'],
          additionalProperties: false,
        },
      },
      suggestedActions: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['answer', 'confidence', 'sources', 'suggestedActions'],
    additionalProperties: false,
  },
  strict: true,
};

const meetingSummarySchema = {
  type: 'json_schema',
  name: 'meeting_summary',
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      decisions: { type: 'array', items: { type: 'string' } },
      actionItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            owner: { type: 'string' },
            dueDate: { type: 'string' },
          },
          required: ['task', 'owner', 'dueDate'],
          additionalProperties: false,
        },
      },
      followUpNeeded: { type: 'boolean' },
      suggestedNextMeetingPurpose: { type: 'string' },
      risks: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'decisions', 'actionItems', 'followUpNeeded', 'suggestedNextMeetingPurpose', 'risks'],
    additionalProperties: false,
  },
  strict: true,
};

const alertDraftSchema = {
  type: 'json_schema',
  name: 'alert_warning_draft',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      category: { type: 'string', enum: ['Weather', 'Security', 'Maintenance', 'Health', 'Community', 'Other'] },
      severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
      message: { type: 'string' },
      emailSubject: { type: 'string' },
      recommendedExpiryHours: { type: 'number' },
      reviewChecklist: { type: 'array', items: { type: 'string' } },
    },
    required: ['title', 'category', 'severity', 'message', 'emailSubject', 'recommendedExpiryHours', 'reviewChecklist'],
    additionalProperties: false,
  },
  strict: true,
};

function handleAiError(err, res) {
  if (err.code === 'OPENAI_NOT_CONFIGURED') {
    return res.status(503).json({ error: 'AI is not configured. Add OPENAI_API_KEY on the server.' });
  }

  return res.status(err.status || 500).json({ error: err.message || 'AI request failed' });
}

router.post('/assistant', async (req, res) => {
  const question = String(req.body.question || '').trim();

  if (!question || question.length > 500) {
    return res.status(400).json({ error: 'Question is required and must be under 500 characters.' });
  }

  try {
    const context = await buildCommunityContext(question, req.user);
    const result = await createResponse({
      instructions: [
        'You are Neighborly Community Assistant inside a private community web app.',
        'Answer only from the retrieved MongoDB context. If the context does not contain the answer, say you could not find it in Neighborly records.',
        'Do not invent residents, meetings, events, amounts, dates, phone numbers, or emails.',
        'Keep answers concise and useful. Mention dates, IDs, and statuses when available.',
        'Do not perform actions. Suggest where the user can go in the app if helpful.',
      ].join(' '),
      input: `Question: ${question}\n\nRetrieved Neighborly context:\n${JSON.stringify(context, null, 2)}`,
      textFormat: assistantSchema,
      maxOutputTokens: 900,
    });

    return res.json({
      ...parseJsonOutput(result.text),
      model: result.model,
    });
  } catch (err) {
    return handleAiError(err, res);
  }
});

router.post('/meetings/:id/summary', async (req, res) => {
  const id = String(req.params.id || '').trim();

  try {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { meetingId: id };
    const meeting = await Meeting.findOne(query).lean();

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const result = await createResponse({
      instructions: [
        'Summarize Neighborly meeting notes for residents.',
        'Use only the meeting details and notes provided.',
        'Return practical decisions, action items, risks, and whether a follow-up is needed.',
        'If notes are thin, say that clearly and use the meeting purpose as context.',
      ].join(' '),
      input: JSON.stringify({
        meeting: serializeMeeting(meeting),
        allNotes: (meeting.notes || []).map(note => ({
          username: note.username,
          note: note.note,
          createdAt: note.createdAt,
        })),
      }, null, 2),
      textFormat: meetingSummarySchema,
      maxOutputTokens: 800,
    });

    return res.json({
      meetingId: meeting.meetingId,
      ...parseJsonOutput(result.text),
      model: result.model,
    });
  } catch (err) {
    return handleAiError(err, res);
  }
});

router.post('/alerts/draft', requireAdmin, async (req, res) => {
  const roughMessage = String(req.body.roughMessage || req.body.message || '').trim();
  const title = String(req.body.title || '').trim();
  const category = String(req.body.category || 'Community').trim();
  const severity = String(req.body.severity || 'warning').trim();

  if (!roughMessage || roughMessage.length > 1200) {
    return res.status(400).json({ error: 'Message context is required and must be under 1200 characters.' });
  }

  try {
    const result = await createResponse({
      instructions: [
        'Draft a professional Neighborly community warning for an admin.',
        'The output is only a draft. The admin will review before publishing or emailing.',
        'Use clear, calm, specific language. Avoid panic and avoid claims not present in the input.',
        'Choose the category and severity from the allowed enum values.',
      ].join(' '),
      input: JSON.stringify({
        admin: req.user.username,
        currentDate: new Date().toISOString(),
        currentDraft: { title, category, severity, message: roughMessage },
      }, null, 2),
      textFormat: alertDraftSchema,
      maxOutputTokens: 700,
    });

    return res.json({
      ...parseJsonOutput(result.text),
      model: result.model,
    });
  } catch (err) {
    return handleAiError(err, res);
  }
});

module.exports = router;

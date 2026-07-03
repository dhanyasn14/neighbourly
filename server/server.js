//server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const path = require('path');
const { validateAuthConfig } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const forceHttps = process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false';
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');

validateAuthConfig();

// Middleware
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((req, res, next) => {
  const forwardedProtocol = req.get('x-forwarded-proto');

  if (forceHttps && forwardedProtocol && forwardedProtocol !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  }

  return next();
});
app.use(cors((req, callback) => {
  const origin = req.get('origin');
  const requestHost = req.get('host');
  let originHost = '';

  try {
    originHost = origin ? new URL(origin).host : '';
  } catch (err) {
    return callback(new Error('Not allowed by CORS'));
  }

  if (!origin || allowedOrigins.includes(origin) || (requestHost && originHost === requestHost)) {
    return callback(null, { origin: true });
  }

  return callback(new Error('Not allowed by CORS'));
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes);
const meetingRoutes = require('./routes/meetingRoutes');
app.use('/api/meetings', meetingRoutes);
const profileRoutes = require('./routes/profileRoutes');
app.use('/api/profile', profileRoutes);
const accountRoutes = require('./routes/accountRoutes');
// Use the route
app.use('/api/accounts', accountRoutes);

app.use('/api/events', require('./routes/events')); // 👈 Event route
app.use('/api/users', require('./routes/users'));   // 👈 Username autocomplete route

app.use('/api/event-interactions', require('./routes/eventInteractions'));
const adminRoutes = require('./routes/Space'); // Make sure this path is correct
app.use('/api/space', adminRoutes);

const shareCareRoutes = require('./routes/sharecare');
app.use('/api/sharecare', shareCareRoutes); // ✅ Connect the route

const commspaceRoutes = require('./routes/commspace');
app.use('/api/commspace', commspaceRoutes);

const alertRoutes = require('./routes/alerts');
app.use('/api/alerts', alertRoutes);

const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);
// const todayTomorrowRoutes = require('./routes/todaytomorrow');
// app.use('/api/todaytomorrow', todayTomorrowRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientBuildPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

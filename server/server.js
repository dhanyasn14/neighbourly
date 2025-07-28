//server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
const path = require('path');

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
// const todayTomorrowRoutes = require('./routes/todaytomorrow');
// app.use('/api/todaytomorrow', todayTomorrowRoutes);


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

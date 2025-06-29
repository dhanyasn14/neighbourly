const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = 5000;
const Meeting = require('./models/meeting');

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://dhanya_fsd:dhanya_fsd_2@neighborlycluster.lserfea.mongodb.net/neighborlyDB?retryWrites=true&w=majority&appName=NeighborlyCluster';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Load models
const { Admin, LocalUser, login, createAdminIfNotExists } = require('./models/user');
const UserInfo = require('./models/userInfo');

// Login Route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await login(username, password);
  if (result.status === "success") {
    res.json({ status: "success", type: result.type, username });
  } else {
    res.json({ status: "fail" });
  }
});

// Get Profile
app.get('/api/profile/:username', async (req, res) => {
  try {
    const user = await UserInfo.findOne({ username: req.params.username });
    res.json(user || {});
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Save or Update Profile
app.post('/api/profile', async (req, res) => {
  const { username, ...profileData } = req.body;
  try {
    const existing = await UserInfo.findOne({ username });
    if (existing) {
      await UserInfo.updateOne({ username }, profileData);
      res.json({ status: 'updated' });
    } else {
      await UserInfo.create({ username, ...profileData });
      res.json({ status: 'created' });
    }
  } catch (err) {
    console.error("❌ Error saving profile:", err);
    res.status(500).json({ status: 'error', message: 'Could not save profile' });
  }
});

// Admin Add Member
app.post('/api/admin/add-member', async (req, res) => {
  try {
    console.log("🛠️ Incoming data:", req.body);

    const {
      username, password,
      name, email, profession,
      houseNumber, address, ownershipStatus,
      residingFrom, contactInfo, additionalInfo
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({ status: 'error', message: 'Username and password are required' });
    }

    // Save login credentials
    await LocalUser.create({ username, password });

    // Save profile info
    const profile = {
      username,
      name,
      email,
      profession,
      houseNumber,
      address,
      ownershipStatus,
      residingFrom,
      contactInfo,
      additionalInfo
    };

    await UserInfo.create(profile);

    res.json({ status: 'success', message: 'Member added' });

  } catch (err) {
    console.error("❌ Error: Failed to add member\n", err);
    res.status(500).json({ status: 'error', message: 'Failed to add member', error: err.message });
  }
});
// Fetch all meet_ids
app.get('/api/meeting-ids', async (req, res) => {
  try {
    const ids = await Meeting.find().distinct("meet_id");
    res.json(ids);
  } catch (err) {
    console.error("❌ Error fetching meet_ids:", err);
    res.status(500).json({ error: "Failed to fetch meeting IDs" });
  }
});

// Submit meeting data
app.post('/api/set-meeting', async (req, res) => {
  try {
    const { meet_id, date, link, place, reason, reqStatus, username } = req.body;

    await Meeting.create({
      meet_id,
      date,
      link,
      place,
      reason,
      req: reqStatus,
      username
    });

    res.json({ status: 'success', message: 'Meeting recorded' });
  } catch (err) {
    console.error("❌ Error adding meeting:", err);
    res.status(500).json({ status: 'error', message: 'Failed to record meeting' });
  }
});
// Get all pending meetings
app.get('/api/admin/pending-meetings', async (req, res) => {
  try {
    const pendingMeetings = await Meeting.find({ req: "pending" });
    res.json(pendingMeetings);
  } catch (err) {
    console.error("❌ Failed to fetch pending meetings:", err);
    res.status(500).json({ status: 'error', message: 'Could not fetch meetings' });
  }
});

// Accept meeting (mark as done)
app.post('/api/admin/accept-meeting', async (req, res) => {
  try {
    const { _id } = req.body;
    await Meeting.updateOne({ _id }, { req: 'done' });
    res.json({ status: 'success', message: 'Meeting accepted' });
  } catch (err) {
    console.error('❌ Error accepting meeting:', err);
    res.status(500).json({ status: 'error', message: 'Failed to accept' });
  }
});

// Reject meeting (delete)
app.post('/api/admin/reject-meeting', async (req, res) => {
  try {
    const { _id } = req.body;
    await Meeting.deleteOne({ _id });
    res.json({ status: 'success', message: 'Meeting rejected' });
  } catch (err) {
    console.error('❌ Error rejecting meeting:', err);
    res.status(500).json({ status: 'error', message: 'Failed to reject' });
  }
});
app.get('/api/meetings/by-meet-id/:meet_id', async (req, res) => {
  try {
    const meetings = await Meeting.find({ meet_id: req.params.meet_id });
    res.json(meetings);
  } catch (err) {
    console.error("❌ Error fetching by meet_id:", err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});
// Get all meetings
app.get('/api/meetings', async (req, res) => {
  try {
    const meetings = await Meeting.find();
    res.json(meetings);
  } catch (err) {
    console.error("❌ Error fetching all meetings:", err);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

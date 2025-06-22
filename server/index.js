const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/user'); // our model

const app = express();
app.use(cors());
app.use(express.json()); // allows JSON body

// 1️⃣ Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://dhanya_fsd:dhanya_fsd_2@neighborlycluster.lserfea.mongodb.net/neighborlyDB?retryWrites=true&w=majority&appName=NeighborlyCluster')
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// 2️⃣ Sample route to test login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email, password });

    if (user) {
      res.json({ message: '✅ Login successful (MongoDB)' });
    } else {
      res.status(401).json({ message: '❌ Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ message: '⚠️ Server error', error: err });
  }
});

// 3️⃣ Start the server
app.listen(5000, () => {
  console.log('🚀 Server running on http://localhost:5000');
});

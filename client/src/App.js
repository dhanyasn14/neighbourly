import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminSpace from './pages/AdminSpace';
import Meeting from './pages/Meeting';
import Profile from './pages/Profile';
import Account from './pages/Account';
import Event from './pages/Event';
import ShareCare from './pages/ShareCare';
import Commspace from './pages/Commspace';



console.log("🔥 Backend server starting...");

const Dummy = ({ title }) => <h3 style={{ padding: '2rem' }}>{title} Page</h3>;
function App() {
  const [userType, setUserType] = useState(localStorage.getItem('userType'));

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setUserType={setUserType} />} />
        <Route path="/home" element={<Home userType={userType} />} />
        <Route path="/admin" element={<AdminSpace />} />
        <Route path="/meeting" element={<Meeting />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/accounts" element={<Account />} />
        <Route path="/events" element={<Event />} />
        <Route path="/sharecare" element={<ShareCare />} />
        <Route path="/commspace" element={<Commspace />} />


      </Routes>
    </Router>
  );
}

export default App;

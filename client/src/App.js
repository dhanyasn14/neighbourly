import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  Navigate // ✅ Added here
} from 'react-router-dom';

import Home from './Home';
import Meeting from './pages/Meeting';
import Events from './pages/Events';
import WellnessZone from './pages/WellnessZone';
import ShareCare from './pages/ShareCare';
import ComSpace from './pages/ComSpace';
import Accounts from './pages/Accounts';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import AdminSpace from './pages/AdminSpace';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.status === 'success') {
      localStorage.setItem('userType', data.type);
      localStorage.setItem('username', data.username);
      navigate('/home');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text" placeholder="Username"
          value={username} onChange={(e) => setUsername(e.target.value)} required
        /><br /><br />
        <input
          type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} required
        /><br /><br />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

function ProtectedAdminRoute({ children }) {
  const userType = localStorage.getItem('userType');
  return userType === 'admin' ? children : <Navigate to="/home" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/meeting" element={<Meeting />} />
        <Route path="/events" element={<Events />} />
        <Route path="/wellnesszone" element={<WellnessZone />} />
        <Route path="/sharecare" element={<ShareCare />} />
        <Route path="/comspace" element={<ComSpace />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/adminspace" element={
          <ProtectedAdminRoute>
            <AdminSpace />
          </ProtectedAdminRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;

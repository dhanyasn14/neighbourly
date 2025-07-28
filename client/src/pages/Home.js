//pages/Home.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
function Home({ userType }) {
  const navigate = useNavigate();

  const navItems = [
  { label: 'User Profile', path: '/profile', icon: 'fas fa-user' },
  { label: 'Meeting', path: '/meeting', icon: 'fas fa-handshake' },
  { label: 'Events', path: '/events', icon: 'fas fa-calendar-check' },
  { label: 'Comms Space', path: '/commspace', icon: 'fas fa-users' },
  { label: 'Share Care', path: '/sharecare', icon: 'fas fa-hands-helping' },
  { label: 'Wellness Zone', path: '/wellness', icon: 'fas fa-heart' },
  { label: 'Alerts', path: '/alerts', icon: 'fas fa-bell' },
  { label: 'Accounts', path: '/accounts', icon: 'fas fa-wallet' },
];
if (userType === 'admin') {
  navItems.push({ label: 'Admin Space', path: '/admin', icon: 'fas fa-user-shield' });
}


  const handleLogout = () => {
    localStorage.removeItem('userType');
    navigate('/');
  };

  return (
  <div className="home-container">
    <h2>Welcome, {userType === 'admin' ? 'Administrator' : 'User'}!</h2>
    <div className="welcome-note">🌟 Let’s make your community awesome today!</div>
    <button className="logout-button" onClick={handleLogout}>Logout</button>

    <div className="nav-grid">
      {navItems.map(item => (
        <div className="nav-card" key={item.path} onClick={() => navigate(item.path)}>
          <i className={item.icon}></i>
    <span>{item.label}</span>
        </div>
      ))}
    </div>
  </div>
);
}

export default Home;

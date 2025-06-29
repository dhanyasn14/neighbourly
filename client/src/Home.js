import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Home() {
  const userType = localStorage.getItem('userType');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome to Home Page</h1>
      <p>You are logged in as: <strong>{userType}</strong></p>

      <nav style={{ marginTop: '1rem' }}>
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          <li><Link to="/meeting">Meeting</Link></li>
          <li><Link to="/events">Events</Link></li>
          <li><Link to="/wellnesszone">Wellness Zone</Link></li>
          <li><Link to="/sharecare">Share Care</Link></li>
          <li><Link to="/comspace">Com Space</Link></li>
          <li><Link to="/accounts">Accounts</Link></li>
          <li><Link to="/alerts">Alerts</Link></li>
          <li><Link to="/profile">Profile</Link></li>
          {userType === 'admin' && <li><Link to="/adminspace">Admin Space</Link></li>}
        </ul>
      </nav>

      <button onClick={handleLogout} style={{ marginTop: '1rem' }}>Logout</button>
    </div>
  );
}

export default Home;

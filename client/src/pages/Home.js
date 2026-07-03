import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home({ userType }) {
  const navigate = useNavigate();
  const isAdmin = userType === 'admin';

  const navItems = [
    { label: 'Resident Directory', description: 'Find neighbors, professions, homes, and local businesses.', path: '/commspace', icon: 'fa-users' },
    { label: 'Meeting Requests', description: 'Schedule, track, and review community meeting requests.', path: '/meeting', icon: 'fa-handshake' },
    { label: 'Community Events', description: 'Create events, invite organizers, react, and discuss updates.', path: '/events', icon: 'fa-calendar-days' },
    { label: 'Alerts & Safety', description: 'See today, tomorrow, and high-priority community warnings.', path: '/alerts', icon: 'fa-bell' },
    { label: 'ShareCare Board', description: 'Coordinate rides, tools, tuitions, pickups, and shared help.', path: '/sharecare', icon: 'fa-hand-holding-heart' },
    { label: 'Transactions', description: 'Review donations, credits, debits, and community ledger entries.', path: '/accounts', icon: 'fa-wallet' },
    { label: 'My Profile', description: 'Keep contact details, address, bio, and password up to date.', path: '/profile', icon: 'fa-user-gear' },
  ];

  if (isAdmin) {
    navItems.unshift({ label: 'Admin Console', description: 'Add residents, update profiles, approve meetings, and record transactions.', path: '/admin', icon: 'fa-shield-halved' });
  }

  const stats = [
    { value: isAdmin ? 'Admin' : 'Resident', label: 'Access Level' },
    { value: 'Live', label: 'MongoDB-backed App' },
    { value: 'JWT', label: 'Protected Session' },
    { value: '24/7', label: 'Community Access' },
  ];

  return (
    <div className="home-container">
      <section className="home-hero">
        <div>
          <span className="eyebrow">Neighborhood Operations</span>
          <h1>{isAdmin ? 'Manage your community with confidence.' : 'Stay connected to your community.'}</h1>
          <p>
            Neighborly brings resident profiles, meetings, events, sharing requests, and community transactions into one organized portal.
          </p>
        </div>

        <div className="hero-panel">
          {stats.map(stat => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="nav-grid" aria-label="Primary workflows">
        {navItems.map(item => (
          <button className="nav-card" key={item.path} onClick={() => navigate(item.path)}>
            <i className={`fa-solid ${item.icon}`} aria-hidden="true"></i>
            <span>{item.label}</span>
            <small>{item.description}</small>
          </button>
        ))}
      </section>
    </div>
  );
}

export default Home;

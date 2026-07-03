import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch, clearSession, getToken } from '../services/api';
import './AppShell.css';

function AppShell({ children, userType, setUserType }) {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem('username');
  const isAdmin = userType === 'admin';
  const [alertCount, setAlertCount] = useState(0);

  const navItems = [
    { label: 'Dashboard', path: '/home', icon: 'fa-table-columns' },
    { label: 'Residents', path: '/commspace', icon: 'fa-users' },
    { label: 'Meetings', path: '/meeting', icon: 'fa-handshake' },
    { label: 'Events', path: '/events', icon: 'fa-calendar-days' },
    { label: 'Alerts', path: '/alerts', icon: 'fa-bell' },
    { label: 'ShareCare', path: '/sharecare', icon: 'fa-hand-holding-heart' },
    { label: 'Accounts', path: '/accounts', icon: 'fa-wallet' },
    { label: 'Profile', path: '/profile', icon: 'fa-user' },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Admin', path: '/admin', icon: 'fa-shield-halved' });
  }

  useEffect(() => {
    let isMounted = true;

    const fetchAlertCount = async () => {
      if (!getToken()) {
        if (isMounted) setAlertCount(0);
        return;
      }

      try {
        const res = await apiFetch('/alerts');
        if (!res.ok) return;

        const data = await res.json();
        const count =
          (data.warnings?.length || 0) +
          (data.events?.today?.length || 0) +
          (data.events?.tomorrow?.length || 0) +
          (data.meetings?.today?.length || 0) +
          (data.meetings?.tomorrow?.length || 0);

        if (isMounted) {
          setAlertCount(count);
        }
      } catch (err) {
        if (isMounted) {
          setAlertCount(0);
        }
      }
    };

    fetchAlertCount();
    const intervalId = window.setInterval(fetchAlertCount, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    clearSession();
    setUserType(null);
    navigate('/');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-zone">
          <div className="brand-mark" onClick={() => navigate('/home')}>
            <img className="brand-icon" src={`${process.env.PUBLIC_URL}/neighborly-icon.svg`} alt="" aria-hidden="true" />
            <span>
              <strong>Neighborly</strong>
              <small>Community Portal</small>
            </span>
          </div>
          <button
            type="button"
            className={location.pathname === '/ai' ? 'ai-shortcut active' : 'ai-shortcut'}
            onClick={() => navigate('/ai')}
            title="Community AI"
            aria-label="Community AI"
          >
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
            <span>AI</span>
          </button>
        </div>

        <nav className="app-nav" aria-label="Primary navigation">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'active' : ''}>
              <i className={`fa-solid ${item.icon}`} aria-hidden="true"></i>
              <span>{item.label}</span>
              {item.path === '/alerts' && alertCount > 0 && (
                <span className="alert-menu-dot" aria-label={`${alertCount} active alerts`}></span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="header-user">
          <span>{username}</span>
          <button type="button" onClick={handleLogout} title="Logout" aria-label="Logout">
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
          </button>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <span>Neighborly</span>
        <span>Resident-first coordination, safer access, clearer community operations.</span>
      </footer>
    </div>
  );
}

export default AppShell;

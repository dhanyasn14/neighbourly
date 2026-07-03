import React, { useState } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminSpace from './pages/AdminSpace';
import Meeting from './pages/Meeting';
import Profile from './pages/Profile';
import Account from './pages/Account';
import Event from './pages/Event';
import ShareCare from './pages/ShareCare';
import Commspace from './pages/Commspace';
import AppShell from './components/AppShell';
import Alerts from './pages/Alerts';

function ProtectedRoute({ children, adminOnly = false, userType, setUserType }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && userType !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return <AppShell userType={userType} setUserType={setUserType}>{children}</AppShell>;
}

function App() {
  const [userType, setUserType] = useState(localStorage.getItem('userType'));

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setUserType={setUserType} />} />
        <Route path="/home" element={<ProtectedRoute userType={userType} setUserType={setUserType}><Home userType={userType} /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute userType={userType} setUserType={setUserType} adminOnly><AdminSpace /></ProtectedRoute>} />
        <Route path="/meeting" element={<ProtectedRoute userType={userType} setUserType={setUserType}><Meeting /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute userType={userType} setUserType={setUserType}><Profile /></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute userType={userType} setUserType={setUserType}><Account /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute userType={userType} setUserType={setUserType}><Event /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute userType={userType} setUserType={setUserType}><Alerts /></ProtectedRoute>} />
        <Route path="/sharecare" element={<ProtectedRoute userType={userType} setUserType={setUserType}><ShareCare /></ProtectedRoute>} />
        <Route path="/commspace" element={<ProtectedRoute userType={userType} setUserType={setUserType}><Commspace /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={localStorage.getItem('token') ? '/home' : '/'} replace />} />


      </Routes>
    </Router>
  );
}

export default App;

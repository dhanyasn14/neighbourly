import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Import the CSS
import { apiFetch, setSession } from '../services/api';
import neighborImage from '../assets/neighborimage.png';

const sanitizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);

function Login({ setUserType }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [resetForm, setResetForm] = useState({
    usernameOrEmail: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [requestForm, setRequestForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
    message: '',
  });
  const [activePanel, setActivePanel] = useState('login');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const showPanel = (panel) => {
    setActivePanel(panel);
    setError('');
    setStatus('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setStatus('');

    try {
      const res = await apiFetch('/login', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Invalid credentials');

      const data = await res.json();

      setSession(data);
      setUserType(data.userType);
      
      navigate('/home');
    } catch (err) {
      setError(err.message);
    }
  };

  const requestOtp = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    const res = await apiFetch('/password-reset/request', {
      method: 'POST',
      body: { usernameOrEmail: resetForm.usernameOrEmail },
    });
    const data = await res.json();

    if (res.ok) {
      setStatus(data.mailConfigured
        ? data.message
        : 'Reset request received. Email is not configured on this server yet.');
      return;
    }

    setError(data.error || 'Unable to request reset OTP.');
  };

  const confirmReset = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    const res = await apiFetch('/password-reset/confirm', {
      method: 'POST',
      body: resetForm,
    });
    const data = await res.json();

    if (res.ok) {
      setStatus('Password reset. Sign in with the new password.');
      setResetForm({ usernameOrEmail: '', otp: '', newPassword: '', confirmPassword: '' });
      setActivePanel('login');
      return;
    }

    setError(data.error || 'Unable to reset password.');
  };

  const submitAccessRequest = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    const res = await apiFetch('/access-requests', {
      method: 'POST',
      body: requestForm,
    });
    const data = await res.json();

    if (res.ok) {
      setStatus('Request submitted. The administrator will review your details.');
      setRequestForm({ name: '', email: '', phoneNumber: '', address: '', message: '' });
      setActivePanel('login');
      return;
    }

    setError(data.error || 'Unable to submit access request.');
  };

  return (
    <div className="login-container">
      <div className="login-visual">
        <img src={neighborImage} alt="Neighborly community" />
      </div>

      <div className="login-box">
        <div className="login-brand">
          <img src={`${process.env.PUBLIC_URL}/neighborly-icon.svg`} alt="" aria-hidden="true" />
          <div>
            <h2>Neighborly</h2>
            <p className="login-phrase">Connected homes, stronger community.</p>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        {status && <div className="success-message">{status}</div>}

        {activePanel === 'login' && (
          <form onSubmit={handleSubmit}>
            <input name="username" type="text" placeholder="Username" onChange={handleChange} required />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
            <button type="submit">Login</button>
            <div className="login-secondary-actions">
              <button type="button" className="link-button" onClick={() => showPanel('forgot')}>Forgot password?</button>
              <button type="button" className="request-access-button" onClick={() => showPanel('request')}>Request access</button>
            </div>
          </form>
        )}

        {activePanel === 'forgot' && (
          <div className="login-stacked-forms">
            <form onSubmit={requestOtp}>
              <input
                type="text"
                placeholder="Username or email"
                value={resetForm.usernameOrEmail}
                onChange={e => setResetForm({ ...resetForm, usernameOrEmail: e.target.value })}
                required
              />
              <button type="submit">Send OTP</button>
            </form>
            <form onSubmit={confirmReset}>
              <input
                type="text"
                inputMode="numeric"
                maxLength="6"
                placeholder="6-digit OTP"
                value={resetForm.otp}
                onChange={e => setResetForm({ ...resetForm, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                required
              />
              <input
                type="password"
                minLength="8"
                placeholder="New password"
                value={resetForm.newPassword}
                onChange={e => setResetForm({ ...resetForm, newPassword: e.target.value })}
                required
              />
              <input
                type="password"
                minLength="8"
                placeholder="Confirm new password"
                value={resetForm.confirmPassword}
                onChange={e => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                required
              />
              <button type="submit">Reset Password</button>
              <button type="button" className="link-button" onClick={() => showPanel('login')}>Back to sign in</button>
            </form>
          </div>
        )}

        {activePanel === 'request' && (
          <form onSubmit={submitAccessRequest}>
            <input
              type="text"
              placeholder="Full name"
              value={requestForm.name}
              onChange={e => setRequestForm({ ...requestForm, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={requestForm.email}
              onChange={e => setRequestForm({ ...requestForm, email: e.target.value })}
              required
            />
            <input
              type="text"
              inputMode="numeric"
              maxLength="10"
              pattern="[0-9]{10}"
              title="Phone number must be exactly 10 digits."
              placeholder="10-digit phone number"
              value={requestForm.phoneNumber}
              onChange={e => setRequestForm({ ...requestForm, phoneNumber: sanitizePhone(e.target.value) })}
              required
            />
            <textarea
              placeholder="House number, block, street, area"
              value={requestForm.address}
              onChange={e => setRequestForm({ ...requestForm, address: e.target.value })}
              required
            />
            <textarea
              placeholder="Message to admin"
              value={requestForm.message}
              onChange={e => setRequestForm({ ...requestForm, message: e.target.value })}
            />
            <button type="submit">Send Request</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;

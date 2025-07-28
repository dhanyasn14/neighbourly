import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Import the CSS

function Login({ setUserType }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Invalid credentials');

      const data = await res.json();

      localStorage.setItem('userType', data.userType);
      localStorage.setItem('username', data.username);
      setUserType(data.userType);
      
      navigate('/home');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Welcome Back!</h2>
        <div className="fun-phrase">✨ Let's get you connected to your community ✨</div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input name="username" type="text" placeholder="Username" onChange={handleChange} required />
          <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}

export default Login;

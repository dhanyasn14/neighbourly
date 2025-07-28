// File: src/pages/Profile.js

import React, { useState, useEffect } from 'react';
import './Profile.css'
function Profile() {
  const username = localStorage.getItem('username');
  const userType = localStorage.getItem('userType'); // 'admin' or 'user'

  const [userData, setUserData] = useState(null);
  const [bio, setBio] = useState({
    profession: '',
    about: '',
    businessName: '',
    businessLocation: '',
    helpOffer: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:5000/api/profile/${userType}/${username}`)
      .then(res => res.json())
      .then(data => {
        setUserData(data);
        if (data.bio) setBio(data.bio); // bio might not exist yet
      });
  }, [username, userType]);

  const handleChange = e => {
    setBio({ ...bio, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const res = await fetch(`http://localhost:5000/api/profile/${userType}/${username}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio }),
    });
    if (res.ok) {
      alert("Bio updated!");
      setIsEditing(false);
    }
  };

  if (!userData) return <p>Loading...</p>;

  return (
    <div  className="profile-container">
      <h2>My Profile</h2>
      <div className="profile-info">
      <p><strong>Name:</strong> {userData.name}</p>
      <p><strong>Email:</strong> {userData.email}</p>
      <p><strong>Phone:</strong> {userData.phoneNumber}</p>
      <p>
        <strong>Address:</strong> {
            userData.address && Object.values(userData.address).filter(Boolean).join(', ')
        }
      </p>
      </div>

      <hr />
      <h3>About Me</h3>
      {isEditing ? (
        <div   className="profile-bio">
          <input name="profession" placeholder="Profession" value={bio.profession} onChange={handleChange} /><br />
          <textarea name="about" placeholder="What do you do?" value={bio.about} onChange={handleChange} /><br />
          <input name="businessName" placeholder="Business Name" value={bio.businessName} onChange={handleChange} /><br />
          <input name="businessLocation" placeholder="Business Location" value={bio.businessLocation} onChange={handleChange} /><br />
          <textarea name="helpOffer" placeholder="How can you help the neighborhood?" value={bio.helpOffer} onChange={handleChange} /><br />
          <button onClick={handleSubmit}>Submit</button>
        </div>
      ) : (
        <div>
          <p><strong>Profession:</strong> {bio.profession}</p>
          <p><strong>Business:</strong> {bio.business} ({bio.location})</p>
          <p><strong>Offers Help:</strong> {bio.help}</p>
          <button onClick={() => setIsEditing(true)}>Edit</button>
        </div>
      )}
    </div>
  );
}

export default Profile;

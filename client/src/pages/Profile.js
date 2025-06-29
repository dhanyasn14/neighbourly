import React, { useEffect, useState } from 'react';

function Profile() {
  const username = localStorage.getItem('username');
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    fetch(`http://localhost:5000/api/profile/${username}`)
      .then(res => res.json())
      .then(data => {
        setProfile(data && Object.keys(data).length > 0 ? data : null);
        setFormData(data || {});
        setLoading(false);
      })
      .catch(err => {
        console.error("❌ Failed to fetch profile:", err);
        setLoading(false);
      });
  }, [username]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async () => {
    try {
      await fetch('http://localhost:5000/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, ...formData })
      });

      // Re-fetch updated profile
      const updated = await fetch(`http://localhost:5000/api/profile/${username}`);
      const updatedData = await updated.json();
      setProfile(updatedData);
      setFormData(updatedData);
      setEditMode(false);
    } catch (err) {
      console.error("❌ Failed to update profile:", err);
    }
  };

  const renderField = (label, key, type = "text", editable = false) => (
    <div style={{ marginBottom: '10px' }}>
      <strong>{label}:</strong>{' '}
      {editMode && editable ? (
        <input
          type={type}
          name={key}
          value={formData[key] || ''}
          onChange={handleChange}
        />
      ) : profile?.[key] ? (
        profile[key]
      ) : (
        <em>Add info</em>
      )}
    </div>
  );

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  if (!profile && !editMode)
    return (
      <div style={{ padding: '2rem' }}>
        <h2>User Profile</h2>
        <p style={{ color: 'red' }}>No information found. Please contact admin to add your profile info.</p>
      </div>
    );

  return (
    <div style={{ padding: '2rem' }}>
      <h2>User Profile</h2>

      {renderField("Name", "name")}
      {renderField("Email", "email", "email", true)}
      {renderField("Profession", "profession")}
      {renderField("House Number", "houseNumber")}
      {renderField("Address", "address")}
      {renderField("Owner/Renter", "ownershipStatus")}
      {renderField("Residing From", "residingFrom", "date")}
      {renderField("Contact Info", "contactInfo", "text", true)}
      {renderField("Additional Info", "additionalInfo")}

      <br />
      {editMode ? (
        <>
          <button onClick={handleSubmit}>Save</button>{' '}
          <button onClick={() => setEditMode(false)}>Cancel</button>
        </>
      ) : (
        <button onClick={() => setEditMode(true)}>
          Edit Contact & Email
        </button>
      )}
    </div>
  );
}

export default Profile;

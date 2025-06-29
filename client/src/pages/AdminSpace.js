import React, { useState, useEffect } from 'react';

function AdminSpace() {
  const [showForm, setShowForm] = useState(false);
  const [pendingMeetings, setPendingMeetings] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    profession: '',
    houseNumber: '',
    address: '',
    ownershipStatus: '',
    residingFrom: '',
    contactInfo: '',
    additionalInfo: '',
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/admin/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMessage('✅ Member added successfully.');
        setFormData({
          username: '',
          password: '',
          name: '',
          email: '',
          profession: '',
          houseNumber: '',
          address: '',
          ownershipStatus: '',
          residingFrom: '',
          contactInfo: '',
          additionalInfo: '',
        });
        setShowForm(false);
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      setMessage('❌ Network error. Could not submit.');
    }
  };

  const fetchPendingMeetings = () => {
    fetch('http://localhost:5000/api/admin/pending-meetings')
      .then(res => res.json())
      .then(data => {
        console.log("✅ Received meetings:", data);
        setPendingMeetings(data || []);
      })
      .catch(err => console.error('❌ Error fetching meetings:', err));
  };

  useEffect(() => {
    fetchPendingMeetings();
  }, []);

  const handleAccept = async (id) => {
    await fetch('http://localhost:5000/api/admin/accept-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id }),
    });
    fetchPendingMeetings();
  };

  const handleReject = async (id) => {
    await fetch('http://localhost:5000/api/admin/reject-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id }),
    });
    fetchPendingMeetings();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Admin Space</h2>
      
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? 'Cancel' : 'Add Members'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          {[
            { label: 'Username', name: 'username' },
            { label: 'Password', name: 'password', type: 'password' },
            { label: 'Name', name: 'name' },
            { label: 'Email', name: 'email', type: 'email' },
            { label: 'Profession', name: 'profession' },
            { label: 'House Number', name: 'houseNumber' },
            { label: 'Address', name: 'address' },
            { label: 'Owner/Renter', name: 'ownershipStatus' },
            { label: 'Residing From', name: 'residingFrom', type: 'date' },
            { label: 'Contact Info', name: 'contactInfo' },
            { label: 'Additional Info', name: 'additionalInfo' },
          ].map(({ label, name, type = 'text' }) => (
            <div key={name} style={{ marginBottom: '10px' }}>
              <label>{label}: </label>
              <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                required={name !== 'additionalInfo'}
              />
            </div>
          ))}
          <button type="submit">Submit</button>
        </form>
      )}

      {message && <p style={{ marginTop: '20px', color: 'green' }}>{message}</p>}

      <hr style={{ margin: '2rem 0' }} />

      <h3>Pending Meeting Requests</h3>
      {pendingMeetings.length === 0 ? (
        <p>No pending meetings.</p>
      ) : (
        pendingMeetings.map(meeting => (
          <div key={meeting._id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
            <p><strong>Meeting ID:</strong> {meeting.meet_id}</p>
            <p><strong>Date:</strong> {meeting.date}</p>
            <p><strong>Place:</strong> {meeting.place}</p>
            <p><strong>Link:</strong> <a href={meeting.link} target="_blank" rel="noreferrer">{meeting.link}</a></p>
            <p><strong>Reason:</strong> {meeting.reason}</p>
            <p><strong>Requested By:</strong> {meeting.username}</p>
            <div style={{ marginTop: '10px' }}>
              <button onClick={() => handleAccept(meeting._id)}>Accept</button>{' '}
              <button onClick={() => handleReject(meeting._id)}>Reject</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default AdminSpace;

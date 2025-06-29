import React, { useState, useEffect } from 'react';

function Meeting() {
  const username = localStorage.getItem('username');
  const userType = localStorage.getItem('userType');

  const [formData, setFormData] = useState({
    meet_id: '',
    date: '',
    link: '',
    place: '',
    reason: '',
    reqStatus: userType === 'admin' ? 'done' : 'pending',
  });
  const [meetIds, setMeetIds] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [completedMeetings, setCompletedMeetings] = useState([]);
  const [selectedMeetings, setSelectedMeetings] = useState([]);

  useEffect(() => {
    fetchMeetIds();
    fetchMeetings();
  }, []);

  const fetchMeetIds = async () => {
    const res = await fetch('http://localhost:5000/api/meeting-ids');
    const ids = await res.json();
    setMeetIds(ids);
  };

  const fetchMeetings = async () => {
    const res = await fetch('http://localhost:5000/api/meetings');
;
    const meetings = await res.json();

    const today = new Date();
    setUpcomingMeetings(meetings.filter(m => new Date(m.date) > today));
    setCompletedMeetings(meetings.filter(m => new Date(m.date) <= today));
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, username, reqStatus: userType === 'admin' ? 'done' : 'pending' };

    const res = await fetch('http://localhost:5000/api/set-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.status === 'success') {
      alert('Meeting saved');
      fetchMeetings();
      setFormData({ meet_id: '', date: '', link: '', place: '', reason: '', reqStatus: '' });
    }
  };

  const handleTagClick = async (meet_id) => {
    const res = await fetch(`http://localhost:5000/api/meetings/by-meet-id/${meet_id}`);
    const meetings = await res.json();
    setSelectedMeetings(meetings);
  };

  const renderMeetingList = (meetings) => (
    <ul>
      {meetings.map((meeting, idx) => (
        <li key={idx}>
          <strong onClick={() => handleTagClick(meeting.meet_id)} style={{ color: 'blue', cursor: 'pointer' }}>
            {meeting.meet_id}
          </strong>
          {' | '}{meeting.date}{' | '}{meeting.place}{' | '}{meeting.reason}
        </li>
      ))}
    </ul>
  );

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Set Meeting</h2>
      <form onSubmit={handleSubmit}>
        <label>Meeting ID: </label>
        <select name="meet_id" value={formData.meet_id} onChange={handleChange} required>
          <option value="">--Select or Enter New--</option>
          {meetIds.map(id => <option key={id} value={id}>{id}</option>)}
        </select>
        <input
          type="text"
          name="meet_id"
          placeholder="Or Enter New ID"
          value={formData.meet_id}
          onChange={handleChange}
        /><br /><br />
        <input type="date" name="date" value={formData.date} onChange={handleChange} required /><br />
        <input type="text" name="link" placeholder="Link" value={formData.link} onChange={handleChange} required /><br />
        <input type="text" name="place" placeholder="Place" value={formData.place} onChange={handleChange} required /><br />
        <input type="text" name="reason" placeholder="Reason" value={formData.reason} onChange={handleChange} required /><br />
        <button type="submit">Submit</button>
      </form>

      <hr />

      <h2>Upcoming Meetings</h2>
      {renderMeetingList(upcomingMeetings)}

      <h2>Completed Meetings</h2>
      {renderMeetingList(completedMeetings)}

      {selectedMeetings.length > 0 && (
        <>
          <h3>Meetings with ID: {selectedMeetings[0].meet_id}</h3>
          <ul>
            {selectedMeetings.map((m, i) => (
              <li key={i}>
                {m.date} | {m.place} | {m.reason} | Requested By: {m.username}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default Meeting;

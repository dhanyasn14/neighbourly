// File: src/pages/Meeting.js

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import './Meeting.css'
function Meeting() {
  const [formData, setFormData] = useState({ date: '', purpose: '', meetingId: '' });
  const [suggestions, setSuggestions] = useState([]);
  const [completedMeetings, setCompletedMeetings] = useState([]);
  const [myMeetings, setMyMeetings] = useState([]);
  const username = localStorage.getItem('username');
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
  fetchCompletedMeetings();
  fetchUpcomingMeetings(); // 👈 Add this
  fetchMyMeetings();
}, []);

  const fetchUpcomingMeetings = async () => {
  const res = await fetch("http://localhost:5000/api/meetings/upcoming");
  const data = await res.json();
  setUpcomingMeetings(data);
};


  const fetchCompletedMeetings = async () => {
    const res = await fetch("http://localhost:5000/api/meetings/completed");
    const data = await res.json();
    setCompletedMeetings(data);
  };

  const fetchMyMeetings = async () => {
    const res = await fetch(`http://localhost:5000/api/meetings/user/${username}`);
    const data = await res.json();
    setMyMeetings(data);
  };

  const handleMeetingIdChange = async (e) => {
    const value = e.target.value;
    setFormData({ ...formData, meetingId: value });

    if (value.length > 0) {
      const res = await fetch(`http://localhost:5000/api/meetings/search?q=${value}`);
      const data = await res.json();
      setSuggestions(data);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (id) => {
    setFormData({ ...formData, meetingId: id });
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      ...formData,
      username,
      request: 'Pending',
    };
    const res = await fetch("http://localhost:5000/api/meetings", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      alert("Meeting scheduled");
      setFormData({ date: '', purpose: '', meetingId: '' });
      fetchMyMeetings();
    }
  };

 return (
  <div className="meeting-wrapper">
    <h2 className="main-title">📅 Schedule a Meeting</h2>

    <div className="meeting-flex">
      <form className="meeting-form" onSubmit={handleSubmit}>
        <label>Date</label>
        <input
          type="date"
          min={today}
          value={formData.date}
          onChange={e => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <label>Purpose</label>
        <input
          type="text"
          placeholder="Purpose"
          value={formData.purpose}
          onChange={e => setFormData({ ...formData, purpose: e.target.value })}
          required
        />

        <label>Meeting ID</label>
        <input
          type="text"
          placeholder="Meeting ID"
          value={formData.meetingId}
          onChange={handleMeetingIdChange}
          required
        />
        {suggestions.length > 0 && (
          <ul className="suggestion-list">
            {suggestions.map((s, idx) => (
              <li key={idx} onClick={() => handleSelectSuggestion(s)}>
                {s}
              </li>
            ))}
          </ul>
        )}
        <button type="submit">Submit</button>
      </form>

      <div className="meeting-cards">
        <div className="card">
          <h3>✅ Completed</h3>
          <ul>
            {completedMeetings.map((m, i) => (
              <li key={i}>
                {m.meetingId} - {m.purpose} ({format(new Date(m.date), 'yyyy-MM-dd')})
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>🧾 My Meetings</h3>
          <ul>
            {myMeetings.map((m, i) => (
              <li key={i}>
                {m.meetingId} - {m.purpose} - {format(new Date(m.date), 'yyyy-MM-dd')} - {m.request}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>📌 Upcoming</h3>
          <ul>
            {upcomingMeetings.map((m, i) => (
              <li key={i}>
                {m.meetingId} - {m.purpose} - {format(new Date(m.date), 'yyyy-MM-dd')} - {m.request}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </div>
);


}

export default Meeting;

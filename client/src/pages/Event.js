import React, { useState, useEffect } from 'react';
import './Event.css'
const username = localStorage.getItem('username');

function Event() {
  const [formData, setFormData] = useState({
    date: '',
    purpose: '',
    location: '',
    time: '',
    eventId: '',
    participants: '',
    organizerInput: '',
    organizer: [],
  });

  const [events, setEvents] = useState([]);
  const [organizerSuggestions, setOrganizerSuggestions] = useState([]);
  const [interactions, setInteractions] = useState({});
  const today = new Date().toISOString().split("T")[0];
const fetchAllInteractions = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/eventinteractions');
    const data = await res.json();
    
    // Convert array to object for easy lookup
    const map = {};
    data.forEach((item) => {
      map[item.eventId] = item;
    });

    setInteractions(map);
  } catch (err) {
    console.error('Failed to load interactions', err);
  }
};


useEffect(() => {
  fetchEvents(); // load events
  fetchAllInteractions(); // load all interactions from DB
}, []);


  const fetchEvents = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/events');
      const data = await res.json();
      const othersEvents = data.filter(e => e.username !== username);
      setEvents(othersEvents);
      fetchInteractions(othersEvents.map(e => e.eventId));
    } catch (err) {
      console.error('Error fetching events', err);
    }
  };

  const fetchInteractions = async (eventIds) => {
    try {
      const res = await fetch('http://localhost:5000/api/eventinteractions');
      const data = await res.json();

      const mapped = {};
      eventIds.forEach(id => {
        const record = data.find(d => d.eventId === id);
        if (record) {
          mapped[id] = record;
        } else {
          mapped[id] = { comments: [], likes: 0 };
        }
      });
      setInteractions(mapped);
    } catch (err) {
      console.error('Error fetching interactions', err);
    }
  };

  const handleOrganizerInput = async (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, organizerInput: value }));

    if (value.length > 0) {
      const res = await fetch(`http://localhost:5000/api/users/all-usernames?q=${value}`);
      const data = await res.json();
      setOrganizerSuggestions(data);
    } else {
      setOrganizerSuggestions([]);
    }
  };

  const selectOrganizer = (name) => {
    if (!formData.organizer.includes(name)) {
      setFormData(prev => ({
        ...prev,
        organizer: [...prev.organizer, name],
        organizerInput: ''
      }));
    }
    setOrganizerSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      ...formData,
      participants: formData.participants.split(',').map(p => p.trim()),
      username,
    };

    const res = await fetch("http://localhost:5000/api/events", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      alert("Event created!");
      setFormData({
        date: '',
        purpose: '',
        location: '',
        time: '',
        eventId: '',
        participants: '',
        organizerInput: '',
        organizer: [],
      });
      fetchEvents();
    }
  };


  const fetchInteractionForEvent = async (eventId) => {
  try {
    const res = await fetch(`http://localhost:5000/api/event-interactions/${eventId}`);
    const data = await res.json();
    setInteractions(prev => ({
      ...prev,
      [eventId]: data,
    }));
  } catch (err) {
    console.error('Error fetching interaction', err);
  }
};

  const handleLike = async (eventId) => {
    await fetch(`http://localhost:5000/api/event-interactions/${eventId}/like`, {
      method: 'POST',
    });
    fetchInteractionForEvent(eventId);

  };

  const handleComment = async (eventId, commentText) => {
    if (!commentText) return;
    await fetch(`http://localhost:5000/api/event-interactions/${eventId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: commentText, username }),
    });
    fetchInteractionForEvent(eventId); // instead of fetchEvents()

  };

return (
  <div className="event-page">
    <div className="create-event">
      <h2>Create Event</h2>
      <form onSubmit={handleSubmit}>
        <input type="date" min={today} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
        <input type="text" placeholder="Purpose" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })} required />
        <input type="text" placeholder="Location" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
        <input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} required />
        <input type="text" placeholder="Event ID" value={formData.eventId} onChange={e => setFormData({ ...formData, eventId: e.target.value })} required />
        <input type="text" placeholder="Participants (comma-separated)" value={formData.participants} onChange={e => setFormData({ ...formData, participants: e.target.value })} />

        <input type="text" placeholder="Add Organizer" value={formData.organizerInput} onChange={handleOrganizerInput} />
        {organizerSuggestions.length > 0 && (
          <ul className="organizer-suggestions">
            {organizerSuggestions.map((name, idx) => (
              <li key={idx} onClick={() => selectOrganizer(name)}>{name}</li>
            ))}
          </ul>
        )}
        <div><strong>Organizers:</strong> {formData.organizer.join(', ')}</div>
        <button type="submit">Create</button>
      </form>
    </div>

    <div className="events-list">
      <h2>Events by Others</h2>
      {events.map((ev, idx) => (
        <div className="event-card" key={idx}>
          <div className="event-meta">
            <div><strong>ID:</strong> {ev.eventId}</div>
            <div><strong>Purpose:</strong> {ev.purpose}</div>
            <div><strong>Date:</strong> {ev.date?.split('T')[0]}</div>
            <div><strong>Time:</strong> {ev.time}</div>
            <div><strong>Location:</strong> {ev.location}</div>
          </div>
          <div className="event-meta">
            <div><strong>Organizers:</strong> {ev.organizer.join(', ')}</div>
            <div><strong>Participants:</strong> {ev.participants.join(', ')}</div>
          </div>
          <div className="event-interactions">
            <button onClick={() => handleLike(ev.eventId)}>❤️ Like</button>
            <span>{interactions[ev.eventId]?.likes || 0} likes</span>

            <details>
              <summary>💬 Comments ({interactions[ev.eventId]?.comments?.length || 0})</summary>
              <ul>
                {interactions[ev.eventId]?.comments?.map((c, i) => (
                  <li key={i}>
                    <a href={`/user/${c.username}`}>{c.username}</a>: {c.comment}
                  </li>
                ))}
              </ul>
              <input
                type="text"
                placeholder="Add comment..."
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleComment(ev.eventId, e.target.value);
                    e.target.value = '';
                  }
                }}
              />
            </details>
          </div>
        </div>
      ))}
    </div>
  </div>
);

}

export default Event;

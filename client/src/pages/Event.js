import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Event.css';
import { apiFetch } from '../services/api';
import PageNav from '../components/PageNav';
import Toast from '../components/Toast';

const emptyEventForm = {
  date: '',
  title: '',
  info: '',
  location: '',
  time: '',
  eventId: '',
  participants: '',
};

function localDateKey(date = new Date()) {
  const value = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return value.toISOString().slice(0, 10);
}

function normalizeEventDate(dateValue) {
  if (!dateValue) return '';
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? String(dateValue).slice(0, 10) : localDateKey(parsed);
}

function getEventDateTime(event) {
  const dateKey = normalizeEventDate(event.date);
  return dateKey ? new Date(`${dateKey}T${event.time || '23:59'}`) : new Date(0);
}

function getCreatedTime(event) {
  if (event.createdAt) {
    return new Date(event.createdAt).getTime();
  }

  if (/^[a-f\d]{24}$/i.test(event._id || '')) {
    return parseInt(event._id.substring(0, 8), 16) * 1000;
  }

  return getEventDateTime(event).getTime();
}

function eventSequenceFromId(eventId) {
  const match = String(eventId || '').match(/(?:^|[-_])(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function nextEventIdFromEvents(eventList) {
  const maxSequence = eventList.reduce((max, event) => Math.max(max, eventSequenceFromId(event.eventId)), 0);
  return `EVT-${String(maxSequence + 1).padStart(4, '0')}`;
}

function tomorrowKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localDateKey(tomorrow);
}

function Event() {
  const [formData, setFormData] = useState(emptyEventForm);
  const [events, setEvents] = useState([]);
  const [interactions, setInteractions] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [expandedEvents, setExpandedEvents] = useState({});
  const [directory, setDirectory] = useState({});
  const [participantSuggestionsOpen, setParticipantSuggestionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [sortMode, setSortMode] = useState('dateDesc');
  const [rangeFilter, setRangeFilter] = useState('upcoming');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [toast, setToast] = useState(null);
  const [commentMessages, setCommentMessages] = useState({});
  const [searchParams] = useSearchParams();
  const selectedEventId = searchParams.get('eventId');
  const username = localStorage.getItem('username');
  const userType = localStorage.getItem('userType');
  const today = localDateKey();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchUserDirectory();
    fetchEvents();
    fetchAllInteractions();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNextEventId() {
      try {
        const res = await apiFetch('/events/next-id');
        const data = await res.json();

        if (!cancelled && res.ok) {
          setFormData(prev => ({ ...prev, eventId: data.eventId }));
        } else if (!cancelled) {
          setFormData(prev => ({ ...prev, eventId: nextEventIdFromEvents(events) }));
        }
      } catch (err) {
        console.error('Failed to load next event ID', err);
        if (!cancelled) {
          setFormData(prev => ({ ...prev, eventId: nextEventIdFromEvents(events) }));
        }
      }
    }

    loadNextEventId();

    return () => {
      cancelled = true;
    };
  }, [events]);

  const displayName = (personUsername) => {
    return directory[personUsername]?.name || personUsername || 'Resident';
  };

  const participantDirectory = useMemo(() => {
    return Object.values(directory)
      .filter(user => user.username)
      .sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username));
  }, [directory]);

  const selectedParticipantSet = useMemo(() => {
    return new Set(
      formData.participants
        .split(',')
        .map(item => item.trim().toLowerCase())
        .filter(Boolean)
    );
  }, [formData.participants]);

  const participantSearchTerm = useMemo(() => {
    const tokens = formData.participants.split(',');
    return tokens[tokens.length - 1].trim().toLowerCase();
  }, [formData.participants]);

  const participantSuggestions = useMemo(() => {
    if (!participantSuggestionsOpen) {
      return [];
    }

    return participantDirectory
      .filter(user => !selectedParticipantSet.has(user.username.toLowerCase()))
      .filter(user => {
        if (!participantSearchTerm) return true;
        const searchable = [user.username, user.name, user.houseNumber, user.profession]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchable.includes(participantSearchTerm);
      })
      .slice(0, 8);
  }, [participantDirectory, participantSearchTerm, participantSuggestionsOpen, selectedParticipantSet]);

  const addParticipant = (personUsername) => {
    const existingTokens = formData.participants
      .split(',')
      .slice(0, -1)
      .map(item => item.trim())
      .filter(Boolean);
    const selectedSet = new Set(existingTokens.map(item => item.toLowerCase()));
    const nextTokens = selectedSet.has(personUsername.toLowerCase())
      ? existingTokens
      : [...existingTokens, personUsername];

    setFormData(prev => ({ ...prev, participants: nextTokens.join(', ') }));
    setParticipantSuggestionsOpen(false);
  };

  const fetchUserDirectory = async () => {
    try {
      const res = await apiFetch('/users/directory');
      const data = await res.json();
      const map = {};
      data.forEach(user => {
        map[user.username] = user;
      });
      setDirectory(map);
    } catch (err) {
      console.error('Failed to load resident directory', err);
    }
  };

  const fetchAllInteractions = async () => {
    try {
      const res = await apiFetch('/event-interactions');
      const data = await res.json();
      const map = {};
      data.forEach((item) => {
        map[item.eventId] = item;
      });
      setInteractions(map);
    } catch (err) {
      console.error('Failed to load interactions', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await apiFetch('/events');
      const data = await res.json();
      const eventList = Array.isArray(data) ? data : [];
      setEvents(eventList);
      setFormData(prev => ({ ...prev, eventId: prev.eventId || nextEventIdFromEvents(eventList) }));
    } catch (err) {
      console.error('Error fetching events', err);
      setFormData(prev => ({ ...prev, eventId: prev.eventId || 'EVT-0001' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = {
      eventId: formData.eventId,
      date: formData.date,
      title: formData.title,
      info: formData.info,
      purpose: formData.title,
      location: formData.location,
      time: formData.time,
      participants: formData.participants.split(',').map(p => p.trim()).filter(Boolean),
      organizer: [],
      username,
    };

    const res = await apiFetch('/events', {
      method: 'POST',
      body,
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const updatedEvents = [data, ...events];
      setEvents(updatedEvents);
      setFormData({ ...emptyEventForm, eventId: nextEventIdFromEvents(updatedEvents) });
      setActiveTab('feed');
      setRangeFilter('upcoming');
      showToast(`Event published: ${data.eventId}`);
      fetchEvents();
      fetchAllInteractions();
    } else {
      const missingText = data.missingFields?.length ? `: ${data.missingFields.join(', ')}` : '';
      showToast(`${data.error || 'Unable to create event'}${missingText}`, 'error');
    }
  };

  const setInteractionForEvent = (eventId, interaction) => {
    setInteractions(prev => ({
      ...prev,
      [eventId]: interaction,
    }));
  };

  const handleLike = async (eventId) => {
    const res = await apiFetch(`/event-interactions/${eventId}/like`, {
      method: 'POST',
    });
    const data = await res.json();

    if (res.ok) {
      setInteractionForEvent(eventId, data);
    }
  };

  const handleComment = async (eventId) => {
    const commentText = (commentDrafts[eventId] || '').trim();
    if (!commentText) return;

    setCommentMessages(prev => ({ ...prev, [eventId]: '' }));

    const res = await apiFetch(`/event-interactions/${eventId}/comment`, {
      method: 'POST',
      body: { username, comment: commentText },
    });
    const data = await res.json();

    if (res.ok) {
      setInteractionForEvent(eventId, data);
      setCommentDrafts(prev => ({ ...prev, [eventId]: '' }));
      setOpenComments(prev => ({ ...prev, [eventId]: true }));
    } else {
      setCommentMessages(prev => ({ ...prev, [eventId]: data.error || 'Unable to post comment' }));
    }
  };

  const handleDeleteComment = async (eventId, commentId) => {
    const res = await apiFetch(`/event-interactions/${eventId}/comment/${commentId}`, {
      method: 'DELETE',
    });
    const data = await res.json();

    if (res.ok) {
      setInteractionForEvent(eventId, data);
    }
  };

  const filteredEvents = useMemo(() => {
    if (selectedEventId) {
      return events.filter(event => event.eventId === selectedEventId);
    }

    const now = new Date();
    const currentDay = localDateKey(now);
    const nextDay = tomorrowKey();

    const inRange = (event) => {
      const dateKey = normalizeEventDate(event.date);

      if (rangeFilter === 'today') return dateKey === currentDay;
      if (rangeFilter === 'tomorrow') return dateKey === nextDay;
      if (rangeFilter === 'done') return dateKey < currentDay;
      if (rangeFilter === 'all') return true;
      if (rangeFilter === 'dateRange') {
        const fromOk = !dateRange.from || dateKey >= dateRange.from;
        const toOk = !dateRange.to || dateKey <= dateRange.to;
        return fromOk && toOk;
      }
      if (rangeFilter === 'upcoming') return dateKey >= currentDay;
      return true;
    };

    const sorters = {
      dateDesc: (a, b) => getEventDateTime(b) - getEventDateTime(a),
      dateAsc: (a, b) => getEventDateTime(a) - getEventDateTime(b),
      postedDesc: (a, b) => getCreatedTime(b) - getCreatedTime(a),
      postedAsc: (a, b) => getCreatedTime(a) - getCreatedTime(b),
    };

    return [...events].filter(inRange).sort(sorters[sortMode] || sorters.dateDesc);
  }, [dateRange, events, rangeFilter, selectedEventId, sortMode]);

  const hasEventFilter = selectedEventId || rangeFilter !== 'all';

  return (
    <div className="event-page">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <PageNav />
      <section className="page-hero compact event-hero">
        <span className="eyebrow">Community Events</span>
        <h1>Event posts for planning, participation, and discussion.</h1>
      </section>

      <div className="event-tabs" role="tablist" aria-label="Event sections">
        <button
          type="button"
          className={activeTab === 'feed' ? 'active' : ''}
          onClick={() => setActiveTab('feed')}
        >
          <i className="fa-solid fa-layer-group" aria-hidden="true"></i>
          Event Feed
        </button>
        <button
          type="button"
          className={activeTab === 'plan' ? 'active' : ''}
          onClick={() => {
            setActiveTab(activeTab === 'plan' ? 'feed' : 'plan');
          }}
        >
          <i className="fa-solid fa-calendar-plus" aria-hidden="true"></i>
          Plan an Event
        </button>
      </div>

      {activeTab === 'plan' && (
        <section className="create-event tab-panel">
          <div className="form-heading">
            <div>
              <span className="eyebrow">New Event</span>
              <h2>Plan an Event</h2>
            </div>
            <span className="event-id-preview">{formData.eventId || 'Generating...'}</span>
          </div>

          <form onSubmit={handleSubmit}>
            <label>Event ID
              <input type="text" value={formData.eventId || 'Generating...'} readOnly aria-readonly="true" />
            </label>
            <label>Date
              <input type="date" min={today} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
            </label>
            <label>Time
              <input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} required />
            </label>
            <label>Event Heading
              <input
                type="text"
                maxLength="80"
                placeholder="Association clean-up, festival prep..."
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </label>
            <label>Location
              <input type="text" placeholder="Club house, block A lawn..." value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
            </label>
            <label>Participants
              <div className="participant-field">
                <input
                  type="text"
                  placeholder="Search usernames or type All residents, Volunteers..."
                  value={formData.participants}
                  onFocus={() => setParticipantSuggestionsOpen(true)}
                  onBlur={() => window.setTimeout(() => setParticipantSuggestionsOpen(false), 120)}
                  onChange={e => {
                    setFormData({ ...formData, participants: e.target.value });
                    setParticipantSuggestionsOpen(true);
                  }}
                />
                {participantSuggestions.length > 0 && (
                  <div className="participant-suggestions">
                    {participantSuggestions.map(user => (
                      <button
                        key={user.username}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => addParticipant(user.username)}
                      >
                        <span>{user.name || user.username}</span>
                        <small>{user.username}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
            <label className="event-info-field">More Info
              <textarea
                placeholder="Agenda, requirements, contribution details, or anything residents should know..."
                value={formData.info}
                onChange={e => setFormData({ ...formData, info: e.target.value })}
                required
              />
            </label>

            <button type="submit">Publish Event</button>
          </form>
        </section>
      )}

      <section className="events-list">
        <div className="feed-toolbar">
          <div>
            <span className="eyebrow">Live Feed</span>
            <h2>{selectedEventId ? `Event ${selectedEventId}` : 'Events by Neighbors'}</h2>
            {selectedEventId && <Link className="clear-event-filter" to="/events">Show all events</Link>}
            <p className="event-result-count">
              {filteredEvents.length} of {events.length} events shown{hasEventFilter ? ' with current view' : ''}
            </p>
          </div>

          {!selectedEventId && <div className="event-controls">
            <label>
              <span>Range</span>
              <select value={rangeFilter} onChange={e => setRangeFilter(e.target.value)}>
                <option value="all">All events</option>
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="done">Done</option>
                <option value="dateRange">Date range</option>
              </select>
            </label>

            <label>
              <span>Sort</span>
              <select value={sortMode} onChange={e => setSortMode(e.target.value)}>
                <option value="dateDesc">Date & time: descending</option>
                <option value="dateAsc">Date & time: ascending</option>
                <option value="postedDesc">Posted: newest first</option>
                <option value="postedAsc">Posted: oldest first</option>
              </select>
            </label>

            {rangeFilter === 'dateRange' && (
              <div className="date-range-controls">
                <label>
                  <span>From</span>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  />
                </label>
                <label>
                  <span>To</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  />
                </label>
              </div>
            )}
          </div>}
        </div>

        {filteredEvents.length === 0 && (
          <div className="empty-events">
            <i className="fa-regular fa-calendar" aria-hidden="true"></i>
            <p>No events match this view.</p>
          </div>
        )}

        {filteredEvents.map((ev) => {
          const interaction = interactions[ev.eventId] || { comments: [], likes: 0, likedBy: [] };
          const isLiked = interaction.likedBy?.includes(username);
          const isPast = normalizeEventDate(ev.date) < today;
          const commentsOpen = Boolean(openComments[ev.eventId]);
          const detailsOpen = Boolean(expandedEvents[ev.eventId]);
          const organizerNames = (ev.organizer || []).map(displayName).join(', ') || displayName(ev.username);
          const eventTitle = ev.title || ev.purpose || 'Untitled event';
          const eventInfo = ev.info || ev.purpose || 'No additional details provided.';

          return (
            <article className={isPast ? 'event-card done' : 'event-card'} key={ev._id || ev.eventId}>
              <div className="event-card-top">
                <div className="event-id-block">
                  <span>{ev.eventId}</span>
                  <strong className={isPast ? 'status-badge done' : 'status-badge'}>{isPast ? 'Done' : 'Upcoming'}</strong>
                </div>
                <div className="event-posted">
                  <span>Posted by</span>
                  <strong>{displayName(ev.username)}</strong>
                </div>
              </div>

              <div className="event-title-row">
                <div>
                  <h3>{eventTitle}</h3>
                  <p><i className="fa-solid fa-location-dot" aria-hidden="true"></i>{ev.location}</p>
                </div>
                <div className="event-date-tile">
                  <strong>{normalizeEventDate(ev.date)}</strong>
                  <span>{ev.time || 'Time TBA'}</span>
                </div>
              </div>

              <button
                type="button"
                className="event-more-button"
                onClick={() => setExpandedEvents(prev => ({ ...prev, [ev.eventId]: !detailsOpen }))}
                aria-expanded={detailsOpen}
              >
                <i className={detailsOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'} aria-hidden="true"></i>
                {detailsOpen ? 'Hide details' : 'More details'}
              </button>

              {detailsOpen && (
                <div className="event-expanded-details">
                  <p className="event-info-copy">{eventInfo}</p>
                  <div className="event-details-grid">
                    <p><i className="fa-solid fa-user-tie"></i><span><strong>Organizers</strong>{organizerNames}</span></p>
                    <p><i className="fa-solid fa-users"></i><span><strong>Participants</strong>{(ev.participants || []).join(', ') || 'Open to residents'}</span></p>
                  </div>
                </div>
              )}

              <div className="post-actions">
                <button className={isLiked ? 'post-action liked' : 'post-action'} onClick={() => handleLike(ev.eventId)} title="Like event">
                  <i className="fa-solid fa-heart" aria-hidden="true"></i>
                  <span>{interaction.likes || 0}</span>
                </button>
                <button
                  className={commentsOpen ? 'post-action active' : 'post-action'}
                  onClick={() => setOpenComments(prev => ({ ...prev, [ev.eventId]: !commentsOpen }))}
                  aria-expanded={commentsOpen}
                  title="View comments"
                >
                  <i className="fa-regular fa-comment" aria-hidden="true"></i>
                  <span>{interaction.comments?.length || 0}</span>
                </button>
              </div>

              {commentsOpen && (
                <div className="comments-dropdown">
                  <ul>
                    {(interaction.comments || []).map((comment, index) => (
                      <li key={comment._id || `${comment.username}-${comment.timestamp}-${index}`}>
                        <div className="comment-avatar">{displayName(comment.username).slice(0, 1).toUpperCase()}</div>
                        <div className="comment-body">
                          <strong>{displayName(comment.username)}</strong>
                          <span>{comment.comment}</span>
                        </div>
                        {(comment.username === username || userType === 'admin') && (
                          <button type="button" onClick={() => handleDeleteComment(ev.eventId, comment._id)} title="Delete comment" aria-label="Delete comment">
                            <i className="fa-solid fa-trash" aria-hidden="true"></i>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="comment-compose">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentDrafts[ev.eventId] || ''}
                      onChange={e => setCommentDrafts(prev => ({ ...prev, [ev.eventId]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleComment(ev.eventId);
                      }}
                    />
                    <button type="button" onClick={() => handleComment(ev.eventId)} title="Post comment" aria-label="Post comment">
                      <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
                    </button>
                  </div>
                  {commentMessages[ev.eventId] && <p className="comment-message">{commentMessages[ev.eventId]}</p>}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

export default Event;

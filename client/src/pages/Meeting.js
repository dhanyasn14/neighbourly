import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import './Meeting.css';
import { apiFetch } from '../services/api';
import PageNav from '../components/PageNav';
import Toast from '../components/Toast';

const emptyForm = {
  date: '',
  time: '',
  purpose: '',
  meetingId: '',
  meetingMode: 'In-person',
  meetingLink: '',
  meetingKind: 'new',
  continuationOf: '',
  notes: '',
};

function meetingSequenceFromId(meetingId) {
  const match = String(meetingId || '').match(/^(?:MTG-)?M?(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function rootMeetingId(meetingId) {
  return String(meetingId || '').trim().replace(/-[A-Z]+$/i, '');
}

function continuationSuffixFromId(meetingId) {
  const match = String(meetingId || '').match(/-([A-Z]+)$/i);
  return match ? match[1].toUpperCase() : '';
}

function suffixToNumber(suffix) {
  return String(suffix || '').toUpperCase().split('').reduce((total, char) => {
    const value = char.charCodeAt(0) - 64;
    return total * 26 + Math.max(value, 0);
  }, 0);
}

function numberToSuffix(number) {
  let value = number;
  let suffix = '';

  while (value > 0) {
    value -= 1;
    suffix = String.fromCharCode(65 + (value % 26)) + suffix;
    value = Math.floor(value / 26);
  }

  return suffix || 'A';
}

function nextMainMeetingId(meetings) {
  const maxSequence = meetings.reduce((max, meeting) => Math.max(max, meetingSequenceFromId(meeting.meetingId)), 0);
  return `M${String(maxSequence + 1).padStart(3, '0')}`;
}

function nextContinuationMeetingId(baseMeetingId, meetings) {
  const rootId = rootMeetingId(baseMeetingId);
  const maxSuffix = meetings
    .filter(meeting => meeting.meetingId === rootId || meeting.parentMeetingId === rootId || rootMeetingId(meeting.meetingId) === rootId)
    .reduce((max, meeting) => {
      const suffix = meeting.continuationSuffix || continuationSuffixFromId(meeting.meetingId);
      return Math.max(max, suffixToNumber(suffix));
    }, 0);

  return `${rootId}-${numberToSuffix(maxSuffix + 1)}`;
}

function Meeting() {
  const [formData, setFormData] = useState(emptyForm);
  const [suggestions, setSuggestions] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [myMeetings, setMyMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('request');
  const [activeCommunityView, setActiveCommunityView] = useState('all');
  const [searchParams] = useSearchParams();
  const selectedMeetingId = searchParams.get('meetingId');
  const username = localStorage.getItem('username');
  const today = new Date().toISOString().split('T')[0];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const getMeetingDateTime = (meeting) => {
    const date = format(new Date(meeting.date), 'yyyy-MM-dd');
    return new Date(`${date}T${meeting.time || '23:59'}`);
  };

  const canJoinMeeting = (meeting) => {
    return meeting.meetingMode === 'Zoom' && meeting.meetingLink && meeting.request === 'Done' && getMeetingDateTime(meeting) <= new Date();
  };

  const allMeetingSections = useMemo(() => {
    const now = new Date();
    return {
      all: [...allMeetings]
        .sort((a, b) => getMeetingDateTime(b) - getMeetingDateTime(a)),
      upcoming: allMeetings
        .filter(meeting => getMeetingDateTime(meeting) >= now)
        .sort((a, b) => getMeetingDateTime(a) - getMeetingDateTime(b)),
      done: allMeetings
        .filter(meeting => getMeetingDateTime(meeting) < now)
        .sort((a, b) => getMeetingDateTime(b) - getMeetingDateTime(a)),
    };
  }, [allMeetings]);

  const myScheduleSections = useMemo(() => {
    const now = new Date();
    return {
      completed: myMeetings
        .filter(meeting => meeting.request === 'Done' && getMeetingDateTime(meeting) < now)
        .sort((a, b) => getMeetingDateTime(b) - getMeetingDateTime(a)),
      upcomingApproved: myMeetings
        .filter(meeting => meeting.request === 'Done' && getMeetingDateTime(meeting) >= now)
        .sort((a, b) => getMeetingDateTime(a) - getMeetingDateTime(b)),
    };
  }, [myMeetings]);

  const communityTabs = useMemo(() => ([
    {
      id: 'all',
      label: 'All Meetings',
      icon: 'fa-layer-group',
      count: allMeetingSections.all.length,
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      icon: 'fa-calendar-check',
      count: allMeetingSections.upcoming.length,
    },
    {
      id: 'done',
      label: 'Done Meetings',
      icon: 'fa-circle-check',
      count: allMeetingSections.done.length,
    },
  ]), [allMeetingSections]);

  const mainMeetings = useMemo(() => {
    return allMeetings.filter(meeting => !meeting.parentMeetingId && !continuationSuffixFromId(meeting.meetingId));
  }, [allMeetings]);

  const localReferenceId = useCallback((baseMeetingId = '') => {
    if (baseMeetingId) {
      return nextContinuationMeetingId(baseMeetingId, allMeetings);
    }

    return nextMainMeetingId(allMeetings);
  }, [allMeetings]);

  const fetchNextMeetingId = useCallback(async (baseMeetingId = '') => {
    const fallbackId = localReferenceId(baseMeetingId);
    setFormData(prev => ({ ...prev, meetingId: fallbackId }));

    try {
      const query = baseMeetingId ? `?baseMeetingId=${encodeURIComponent(baseMeetingId)}` : '';
      const res = await apiFetch(`/meetings/next-id${query}`);
      const data = await res.json();

      if (res.ok && data.meetingId) {
        setFormData(prev => ({ ...prev, meetingId: data.meetingId }));
      }
    } catch (err) {
      setFormData(prev => ({ ...prev, meetingId: fallbackId }));
    }
  }, [localReferenceId]);

  const fetchAllMeetings = useCallback(async () => {
    const res = await apiFetch('/meetings/all');
    const data = await res.json();
    setAllMeetings(Array.isArray(data) ? data : []);
  }, []);

  const fetchMyMeetings = useCallback(async () => {
    const res = await apiFetch(`/meetings/user/${username}`);
    const data = await res.json();
    setMyMeetings(Array.isArray(data) ? data : []);
  }, [username]);

  const fetchSelectedMeeting = useCallback(async () => {
    if (!selectedMeetingId) {
      setSelectedMeeting(null);
      return;
    }

    const res = await apiFetch(`/meetings/reference/${encodeURIComponent(selectedMeetingId)}`);
    const data = await res.json();
    setSelectedMeeting(res.ok ? data : null);
  }, [selectedMeetingId]);

  useEffect(() => {
    if (selectedMeetingId) {
      setActiveTab('community');
    }
  }, [selectedMeetingId]);

  useEffect(() => {
    fetchAllMeetings();
    fetchMyMeetings();
    fetchSelectedMeeting();
  }, [fetchAllMeetings, fetchMyMeetings, fetchSelectedMeeting]);

  useEffect(() => {
    const baseMeetingId = formData.meetingKind === 'continuation' ? formData.continuationOf : '';

    if (formData.meetingKind === 'continuation' && !baseMeetingId) {
      setFormData(prev => ({ ...prev, meetingId: '' }));
      return;
    }

    fetchNextMeetingId(baseMeetingId);
  }, [fetchNextMeetingId, formData.continuationOf, formData.meetingKind]);

  const refreshMeetings = () => {
    fetchAllMeetings();
    fetchMyMeetings();
    fetchSelectedMeeting();
  };

  const startContinuation = (meeting) => {
    const rootId = rootMeetingId(meeting.meetingId);
    setFormData(prev => ({
      ...prev,
      meetingKind: 'continuation',
      continuationOf: rootId,
      meetingId: localReferenceId(rootId),
      purpose: '',
      notes: '',
    }));
    showToast(`Scheduling continuation under ${rootId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveTab('request');
  };

  const handleContinuationSearch = async (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, continuationOf: value }));

    if (value.length > 0) {
      const res = await apiFetch(`/meetings/search?q=${encodeURIComponent(value)}&mainOnly=true`);
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (id) => {
    setFormData(prev => ({ ...prev, continuationOf: id }));
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = {
      meetingId: formData.meetingId,
      date: formData.date,
      time: formData.time,
      purpose: formData.purpose,
      meetingMode: formData.meetingMode,
      meetingLink: formData.meetingLink,
      continuationOf: formData.meetingKind === 'continuation' ? formData.continuationOf : '',
      notes: formData.notes,
    };

    const res = await apiFetch('/meetings', {
      method: 'POST',
      body,
    });
    const data = await res.json();

    if (res.ok) {
      showToast(`Meeting request submitted: ${data.meeting?.meetingId || formData.meetingId}`);
      setFormData({ ...emptyForm, meetingId: localReferenceId() });
      refreshMeetings();
    } else {
      showToast(data.message || data.error || 'Unable to submit meeting request', 'error');
    }
  };

  const updateMeetingInLists = (updatedMeeting) => {
    const replace = (meeting) => meeting._id === updatedMeeting._id ? updatedMeeting : meeting;
    setAllMeetings(prev => prev.map(replace));
    setMyMeetings(prev => prev.map(replace));
    setSelectedMeeting(prev => prev?._id === updatedMeeting._id ? updatedMeeting : prev);
  };

  const handleAddNote = async (meeting) => {
    const note = String(noteDrafts[meeting._id] || '').trim();
    if (!note) return;

    const res = await apiFetch(`/meetings/${meeting._id}/notes`, {
      method: 'POST',
      body: { note },
    });
    const data = await res.json();

    if (res.ok) {
      updateMeetingInLists(data);
      setNoteDrafts(prev => ({ ...prev, [meeting._id]: '' }));
    } else {
      showToast(data.message || 'Unable to add note', 'error');
    }
  };

  const renderJoinLink = (meeting) => {
    if (meeting.meetingMode !== 'Zoom' || !meeting.meetingLink) {
      return null;
    }

    if (canJoinMeeting(meeting)) {
      return (
        <a className="join-meeting-link" href={meeting.meetingLink} target="_blank" rel="noreferrer">
          <i className="fa-solid fa-video" aria-hidden="true"></i>
          Join Zoom
        </a>
      );
    }

    return <span className="join-disabled">Zoom opens at {meeting.time || 'scheduled time'}</span>;
  };

  const renderNotes = (meeting) => (
    <div className="meeting-notes">
      <strong>Notes</strong>
      {(meeting.notes || []).length === 0 && <small>No notes yet.</small>}
      {(meeting.notes || []).slice(-3).map(note => (
        <p key={note._id || `${note.username}-${note.createdAt}`}>
          <span>{note.username}</span>
          {note.note}
        </p>
      ))}
      <div className="note-compose">
        <input
          type="text"
          placeholder="Add note..."
          value={noteDrafts[meeting._id] || ''}
          onChange={e => setNoteDrafts(prev => ({ ...prev, [meeting._id]: e.target.value }))}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAddNote(meeting);
          }}
        />
        <button type="button" onClick={() => handleAddNote(meeting)} aria-label="Add note">
          <i className="fa-solid fa-plus" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );

  const renderMeetingItem = (meeting, { showContinue = true } = {}) => {
    const isSubMeeting = Boolean(meeting.parentMeetingId || continuationSuffixFromId(meeting.meetingId));

    return (
      <li key={meeting._id || meeting.meetingId} className={selectedMeetingId === meeting.meetingId ? 'meeting-highlight' : ''}>
        <div className="meeting-item-head">
          <strong>{meeting.meetingId}</strong>
          <span className={getMeetingDateTime(meeting) < new Date() ? 'meeting-state done' : 'meeting-state upcoming'}>
            {getMeetingDateTime(meeting) < new Date() ? 'Done' : 'Upcoming'}
          </span>
        </div>
        <span>{meeting.purpose}</span>
        <small>{format(new Date(meeting.date), 'yyyy-MM-dd')} {meeting.time || ''} - {meeting.request}</small>
        {meeting.parentMeetingId && <small>Continuation of {meeting.parentMeetingId}</small>}
        {renderJoinLink(meeting)}
        {showContinue && !isSubMeeting && (
          <button type="button" className="continue-meeting-button" onClick={() => startContinuation(meeting)}>
            <i className="fa-solid fa-code-branch" aria-hidden="true"></i>
            Schedule Continuation
          </button>
        )}
        {renderNotes(meeting)}
      </li>
    );
  };

  const renderMeetingColumn = ({ eyebrow, title, meetings, emptyMessage, variant = '' }) => (
    <div className={`meeting-column-card ${variant}`.trim()}>
      <div className="meeting-column-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        <strong>{meetings.length}</strong>
      </div>
      <div className="meeting-column-scroll">
        <ul className="meeting-list">
          {meetings.length === 0 && <li>{emptyMessage}</li>}
          {meetings.map(meeting => renderMeetingItem(meeting))}
        </ul>
      </div>
    </div>
  );

  const renderCommunityMeetings = () => {
    if (activeCommunityView === 'upcoming') {
      return renderMeetingColumn({
        eyebrow: 'Scheduled',
        title: 'Upcoming Meetings',
        meetings: allMeetingSections.upcoming,
        emptyMessage: 'No upcoming meetings.',
        variant: 'upcoming-column single-column',
      });
    }

    if (activeCommunityView === 'done') {
      return renderMeetingColumn({
        eyebrow: 'Completed',
        title: 'Done Meetings',
        meetings: allMeetingSections.done,
        emptyMessage: 'No done meetings.',
        variant: 'done-column single-column',
      });
    }

    return (
      <div className="meeting-board">
        {renderMeetingColumn({
          eyebrow: 'Scheduled',
          title: 'Upcoming Meetings',
          meetings: allMeetingSections.upcoming,
          emptyMessage: 'No upcoming meetings.',
          variant: 'upcoming-column',
        })}
        {renderMeetingColumn({
          eyebrow: 'Completed',
          title: 'Done Meetings',
          meetings: allMeetingSections.done,
          emptyMessage: 'No done meetings.',
          variant: 'done-column',
        })}
      </div>
    );
  };

  return (
    <div className="meeting-wrapper">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <PageNav />
      <section className="page-hero compact">
        <span className="eyebrow">Meeting Center</span>
        <h1>Request, continue, and document community meetings.</h1>
      </section>

      <div className="meeting-tabs" role="tablist" aria-label="Meeting sections">
        <button type="button" className={activeTab === 'request' ? 'active' : ''} onClick={() => setActiveTab('request')}>
          <i className="fa-solid fa-plus" aria-hidden="true"></i>
          New Meeting Request
        </button>
        <button type="button" className={activeTab === 'community' ? 'active' : ''} onClick={() => setActiveTab('community')}>
          <i className="fa-solid fa-users" aria-hidden="true"></i>
          Community Schedule
        </button>
        <button type="button" className={activeTab === 'mine' ? 'active' : ''} onClick={() => setActiveTab('mine')}>
          <i className="fa-solid fa-user-check" aria-hidden="true"></i>
          My Schedule
        </button>
      </div>

      {activeTab === 'request' && (
        <section className="meeting-tab-panel">
          <form className="meeting-form" onSubmit={handleSubmit}>
          <h2>New Meeting Request</h2>

          <label>Request Type</label>
          <select
            value={formData.meetingKind}
            onChange={e => setFormData({ ...formData, meetingKind: e.target.value, continuationOf: '', meetingId: '' })}
          >
            <option value="new">New main meeting</option>
            <option value="continuation">Continue main meeting</option>
          </select>

          {formData.meetingKind === 'continuation' && (
            <>
              <label>Main Meeting Reference</label>
              <input
                type="text"
                placeholder="Search main meeting ID"
                value={formData.continuationOf}
                onChange={handleContinuationSearch}
                list="main-meeting-list"
                required
              />
              <datalist id="main-meeting-list">
                {mainMeetings.map(meeting => (
                  <option key={meeting.meetingId} value={meeting.meetingId} />
                ))}
              </datalist>
              {suggestions.length > 0 && (
                <ul className="suggestion-list">
                  {suggestions.map((s) => (
                    <li key={s} onClick={() => handleSelectSuggestion(s)}>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <label>Generated Meeting Reference ID</label>
          <input type="text" value={formData.meetingId || 'Select meeting type'} readOnly aria-readonly="true" />

          <label>Meeting Date</label>
          <input
            type="date"
            min={today}
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            required
          />

          <label>Meeting Time</label>
          <input
            type="time"
            value={formData.time}
            onChange={e => setFormData({ ...formData, time: e.target.value })}
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

          <label>Meeting Type</label>
          <select
            value={formData.meetingMode}
            onChange={e => setFormData({ ...formData, meetingMode: e.target.value, meetingLink: e.target.value === 'Zoom' ? formData.meetingLink : '' })}
          >
            <option value="In-person">In-person</option>
            <option value="Zoom">Zoom</option>
          </select>

          {formData.meetingMode === 'Zoom' && (
            <>
              <label>Zoom Link</label>
              <input
                type="url"
                placeholder="https://zoom.us/j/..."
                value={formData.meetingLink}
                onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                required
              />
            </>
          )}

          <label>Initial Notes</label>
          <textarea
            placeholder="Agenda, context, decisions to revisit..."
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />

          <button type="submit">Submit Request</button>
          </form>
        </section>
      )}

      {activeTab === 'community' && (
        <section className="meeting-tab-panel community-panel">
          <div className="meeting-content">
          {selectedMeeting && (
            <section className="meeting-section">
              <h2>Selected Meeting</h2>
              <div className="meeting-list single">
                {renderMeetingItem(selectedMeeting)}
              </div>
            </section>
          )}

          <section className="meeting-section">
            <div className="meeting-section-heading">
              <div>
                <span className="eyebrow">Community Schedule</span>
                <h2>{communityTabs.find(tab => tab.id === activeCommunityView)?.label || 'All Meetings'}</h2>
              </div>
              <strong>{allMeetings.length} total</strong>
            </div>

            <div className="meeting-community-layout">
              <div className="meeting-subtabs" role="tablist" aria-label="Community meeting filters">
                {communityTabs.map(tab => (
                  <button
                    type="button"
                    key={tab.id}
                    className={activeCommunityView === tab.id ? 'active' : ''}
                    onClick={() => setActiveCommunityView(tab.id)}
                  >
                    <i className={`fa-solid ${tab.icon}`} aria-hidden="true"></i>
                    <span>{tab.label}</span>
                    <strong>{tab.count}</strong>
                  </button>
                ))}
              </div>
              <div className="meeting-community-view">
                {renderCommunityMeetings()}
              </div>
            </div>
          </section>
          </div>
        </section>
      )}

      {activeTab === 'mine' && (
        <section className="meeting-tab-panel">
          <div className="meeting-content">
          <section className="meeting-section">
            <div className="meeting-section-heading">
              <div>
                <span className="eyebrow">My Schedule</span>
                <h2>User Scheduled Meetings</h2>
              </div>
            </div>
            <div className="meeting-cards">
              <div className="card">
                <h3>Completed Meetings</h3>
                <ul>
                  {myScheduleSections.completed.length === 0 && <li>No completed meetings.</li>}
                  {myScheduleSections.completed.map(meeting => renderMeetingItem(meeting, { showContinue: false }))}
                </ul>
              </div>

              <div className="card">
                <h3>My Requests</h3>
                <ul>
                  {myMeetings.length === 0 && <li>No meeting requests yet.</li>}
                  {myMeetings.map(meeting => renderMeetingItem(meeting, { showContinue: false }))}
                </ul>
              </div>

              <div className="card">
                <h3>Upcoming Approved Meetings</h3>
                <ul>
                  {myScheduleSections.upcomingApproved.length === 0 && <li>No upcoming approved meetings.</li>}
                  {myScheduleSections.upcomingApproved.map(meeting => renderMeetingItem(meeting, { showContinue: false }))}
                </ul>
              </div>
            </div>
          </section>
          </div>
        </section>
      )}
    </div>
  );
}

export default Meeting;

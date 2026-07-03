import React, { useEffect, useMemo, useState } from 'react';
import './Alerts.css';
import { apiFetch } from '../services/api';
import PageNav from '../components/PageNav';

const emptyWarningForm = {
  title: '',
  message: '',
  category: 'Community',
  severity: 'warning',
  expiresAt: '',
  sendEmail: false,
};

function formatDate(dateValue) {
  if (!dateValue) return 'Date TBA';
  return new Date(dateValue).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timeValue) {
  return timeValue || 'Time TBA';
}

function Alerts() {
  const [alerts, setAlerts] = useState({
    events: { today: [], tomorrow: [] },
    meetings: { today: [], tomorrow: [] },
    warnings: [],
  });
  const [warningForm, setWarningForm] = useState(emptyWarningForm);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);
  const [activeView, setActiveView] = useState('today');
  const isAdmin = localStorage.getItem('userType') === 'admin';

  useEffect(() => {
    fetchAlerts();
  }, []);

  const totals = useMemo(() => {
    return {
      warnings: alerts.warnings.length,
      today: alerts.events.today.length + alerts.meetings.today.length,
      tomorrow: alerts.events.tomorrow.length + alerts.meetings.tomorrow.length,
    };
  }, [alerts]);

  const alertViews = useMemo(() => {
    const views = [
      {
        id: 'today',
        title: 'Today Alerts',
        count: totals.today,
        icon: 'fa-calendar-day',
      },
      {
        id: 'tomorrow',
        title: 'Tomorrow Alerts',
        count: totals.tomorrow,
        icon: 'fa-calendar-plus',
      },
      {
        id: 'warnings',
        title: 'Warning Center',
        count: totals.warnings,
        icon: 'fa-triangle-exclamation',
      },
    ];

    if (isAdmin) {
      views.push({
        id: 'broadcast',
        title: 'Broadcast Warning',
        count: '+',
        icon: 'fa-bullhorn',
      });
    }

    return views;
  }, [isAdmin, totals]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/alerts');
      const data = await res.json();

      if (res.ok) {
        setAlerts(data);
      }
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  const updateWarningForm = (field, value) => {
    setWarningForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateWarning = async (e) => {
    e.preventDefault();
    setStatusMessage('');

    const res = await apiFetch('/alerts/warnings', {
      method: 'POST',
      body: warningForm,
    });
    const data = await res.json();

    if (res.ok) {
      setWarningForm(emptyWarningForm);
      await fetchAlerts();
      setStatusMessage(data.email?.message || 'Warning alert published.');
    } else {
      setStatusMessage(data.error || 'Unable to publish warning alert.');
    }
  };

  const handleDraftWarning = async () => {
    const roughMessage = `${warningForm.title} ${warningForm.message}`.trim();

    if (!roughMessage) {
      setStatusMessage('Add rough alert details before generating a draft.');
      return;
    }

    setDraftLoading(true);
    setStatusMessage('');

    try {
      const res = await apiFetch('/ai/alerts/draft', {
        method: 'POST',
        body: {
          title: warningForm.title,
          category: warningForm.category,
          severity: warningForm.severity,
          roughMessage,
        },
      });
      const data = await res.json();

      if (res.ok) {
        setWarningForm(prev => ({
          ...prev,
          title: data.title || prev.title,
          category: data.category || prev.category,
          severity: data.severity || prev.severity,
          message: data.message || prev.message,
        }));
        setAiDraft(data);
        setStatusMessage('AI draft applied. Review before publishing.');
      } else {
        setStatusMessage(data.error || 'Unable to draft warning.');
      }
    } catch (err) {
      setStatusMessage('Unable to reach AI draft generator.');
    } finally {
      setDraftLoading(false);
    }
  };

  const handleResolveWarning = async (id) => {
    const confirmed = window.confirm('Resolve this warning alert?');
    if (!confirmed) return;

    const res = await apiFetch(`/alerts/warnings/${id}/resolve`, {
      method: 'PATCH',
    });

    if (res.ok) {
      fetchAlerts();
    }
  };

  const renderScheduleItems = (items, type) => {
    if (!items.length) {
      return <p className="empty-alert-state">No {type} scheduled.</p>;
    }

    return items.map(item => (
      <article className="schedule-card" key={item._id || item.eventId || item.meetingId}>
        <div className="schedule-icon">
          <i className={`fa-solid ${type === 'events' ? 'fa-calendar-day' : 'fa-handshake'}`} aria-hidden="true"></i>
        </div>
        <div>
          <span>{type === 'events' ? item.eventId : item.meetingId}</span>
          <h3>{item.purpose}</h3>
          <p>{formatDate(item.date)} at {formatTime(item.time)}</p>
          {item.location && <small>{item.location}</small>}
          {item.request && <small>{item.request}</small>}
        </div>
      </article>
    ));
  };

  const renderScheduleView = (label, events, meetings) => (
    <section className="schedule-sections single">
      <div className="schedule-column">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{label}</span>
            <h2>Event Alerts</h2>
          </div>
        </div>
        {renderScheduleItems(events, 'events')}
      </div>

      <div className="schedule-column">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{label}</span>
            <h2>Meeting Alerts</h2>
          </div>
        </div>
        {renderScheduleItems(meetings, 'meetings')}
      </div>
    </section>
  );

  return (
    <div className="alerts-page">
      <PageNav />
      <section className="page-hero compact alerts-hero">
        <span className="eyebrow">Alerts & Warnings</span>
        <h1>Separate daily alerts from high-priority warnings.</h1>
      </section>

      <section className="alert-view-grid" aria-label="Alert views">
        {alertViews.map(view => (
          <button
            type="button"
            key={view.id}
            className={activeView === view.id ? 'alert-view-card active' : 'alert-view-card'}
            onClick={() => setActiveView(view.id)}
          >
            <i className={`fa-solid ${view.icon}`} aria-hidden="true"></i>
            <strong>{view.count}</strong>
            <span>{view.title}</span>
          </button>
        ))}
      </section>

      {activeView === 'today' && renderScheduleView('Ongoing Today', alerts.events.today, alerts.meetings.today)}
      {activeView === 'tomorrow' && renderScheduleView('Upcoming Tomorrow', alerts.events.tomorrow, alerts.meetings.tomorrow)}

      {activeView === 'warnings' && (
        <section className="warnings-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Priority</span>
              <h2>Warning Center</h2>
            </div>
            {loading && <span className="loading-pill">Loading</span>}
          </div>

          <div className="warnings-grid">
            {alerts.warnings.length === 0 && <p className="empty-alert-state">No active warnings.</p>}
            {alerts.warnings.map(warning => (
              <article className={`warning-card ${warning.severity}`} key={warning._id}>
                <div>
                  <span>{warning.category}</span>
                  <h3>{warning.title}</h3>
                  <p>{warning.message}</p>
                  <small>Issued by {warning.createdBy} on {formatDate(warning.createdAt)}</small>
                </div>
                <strong>{warning.severity}</strong>
                {isAdmin && (
                  <button type="button" onClick={() => handleResolveWarning(warning._id)}>
                    <i className="fa-solid fa-check" aria-hidden="true"></i>
                    Resolve
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {isAdmin && activeView === 'broadcast' && (
        <section className="warning-composer">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Admin Broadcast</span>
              <h2>Create Warning Message</h2>
            </div>
          </div>

          <form onSubmit={handleCreateWarning}>
            <label>Title
              <input value={warningForm.title} onChange={e => updateWarningForm('title', e.target.value)} required />
            </label>
            <label>Category
              <select value={warningForm.category} onChange={e => updateWarningForm('category', e.target.value)}>
                <option>Weather</option>
                <option>Security</option>
                <option>Maintenance</option>
                <option>Health</option>
                <option>Community</option>
                <option>Other</option>
              </select>
            </label>
            <label>Severity
              <select value={warningForm.severity} onChange={e => updateWarningForm('severity', e.target.value)}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label>Expires At
              <input type="datetime-local" value={warningForm.expiresAt} onChange={e => updateWarningForm('expiresAt', e.target.value)} />
            </label>
            <label className="message-field">Message
              <textarea value={warningForm.message} onChange={e => updateWarningForm('message', e.target.value)} rows="4" required />
            </label>
            <label className="email-toggle">
              <input
                type="checkbox"
                checked={warningForm.sendEmail}
                onChange={e => updateWarningForm('sendEmail', e.target.checked)}
              />
              <span>Email all residents</span>
            </label>
            <button type="button" className="ai-draft-button" onClick={handleDraftWarning} disabled={draftLoading}>
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
              {draftLoading ? 'Drafting' : 'Draft with AI'}
            </button>
            <button type="submit">Publish Warning</button>
          </form>
          {aiDraft && (
            <div className="ai-draft-review">
              <div>
                <strong>Email Subject</strong>
                <span>{aiDraft.emailSubject}</span>
              </div>
              <div>
                <strong>Recommended Expiry</strong>
                <span>{aiDraft.recommendedExpiryHours} hours</span>
              </div>
              {aiDraft.reviewChecklist?.length > 0 && (
                <div className="ai-draft-checklist">
                  <strong>Review</strong>
                  {aiDraft.reviewChecklist.map(item => <span key={item}>{item}</span>)}
                </div>
              )}
            </div>
          )}
          {statusMessage && <p className="alert-status">{statusMessage}</p>}
        </section>
      )}
    </div>
  );
}

export default Alerts;

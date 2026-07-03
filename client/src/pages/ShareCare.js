import React, { useEffect, useState } from 'react';
import './ShareCare.css';
import { apiFetch } from '../services/api';
import PageNav from '../components/PageNav';
import Toast from '../components/Toast';

const emptyForm = {
  type: 'tuition',
  title: '',
  details: '',
  contact: '',
  subject: '',
  classLevel: '',
  mode: 'Community space',
  schedule: '',
  location: '',
  feeExpectation: '',
  direction: 'Need ride',
  pickupLocation: '',
  dropLocation: '',
  travelDate: '',
  travelTime: '',
  seats: '',
  requestType: 'Need item',
  itemName: '',
  condition: '',
  availabilityWindow: '',
  returnExpectation: '',
};

const tabs = [
  { id: 'create', label: 'Create Post', icon: 'fa-plus' },
  { id: 'tuition', label: 'Tuitions', icon: 'fa-graduation-cap' },
  { id: 'carpool', label: 'Carpooling', icon: 'fa-car-side' },
  { id: 'resource', label: 'Resource Sharing', icon: 'fa-box-open' },
];

const labels = {
  tuition: 'Tuitions',
  carpool: 'Carpooling',
  resource: 'Resource Sharing',
};

function formatShareDate(dateValue) {
  if (!dateValue) return 'Date TBA';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'Date TBA';

  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShareTime(timeValue) {
  if (!timeValue) return 'Time TBA';
  const parsed = new Date(`1970-01-01T${timeValue}`);
  if (Number.isNaN(parsed.getTime())) return timeValue;

  return parsed.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ShareCare() {
  const [formData, setFormData] = useState(emptyForm);
  const [posts, setPosts] = useState({ tuition: [], carpool: [], resource: [] });
  const [activeTab, setActiveTab] = useState('tuition');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [toast, setToast] = useState(null);
  const username = localStorage.getItem('username');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchPosts = async () => {
    try {
      const res = await apiFetch('/sharecare');
      const data = await res.json();
      setPosts({
        tuition: data.tuition || [],
        carpool: data.carpool || [],
        resource: data.resource || [],
      });
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const updatePostInState = (updatedPost) => {
    setPosts(prev => ({
      ...prev,
      [updatedPost.type]: (prev[updatedPost.type] || []).map(post => post._id === updatedPost._id ? updatedPost : post),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await apiFetch('/sharecare', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        const missing = data.missing?.length ? `: ${data.missing.join(', ')}` : '';
        showToast(`${data.error || 'Failed to submit post'}${missing}`, 'error');
        return;
      }

      setFormData({ ...emptyForm, type: formData.type });
      setActiveTab(data.type);
      showToast('ShareCare post published.');
      fetchPosts();
    } catch (error) {
      showToast('Error submitting post.', 'error');
    }
  };

  const handleComment = async (post) => {
    const comment = String(commentDrafts[post._id] || '').trim();
    if (!comment) return;

    const res = await apiFetch(`/sharecare/${post._id}/comments`, {
      method: 'POST',
      body: { comment },
    });
    const data = await res.json();

    if (res.ok) {
      updatePostInState(data);
      setCommentDrafts(prev => ({ ...prev, [post._id]: '' }));
    }
  };

  const markDone = async (post) => {
    const confirmed = window.confirm('Mark this post as no longer available?');
    if (!confirmed) return;

    const res = await apiFetch(`/sharecare/${post._id}/done`, {
      method: 'PATCH',
    });
    const data = await res.json();

    if (res.ok) {
      updatePostInState(data);
      showToast('Post marked no longer available.');
    } else {
      showToast(data.error || 'Failed to update post.', 'error');
    }
  };

  const renderDynamicFields = () => {
    if (formData.type === 'tuition') {
      return (
        <>
          <input name="subject" placeholder="Subject, e.g. Maths, Java, English" value={formData.subject} onChange={handleChange} required />
          <input name="classLevel" placeholder="Class / level, e.g. 8th standard, BTech first year" value={formData.classLevel} onChange={handleChange} required />
          <select name="mode" value={formData.mode} onChange={handleChange}>
            <option>Online</option>
            <option>At tutor home</option>
            <option>At student home</option>
            <option>Community space</option>
          </select>
          <input name="schedule" placeholder="When, e.g. Weekdays 6-7 PM" value={formData.schedule} onChange={handleChange} required />
          <input name="location" placeholder="Where, e.g. Clubhouse room 2 / Block B" value={formData.location} onChange={handleChange} required />
          <input name="feeExpectation" placeholder="Fee / free / negotiable" value={formData.feeExpectation} onChange={handleChange} />
        </>
      );
    }

    if (formData.type === 'carpool') {
      return (
        <>
          <select name="direction" value={formData.direction} onChange={handleChange}>
            <option>Need ride</option>
            <option>Offering ride</option>
          </select>
          <input name="pickupLocation" placeholder="Pickup location" value={formData.pickupLocation} onChange={handleChange} required />
          <input name="dropLocation" placeholder="Drop location" value={formData.dropLocation} onChange={handleChange} required />
          <input type="date" name="travelDate" value={formData.travelDate} onChange={handleChange} required />
          <input type="time" name="travelTime" value={formData.travelTime} onChange={handleChange} required />
          <input type="number" min="1" name="seats" placeholder="Seats needed/available" value={formData.seats} onChange={handleChange} />
        </>
      );
    }

    return (
      <>
        <select name="requestType" value={formData.requestType} onChange={handleChange}>
          <option>Need item</option>
          <option>Lending item</option>
          <option>Giving away</option>
        </select>
        <input name="itemName" placeholder="Item, e.g. ladder, wheelchair, induction stove" value={formData.itemName} onChange={handleChange} required />
        <input name="condition" placeholder="Condition / quantity" value={formData.condition} onChange={handleChange} />
        <input name="availabilityWindow" placeholder="Availability, e.g. this weekend, 2 days" value={formData.availabilityWindow} onChange={handleChange} required />
        <input name="returnExpectation" placeholder="Return expectation / deposit / pickup details" value={formData.returnExpectation} onChange={handleChange} />
      </>
    );
  };

  const renderPostDetails = (post) => {
    if (post.type === 'tuition') {
      return (
        <>
          <p><strong>Subject</strong> {post.tuition?.subject || 'N/A'}</p>
          <p><strong>Class</strong> {post.tuition?.classLevel || 'N/A'}</p>
          <p><strong>Mode</strong> {post.tuition?.mode || 'N/A'}</p>
          <p><strong>Fee</strong> {post.tuition?.feeExpectation || 'N/A'}</p>
        </>
      );
    }

    if (post.type === 'carpool') {
      return (
        <>
          <p><strong>Type</strong> {post.carpool?.direction || 'N/A'}</p>
          <p><strong>Pickup</strong> {post.carpool?.pickupLocation || 'N/A'}</p>
          <p><strong>Drop</strong> {post.carpool?.dropLocation || 'N/A'}</p>
          <p><strong>Seats</strong> {post.carpool?.seats || 'N/A'}</p>
        </>
      );
    }

    return (
      <>
        <p><strong>Type</strong> {post.resource?.requestType || 'N/A'}</p>
        <p><strong>Condition</strong> {post.resource?.condition || 'N/A'}</p>
        <p><strong>Return</strong> {post.resource?.returnExpectation || 'N/A'}</p>
      </>
    );
  };

  const renderPostTiming = (post) => {
    if (post.type === 'tuition') {
      return (
        <div className="post-timing-strip">
          <div className="post-timing-item">
            <i className="fa-solid fa-calendar-days" aria-hidden="true"></i>
            <strong>When</strong>
            <b>{post.tuition?.schedule || 'Schedule TBA'}</b>
          </div>
          <div className="post-timing-item">
            <i className="fa-solid fa-location-dot" aria-hidden="true"></i>
            <strong>Where</strong>
            <b>{post.tuition?.location || 'Location TBA'}</b>
          </div>
        </div>
      );
    }

    if (post.type === 'carpool') {
      return (
        <div className="post-timing-strip">
          <div className="post-timing-item">
            <i className="fa-solid fa-calendar-day" aria-hidden="true"></i>
            <strong>Date</strong>
            <b>{formatShareDate(post.carpool?.travelDate)}</b>
          </div>
          <div className="post-timing-item">
            <i className="fa-solid fa-clock" aria-hidden="true"></i>
            <strong>Time</strong>
            <b>{formatShareTime(post.carpool?.travelTime)}</b>
          </div>
        </div>
      );
    }

    return (
      <div className="post-timing-strip">
        <div className="post-timing-item">
          <i className="fa-solid fa-box" aria-hidden="true"></i>
          <strong>Item</strong>
          <b>{post.resource?.itemName || 'Item TBA'}</b>
        </div>
        <div className="post-timing-item">
          <i className="fa-solid fa-calendar-check" aria-hidden="true"></i>
          <strong>Available</strong>
          <b>{post.resource?.availabilityWindow || 'Availability TBA'}</b>
        </div>
      </div>
    );
  };

  const renderPosts = (type) => (
    <section className="sharecare-board">
      <div className="board-heading">
        <div>
          <span className="eyebrow">{labels[type]}</span>
          <h2>{labels[type]}</h2>
        </div>
        <strong>{posts[type]?.length || 0} posts</strong>
      </div>
      {(posts[type] || []).length === 0 && <p className="empty-copy">No posts yet.</p>}
      <div className="post-grid">
        {(posts[type] || []).map(post => {
          const icon = type === 'tuition' ? 'fa-graduation-cap' : type === 'carpool' ? 'fa-car-side' : 'fa-box-open';
          const initials = String(post.username || 'R').slice(0, 1).toUpperCase();

          return (
          <article key={post._id} className={`post-card type-${type} ${post.status === 'done' ? 'done' : ''}`.trim()}>
            <div className="post-card-head">
              <div className="post-author-row">
                <div className="post-avatar">{initials}</div>
                <div>
                  <span className="post-status">{post.status === 'done' ? 'No longer available' : 'Active'}</span>
                  <h3>{post.title}</h3>
                  <small>Posted by {post.username}</small>
                </div>
              </div>
              <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
            </div>
            {renderPostTiming(post)}
            <div className="post-field-list">
              <p><strong>Contact</strong> {post.contact}</p>
              {renderPostDetails(post)}
            </div>
            <p className="post-details-copy"><strong>Details</strong> {post.details}</p>

            {post.username === username && post.status !== 'done' && (
              <button type="button" className="close-post-btn" onClick={() => markDone(post)}>
                Mark no longer available
              </button>
            )}

            <div className="sharecare-comments">
              <strong>Comments</strong>
              {(post.comments || []).slice(-3).map(comment => (
                <p key={comment._id || `${comment.username}-${comment.createdAt}`}>
                  <span>{comment.username}</span>
                  {comment.comment}
                </p>
              ))}
              <div className="comment-compose">
                <input
                  placeholder="Ask or respond..."
                  value={commentDrafts[post._id] || ''}
                  onChange={e => setCommentDrafts(prev => ({ ...prev, [post._id]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleComment(post);
                  }}
                />
                <button type="button" onClick={() => handleComment(post)} aria-label="Add comment">
                  <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="sharecare-container">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <PageNav />
      <section className="page-hero compact">
        <span className="eyebrow">ShareCare Exchange</span>
        <h1>Coordinate learning, rides, and useful resources with residents.</h1>
      </section>

      <div className="sharecare-tabs" role="tablist" aria-label="ShareCare sections">
        {tabs.map(tab => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
            <i className={`fa-solid ${tab.icon}`} aria-hidden="true"></i>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'create' && (
        <section className="sharecare-panel">
          <form onSubmit={handleSubmit} className="sharecare-form">
            <h2>Create ShareCare Post</h2>
            <select name="type" value={formData.type} onChange={handleChange} required>
              <option value="tuition">Tuition</option>
              <option value="carpool">Carpooling</option>
              <option value="resource">Resource sharing</option>
            </select>
            <input name="title" placeholder="Short title" value={formData.title} onChange={handleChange} required />
            {renderDynamicFields()}
            <textarea name="details" placeholder="Describe what is needed/offered and any rules." value={formData.details} onChange={handleChange} required />
            <input name="contact" placeholder="Contact number / preferred contact" value={formData.contact} onChange={handleChange} required />
            <button type="submit" className="submit-btn">Publish Post</button>
          </form>
        </section>
      )}

      {activeTab !== 'create' && renderPosts(activeTab)}
    </div>
  );
}

export default ShareCare;

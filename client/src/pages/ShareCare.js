import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ShareCare.css';

const ShareCare = () => {
  const [formData, setFormData] = useState({
    type: 'pickup',
    date: '',
    time: '',
    road: '',
    details: '',
    contact: '',
  });

  const [posts, setPosts] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const username = localStorage.getItem('username');
    if (!username) return alert('Please login first');

    try {
      await axios.post('http://localhost:5000/api/sharecare', {
        ...formData,
        username,
        date: formData.date ? new Date(formData.date).toISOString() : null,
      });
      setFormData({
        type: 'pickup',
        date: '',
        time: '',
        road: '',
        details: '',
        contact: '',
      });
      fetchPosts();
    } catch (error) {
      console.error('Error submitting post:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/sharecare');
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const groupedTypes = ['pickup', 'drop', 'tuitions', 'tools', 'share'];

  return (
  <div className="sharecare-container">
    <h2 className="title">Share Care</h2>

    <div className="sharecare-content">
      {/* Fixed Form on the Left */}
      <form onSubmit={handleSubmit} className="sharecare-form">
        <h3 className="form-title">Create a Share Post 🚀</h3>

        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="input"
          required
        >
          <option value="pickup">Pick Up</option>
          <option value="drop">Drop</option>
          <option value="tuitions">Tuitions</option>
          <option value="tools">Tools</option>
          <option value="share">Share</option>
        </select>

        {(formData.type === 'pickup' || formData.type === 'drop') && (
          <>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="input"
              required
            />

            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="input"
              required
            />

            <input
              type="text"
              name="road"
              placeholder="Road"
              value={formData.road}
              onChange={handleChange}
              className="input"
            />
          </>
        )}

        <textarea
          name="details"
          placeholder="Details (optional)"
          value={formData.details}
          onChange={handleChange}
          className="input"
        />

        <input
          type="text"
          name="contact"
          placeholder="Contact Info"
          value={formData.contact}
          onChange={handleChange}
          className="input"
          required
        />

        <button type="submit" className="submit-btn">
          Submit
        </button>
      </form>

      {/* Posts on the Right */}
      <div className="posts-section">
        {groupedTypes.map((type) => (
          <div key={type} className="group-block">
            <h3 className="group-title">{type}</h3>
            {posts[type]?.length > 0 ? (
              <div className="post-grid">
                {posts[type].map((post) => (
                  <div key={post._id} className="post-card">
                    <p><span>👤</span> <strong>{post.username}</strong></p>
                    <p><span>📞</span> {post.contact}</p>
                    {post.date && <p><span>📅</span> {new Date(post.date).toLocaleDateString()}</p>}
                    {post.time && <p><span>⏰</span> {post.time}</p>}
                    {post.road && <p><span>🛣️</span> {post.road}</p>}
                    {post.details && <p><span>📝</span> {post.details}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No posts available</p>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

};

export default ShareCare;

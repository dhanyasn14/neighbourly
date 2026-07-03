import React, { useEffect, useMemo, useState } from 'react';
import './Commspace.css';
import { apiFetch } from '../services/api';
import PageNav from '../components/PageNav';

const sortOptions = {
  name: { label: 'Name', getValue: user => user.name || user.username || '' },
  profession: { label: 'Profession', getValue: user => user.bio?.profession || '' },
  house: { label: 'House', getValue: user => user.address?.houseNumber || '' },
  businessLocation: { label: 'Business Location', getValue: user => user.bio?.businessLocation || '' },
};

const displayValue = (value) => {
  return value && String(value).trim() !== '' ? value : 'N/A';
};

const buildAddress = (address) => {
  if (!address) return 'N/A';
  return [address.houseNumber, address.streetName, address.areaName, address.landmark].filter(Boolean).join(', ') || 'N/A';
};

function Commspace() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    apiFetch('/commspace')
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching resident directory:', err));
  }, []);

  const visibleUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = users.filter(user => {
      const searchable = [
        user.name,
        user.username,
        user.email,
        user.phoneNumber,
        user.address?.houseNumber,
        user.address?.streetName,
        user.address?.areaName,
        user.bio?.profession,
        user.bio?.businessName,
        user.bio?.businessLocation,
        user.bio?.helpOffer,
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(query);
    });

    const option = sortOptions[sortBy] || sortOptions.name;
    return filtered.sort((a, b) => option.getValue(a).localeCompare(option.getValue(b), undefined, { numeric: true }));
  }, [users, searchTerm, sortBy]);

  return (
    <div className="commspace-container">
      <PageNav />
      <section className="page-hero compact">
        <span className="eyebrow">Resident Directory</span>
        <h1>Find the people, skills, and support inside your community.</h1>
      </section>

      <section className="directory-toolbar">
        <label>
          Search residents
          <div className="search-input">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              type="search"
              placeholder="Search name, house, profession, business..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </label>

        <label>
          Sort by
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {Object.entries(sortOptions).map(([value, option]) => (
              <option key={value} value={value}>{option.label}</option>
            ))}
          </select>
        </label>

        <div className="directory-count">
          <strong>{visibleUsers.length}</strong>
          <span>Residents shown</span>
        </div>
      </section>

      <div className="user-cards">
        {visibleUsers.map((user) => (
          <article key={user.username} className={`user-card ${user.isRemoved ? 'removed' : ''}`.trim()}>
            <div className="resident-card-header">
              <div>
                <h3>{displayValue(user.name)}</h3>
                <span>@{displayValue(user.username)}</span>
              </div>
              {user.isRemoved ? (
                <span className="resident-status-badge">User removed</span>
              ) : (
                <i className="fa-solid fa-user-group" aria-hidden="true"></i>
              )}
            </div>
            <p><strong>Phone</strong> {displayValue(user.phoneNumber)}</p>
            <p><strong>Email</strong> {displayValue(user.email)}</p>
            <p><strong>Address</strong> {buildAddress(user.address)}</p>
            <p><strong>Profession</strong> {displayValue(user.bio?.profession)}</p>
            <p><strong>Business</strong> {displayValue(user.bio?.businessName)}</p>
            <p><strong>Business Location</strong> {displayValue(user.bio?.businessLocation)}</p>
            <p><strong>Help Offered</strong> {displayValue(user.bio?.helpOffer)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default Commspace;

import React, { useEffect, useState } from 'react';
import './Account.css';

function Account() {
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [usernames, setUsernames] = useState([]);
  const [meetingIds, setMeetingIds] = useState([]);
  const [eventIds, setEventIds] = useState([]);

  const [filters, setFilters] = useState({
    type: '',
    username: '',
    meetingId: '',
    eventId: ''
  });

  const [totals, setTotals] = useState({ credited: 0, debited: 0 });

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/accounts');
      const data = await res.json();
      setTransactions(data);

      // Populate unique sets
      const users = [...new Set(data.map(t => t.username))];
      const meetings = [...new Set(data.flatMap(t => t.meetingIds))];
      const events = [...new Set(data.flatMap(t => t.eventIds))];

      setUsernames(users);
      setMeetingIds(meetings);
      setEventIds(events);
    } catch (err) {
      console.error('Error fetching transactions', err);
    }
  };

  const applyFilters = () => {
  let filteredData = [...transactions];

  if (filters.type) {
    filteredData = filteredData.filter(
      t => t.type && t.type.toLowerCase() === filters.type.toLowerCase()
    );
  }
  if (filters.username) {
    filteredData = filteredData.filter(
      t => t.username && t.username === filters.username
    );
  }
  if (filters.meetingId) {
    filteredData = filteredData.filter(
      t => Array.isArray(t.meetingIds) && t.meetingIds.includes(filters.meetingId)
    );
  }
  if (filters.eventId) {
    filteredData = filteredData.filter(
      t => Array.isArray(t.eventIds) && t.eventIds.includes(filters.eventId)
    );
  }

  setFiltered(filteredData);

  // Calculate totals safely
  const credited = filteredData
    .filter(t => t.type && t.type.toLowerCase() === 'credited')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const debited = filteredData
    .filter(t => t.type && t.type.toLowerCase() === 'debited')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  setTotals({ credited, debited });
};

  return (
  <div className="account-container">
    <h2>Account Details</h2>

    <div className="bank-info">
      <p><strong>Bank Name:</strong> State Bank of Neighborly</p>
      <p><strong>Bank ID:</strong> 1234567890</p>
      <p><strong>IFSC:</strong> SBIN0001234</p>
    </div>

    <div className="filter-bar">
      <select
        value={filters.username}
        onChange={(e) => setFilters({ ...filters, username: e.target.value })}
      >
        <option value="">Filter by Username</option>
        {usernames.map((user, i) => (
          <option key={i} value={user}>{user}</option>
        ))}
      </select>

      <select
        value={filters.meetingId}
        onChange={(e) => setFilters({ ...filters, meetingId: e.target.value })}
      >
        <option value="">Filter by Meeting ID</option>
        {meetingIds.map((id, i) => (
          <option key={i} value={id}>{id}</option>
        ))}
      </select>

      <select
        value={filters.eventId}
        onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
      >
        <option value="">Filter by Event ID</option>
        {eventIds.map((id, i) => (
          <option key={i} value={id}>{id}</option>
        ))}
      </select>

      <select
        value={filters.type}
        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
      >
        <option value="">All</option>
        <option value="credited">Credited</option>
        <option value="debited">Debited</option>
      </select>
    </div>

    <div className="totals-bar">
      <strong>Total Credited:</strong> ₹{totals.credited} &nbsp; | &nbsp;
      <strong>Total Debited:</strong> ₹{totals.debited} &nbsp; | &nbsp;
      <strong>Net:</strong> ₹{totals.credited - totals.debited}
    </div>

    <div className="account-table-wrapper">
  <table className="account-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Meeting IDs</th>
        <th>Event IDs</th>
        <th>Amount</th>
        <th>Username</th>
      </tr>
    </thead>
    <tbody>
      {filtered.map((tx, idx) => (
        <tr key={idx}>
          <td>{new Date(tx.transactionDate).toLocaleDateString()}</td>
          <td>{tx.type}</td>
          <td>{tx.meetingIds.join(', ')}</td>
          <td>{tx.eventIds.join(', ')}</td>
          <td>{tx.amount}</td>
          <td>{tx.username}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

    <div className="fun-phrase">
      “Keep calm and balance your books — one transaction at a time.”
    </div>
  </div>
);

}

export default Account;

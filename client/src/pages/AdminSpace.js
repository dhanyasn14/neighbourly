import React, { useState, useEffect } from 'react';
import './AdminSpace.css';
function AdminSpace() {
  const [tab, setTab] = useState('addUser');

  // ---------- State for Add User ----------
  const [newUser, setNewUser] = useState({
    username: '', password: '', name: '', phoneNumber: '', ownership: '',
    role: '', email: '',
    address: { houseNumber: '', streetName: '', areaName: '', landmark: '' },
    bio: { profession: '', about: '', businessName: '', businessLocation: '', helpOffer: '' }
  });

  // ---------- State for Meeting Requests ----------
  const [pendingMeetings, setPendingMeetings] = useState([]);

  // ---------- State for Edit User ----------
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // ---------- State for Transactions ----------
  const [transaction, setTransaction] = useState({
    transactionType: 'Credited',
    amount: '',
    meetingIds: [],
    eventIds: [],
    username: '',
  });
  const [meetingSuggestions, setMeetingSuggestions] = useState([]);
  const [eventSuggestions, setEventSuggestions] = useState([]);
  const [userSuggestions, setUserSuggestions] = useState([]);

  useEffect(() => {
    if (tab === 'meetingRequests') fetchPendingMeetings();
    if (tab === 'editUser') fetchAllUsers();
    if (tab === 'transaction') fetchAllIDs();
  }, [tab]);

  const handleAddUser = async () => {
    const res = await fetch('http://localhost:5000/api/space/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    alert(res.ok ? 'User added' : 'Failed to add user');
  };

  const fetchPendingMeetings = async () => {
    const res = await fetch('http://localhost:5000/api/space/pending-meetings');
    const data = await res.json();
    setPendingMeetings(data);
  };

  const handleMeetingDecision = async (id, status) => {
    await fetch(`http://localhost:5000/api/space/update-meeting/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchPendingMeetings();
  };

  const fetchAllUsers = async () => {
    const res = await fetch('http://localhost:5000/api/space/users');
    const data = await res.json();
    setAllUsers(data);
  };

  const fetchSelectedUser = async (username) => {
    const res = await fetch(`http://localhost:5000/api/space/user/${username}`);
    const data = await res.json();
    setSelectedUser(data);
  };

  const updateSelectedUser = async () => {
    const res = await fetch(`http://localhost:5000/api/space/edit-user/${selectedUser.username}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedUser)
    });
    alert(res.ok ? 'User updated' : 'Failed to update user');
  };

  const fetchAllIDs = async () => {
    const res = await fetch('http://localhost:5000/api/space/all-ids');
    const data = await res.json();
    setMeetingSuggestions(data.meetingIds);
    setEventSuggestions(data.eventIds);
    setUserSuggestions(data.usernames);
  };

  const submitTransaction = async () => {
    const body = {
      ...transaction,
      transactionDate: new Date(),
    };
    const res = await fetch('http://localhost:5000/api/space/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    alert(res.ok ? 'Transaction submitted' : 'Failed');
  };

  return (
  <div className="admin-layout">
    <div className="tab-buttons">
      <button className={tab === 'addUser' ? 'active' : ''} onClick={() => setTab('addUser')}>
        👤 Add User
      </button>
      <button className={tab === 'meetingRequests' ? 'active' : ''} onClick={() => setTab('meetingRequests')}>
        📅 Meeting Requests
      </button>
      <button className={tab === 'editUser' ? 'active' : ''} onClick={() => setTab('editUser')}>
        ✏️ Edit User
      </button>
      <button className={tab === 'transaction' ? 'active' : ''} onClick={() => setTab('transaction')}>
        💰 Transactions
      </button>
    </div>

    <div className="tab-content-area">
      <h1>Admin Space</h1>
      <div className="admin-tagline">🛠️ Manage, Moderate, Make Magic!</div>

      {tab === 'addUser' && (
        <div className="tab-section">
          <h2>Add User</h2>
          {['name', 'username', 'password', 'phoneNumber', 'email', 'ownership', 'role'].map((field) => (
            <input key={field} placeholder={field} onChange={e => setNewUser({ ...newUser, [field]: e.target.value })} />
          ))}
          {['houseNumber', 'streetName', 'areaName', 'landmark'].map((field) => (
            <input key={field} placeholder={field} onChange={e => setNewUser({ ...newUser, address: { ...newUser.address, [field]: e.target.value } })} />
          ))}
          <button onClick={handleAddUser}>Submit</button>
        </div>
      )}

      {tab === 'meetingRequests' && (
        <div className="tab-section">
          <h2>Meeting Requests</h2>
          <ul>
            {pendingMeetings.map((m, i) => (
              <li key={i} className="meeting-card">
                <strong>Username:</strong> {m.username}<br />
                <strong>Meeting ID:</strong> {m.meetingId}<br />
                <strong>Purpose:</strong> {m.purpose}<br />
                <strong>Date:</strong> {new Date(m.date).toLocaleString()}<br />
                <strong>Status:</strong> {m.request}<br />
                <button onClick={() => handleMeetingDecision(m._id, 'Done')}>Accept</button>
                <button onClick={() => handleMeetingDecision(m._id, 'Rejected')}>Reject</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'editUser' && (
        <div className="tab-section edit-user-section">
          <ul className="user-list-horizontal">
            {allUsers.map((u, i) => (
              <li
                key={i}
                className={selectedUser?.username === u.username ? 'selected' : ''}
                onClick={() => fetchSelectedUser(u.username)}
              >
                {u.username}
              </li>
            ))}
          </ul>

          {selectedUser && (
            <div className="edit-user-form">
              <h3>Edit: {selectedUser.username}</h3>
              {['name', 'username', 'password', 'email', 'phoneNumber', 'ownership'].map((field) => (
                <input
                  key={field}
                  value={selectedUser[field]}
                  onChange={e => setSelectedUser({ ...selectedUser, [field]: e.target.value })}
                  placeholder={field}
                />
              ))}
              {['houseNumber', 'streetName', 'areaName', 'landmark'].map((field) => (
                <input
                  key={field}
                  value={selectedUser.address[field]}
                  onChange={e =>
                    setSelectedUser({
                      ...selectedUser,
                      address: { ...selectedUser.address, [field]: e.target.value }
                    })
                  }
                  placeholder={field}
                />
              ))}
              <button onClick={updateSelectedUser}>Update</button>
            </div>
          )}
        </div>
      )}

      {tab === 'transaction' && (
        <div className="tab-section">
          <h2>Transaction</h2>
          <select onChange={e => setTransaction({ ...transaction, transactionType: e.target.value })}>
            <option value="Credited">Credited</option>
            <option value="Debited">Debited</option>
          </select>
          <input placeholder="Amount" onChange={e => setTransaction({ ...transaction, amount: parseFloat(e.target.value) })} />
          <input placeholder="Meeting ID" list="meetings" onChange={e => setTransaction({ ...transaction, meetingIds: [e.target.value] })} />
          <datalist id="meetings">{meetingSuggestions.map((m, i) => <option key={i} value={m} />)}</datalist>
          <input placeholder="Event ID" list="events" onChange={e => setTransaction({ ...transaction, eventIds: [e.target.value] })} />
          <datalist id="events">{eventSuggestions.map((e, i) => <option key={i} value={e} />)}</datalist>
          <input placeholder="Username" list="users" onChange={e => setTransaction({ ...transaction, username: e.target.value })} />
          <datalist id="users">{userSuggestions.map((u, i) => <option key={i} value={u} />)}</datalist>
          <button onClick={submitTransaction}>Submit Transaction</button>
        </div>
      )}
    </div>
  </div>
);


}

export default AdminSpace;

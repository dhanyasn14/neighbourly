import React, { useEffect, useMemo, useState } from 'react';
import './AdminSpace.css';
import { apiFetch } from '../services/api';
import PageNav from '../components/PageNav';
import Toast from '../components/Toast';

const emptyUser = {
  username: '',
  password: '',
  name: '',
  phoneNumber: '',
  ownership: '',
  email: '',
  address: { houseNumber: '', streetName: '', areaName: '', landmark: '' },
  bio: { profession: '', about: '', businessName: '', businessLocation: '', helpOffer: '' },
};

const sanitizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);

const emptyPaymentSettings = {
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  branchName: '',
  upiId: '',
  upiDisplayName: '',
  paymentNote: '',
};

function AdminSpace() {
  const [tab, setTab] = useState('addUser');
  const [newUser, setNewUser] = useState(emptyUser);
  const [pendingMeetings, setPendingMeetings] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(emptyPaymentSettings);
  const [transaction, setTransaction] = useState({
    type: 'Credited',
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
    if (tab === 'transaction') {
      fetchAllIDs();
      fetchPaymentSettings();
    }
  }, [tab]);

  const filteredUsers = useMemo(() => {
    const query = userSearchTerm.trim().toLowerCase();

    if (!query) {
      return allUsers;
    }

    return allUsers.filter(user => {
      const searchable = [
        user.username,
        user.name,
        user.email,
        user.phoneNumber,
        user.address?.houseNumber,
        user.address?.streetName,
        user.address?.areaName,
        user.bio?.profession,
        user.bio?.businessName,
        user.bio?.businessLocation,
        user.isRemoved ? 'removed' : 'active',
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }, [allUsers, userSearchTerm]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const setNewUserField = (field, value) => {
    setNewUser(prev => ({ ...prev, [field]: value }));
  };

  const setNewUserAddress = (field, value) => {
    setNewUser(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const setNewUserBio = (field, value) => {
    setNewUser(prev => ({
      ...prev,
      bio: { ...prev.bio, [field]: value },
    }));
  };

  const setSelectedField = (field, value) => {
    setSelectedUser(prev => ({ ...prev, [field]: value }));
  };

  const setSelectedAddress = (field, value) => {
    setSelectedUser(prev => ({
      ...prev,
      address: { ...(prev.address || {}), [field]: value },
    }));
  };

  const setSelectedBio = (field, value) => {
    setSelectedUser(prev => ({
      ...prev,
      bio: { ...(prev.bio || {}), [field]: value },
    }));
  };

  const handleAddUser = async (event) => {
    event.preventDefault();

    const res = await apiFetch('/space/add-user', {
      method: 'POST',
      body: newUser,
    });
    const data = await res.json();

    if (res.ok) {
      showToast('User created. Share the temporary credentials.');
      setNewUser(emptyUser);
    } else {
      showToast(data.error || 'Failed to add user.', 'error');
    }
  };

  const fetchPendingMeetings = async () => {
    const res = await apiFetch('/space/pending-meetings');
    const data = await res.json();
    setPendingMeetings(data);
  };

  const handleMeetingDecision = async (id, status) => {
    const res = await apiFetch(`/space/update-meeting/${id}`, {
      method: 'PATCH',
      body: { status },
    });
    showToast(res.ok ? `Meeting ${status.toLowerCase()}.` : 'Failed to update meeting.', res.ok ? 'success' : 'error');
    fetchPendingMeetings();
  };

  const fetchAllUsers = async () => {
    const res = await apiFetch('/space/users');
    const data = await res.json();
    setAllUsers(data);
  };

  const fetchSelectedUser = async (username) => {
    const res = await apiFetch(`/space/user/${username}`);
    const data = await res.json();
    setSelectedUser({
      ...emptyUser,
      ...data,
      password: '',
      address: { ...emptyUser.address, ...(data.address || {}) },
      bio: { ...emptyUser.bio, ...(data.bio || {}) },
    });
  };

  const updateSelectedUser = async (event) => {
    event.preventDefault();

    const body = { ...selectedUser };
    if (!body.password) delete body.password;

    const res = await apiFetch(`/space/edit-user/${selectedUser.username}`, {
      method: 'PUT',
      body,
    });
    const data = await res.json();

    showToast(res.ok ? 'User updated.' : data.error || 'Failed to update user.', res.ok ? 'success' : 'error');
  };

  const deleteSelectedUser = async () => {
    if (!selectedUser?.username) return;

    const verification = window.prompt(`Type REMOVE ${selectedUser.username} to block login and hide this profile from residents.`);
    if (verification !== `REMOVE ${selectedUser.username}`) {
      showToast('Removal cancelled. Verification text did not match.', 'error');
      return;
    }

    const confirmed = window.confirm(`Remove login access for ${selectedUser.username} and hide this profile from residents? Transaction history will be retained.`);
    if (!confirmed) {
      showToast('Removal cancelled.', 'error');
      return;
    }

    const res = await apiFetch(`/space/user/${selectedUser.username}`, {
      method: 'DELETE',
    });
    const data = await res.json();

    if (res.ok) {
      showToast('User removed. Login blocked and history retained.');
      setSelectedUser(prev => prev
        ? { ...prev, isRemoved: true, loginDisabled: true, removedAt: new Date().toISOString() }
        : prev);
      fetchAllUsers();
    } else {
      showToast(data.error || 'Failed to remove user access.', 'error');
    }
  };

  const fetchAllIDs = async () => {
    const res = await apiFetch('/space/all-ids');
    const data = await res.json();
    setMeetingSuggestions(data.meetingIds);
    setEventSuggestions(data.eventIds);
    setUserSuggestions(data.usernames);
  };

  const fetchPaymentSettings = async () => {
    const res = await apiFetch('/accounts/payment-settings');
    const data = await res.json();
    setPaymentSettings({ ...emptyPaymentSettings, ...(res.ok ? data : {}) });
  };

  const setPaymentField = (field, value) => {
    setPaymentSettings(prev => ({ ...prev, [field]: value }));
  };

  const submitTransaction = async (event) => {
    event.preventDefault();
    const body = {
      ...transaction,
      transactionDate: new Date(),
    };
    const res = await apiFetch('/space/transaction', {
      method: 'POST',
      body,
    });
    showToast(res.ok ? 'Transaction submitted.' : 'Failed to submit transaction.', res.ok ? 'success' : 'error');
  };

  const submitPaymentSettings = async (event) => {
    event.preventDefault();
    const res = await apiFetch('/accounts/payment-settings', {
      method: 'PUT',
      body: paymentSettings,
    });
    const data = await res.json();

    if (res.ok) {
      setPaymentSettings({ ...emptyPaymentSettings, ...data });
      showToast('Donation payment details updated.');
    } else {
      showToast(data.error || 'Failed to update payment details.', 'error');
    }
  };

  return (
    <div className="admin-layout">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="tab-buttons">
        <button className={tab === 'addUser' ? 'active' : ''} onClick={() => setTab('addUser')}>Add User</button>
        <button className={tab === 'meetingRequests' ? 'active' : ''} onClick={() => setTab('meetingRequests')}>Meeting Requests</button>
        <button className={tab === 'editUser' ? 'active' : ''} onClick={() => setTab('editUser')}>Edit User</button>
        <button className={tab === 'transaction' ? 'active' : ''} onClick={() => setTab('transaction')}>Transactions</button>
      </div>

      <div className="tab-content-area">
        <PageNav />
        <section className="page-hero compact admin-hero">
          <span className="eyebrow">Admin Console</span>
          <h1>Manage residents, approvals, and community transactions.</h1>
        </section>

        {tab === 'addUser' && (
          <form className="tab-section" onSubmit={handleAddUser}>
            <h2>Add User</h2>
            <input required placeholder="Full name" value={newUser.name} onChange={e => setNewUserField('name', e.target.value)} />
            <input required placeholder="Username" value={newUser.username} onChange={e => setNewUserField('username', e.target.value)} />
            <input required type="password" minLength="8" placeholder="Temporary password" value={newUser.password} onChange={e => setNewUserField('password', e.target.value)} />
            <input required type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUserField('email', e.target.value)} />
            <input
              required
              inputMode="numeric"
              maxLength="10"
              pattern="[0-9]{10}"
              title="Phone number must be exactly 10 digits."
              placeholder="10-digit phone number"
              value={newUser.phoneNumber}
              onChange={e => setNewUserField('phoneNumber', sanitizePhone(e.target.value))}
            />
            <select required value={newUser.ownership} onChange={e => setNewUserField('ownership', e.target.value)}>
              <option value="">Ownership</option>
              <option value="Owner">Owner</option>
              <option value="Renter">Renter</option>
            </select>

            <input required placeholder="House number" value={newUser.address.houseNumber} onChange={e => setNewUserAddress('houseNumber', e.target.value)} />
            <input required placeholder="Street name" value={newUser.address.streetName} onChange={e => setNewUserAddress('streetName', e.target.value)} />
            <input required placeholder="Area name" value={newUser.address.areaName} onChange={e => setNewUserAddress('areaName', e.target.value)} />
            <input placeholder="Landmark" value={newUser.address.landmark} onChange={e => setNewUserAddress('landmark', e.target.value)} />

            <input required placeholder="Profession" value={newUser.bio.profession} onChange={e => setNewUserBio('profession', e.target.value)} />
            <textarea required placeholder="About user" value={newUser.bio.about} onChange={e => setNewUserBio('about', e.target.value)} />
            <input placeholder="Business name" value={newUser.bio.businessName} onChange={e => setNewUserBio('businessName', e.target.value)} />
            <input placeholder="Business location" value={newUser.bio.businessLocation} onChange={e => setNewUserBio('businessLocation', e.target.value)} />
            <textarea placeholder="Help offered" value={newUser.bio.helpOffer} onChange={e => setNewUserBio('helpOffer', e.target.value)} />
            <button type="submit">Create User</button>
          </form>
        )}

        {tab === 'meetingRequests' && (
          <div className="tab-section">
            <h2>Meeting Requests</h2>
            <ul>
              {pendingMeetings.map((m) => (
                <li key={m._id} className="meeting-card">
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
            <div className="admin-user-search">
              <label>
                Search users
                <div className="admin-user-search-input">
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                  <input
                    type="search"
                    placeholder="Name, username, house, email, phone, profession..."
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                  />
                </div>
              </label>
              <span>{filteredUsers.length} of {allUsers.length}</span>
            </div>
            <ul className="user-list-horizontal">
              {filteredUsers.map((u) => (
                <li
                  key={u.username}
                  className={`${selectedUser?.username === u.username ? 'selected' : ''} ${u.isRemoved ? 'removed' : ''}`.trim()}
                  onClick={() => fetchSelectedUser(u.username)}
                >
                  <span>{u.username}</span>
                  {u.isRemoved && <small>Removed</small>}
                </li>
              ))}
            </ul>
            {filteredUsers.length === 0 && <p className="admin-empty-state">No users match this search.</p>}

            {selectedUser && (
              <form className="edit-user-form" onSubmit={updateSelectedUser}>
                <div className="edit-user-heading">
                  <h3>Edit: {selectedUser.username}</h3>
                  {selectedUser.isRemoved && <span className="admin-removed-badge">User removed</span>}
                </div>
                <input required placeholder="Full name" value={selectedUser.name || ''} onChange={e => setSelectedField('name', e.target.value)} />
                <input required readOnly placeholder="Username" value={selectedUser.username || ''} />
                <input type="password" minLength="8" placeholder="New password (optional)" value={selectedUser.password || ''} onChange={e => setSelectedField('password', e.target.value)} />
                <input required type="email" placeholder="Email" value={selectedUser.email || ''} onChange={e => setSelectedField('email', e.target.value)} />
                <input
                  required
                  inputMode="numeric"
                  maxLength="10"
                  pattern="[0-9]{10}"
                  title="Phone number must be exactly 10 digits."
                  placeholder="10-digit phone number"
                  value={selectedUser.phoneNumber || ''}
                  onChange={e => setSelectedField('phoneNumber', sanitizePhone(e.target.value))}
                />
                <select required value={selectedUser.ownership || ''} onChange={e => setSelectedField('ownership', e.target.value)}>
                  <option value="">Ownership</option>
                  <option value="Owner">Owner</option>
                  <option value="Renter">Renter</option>
                </select>

                <input required placeholder="House number" value={selectedUser.address?.houseNumber || ''} onChange={e => setSelectedAddress('houseNumber', e.target.value)} />
                <input required placeholder="Street name" value={selectedUser.address?.streetName || ''} onChange={e => setSelectedAddress('streetName', e.target.value)} />
                <input required placeholder="Area name" value={selectedUser.address?.areaName || ''} onChange={e => setSelectedAddress('areaName', e.target.value)} />
                <input placeholder="Landmark" value={selectedUser.address?.landmark || ''} onChange={e => setSelectedAddress('landmark', e.target.value)} />

                <input required placeholder="Profession" value={selectedUser.bio?.profession || ''} onChange={e => setSelectedBio('profession', e.target.value)} />
                <textarea required placeholder="About user" value={selectedUser.bio?.about || ''} onChange={e => setSelectedBio('about', e.target.value)} />
                <input placeholder="Business name" value={selectedUser.bio?.businessName || ''} onChange={e => setSelectedBio('businessName', e.target.value)} />
                <input placeholder="Business location" value={selectedUser.bio?.businessLocation || ''} onChange={e => setSelectedBio('businessLocation', e.target.value)} />
                <textarea placeholder="Help offered" value={selectedUser.bio?.helpOffer || ''} onChange={e => setSelectedBio('helpOffer', e.target.value)} />

                <button type="submit">Update User</button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={deleteSelectedUser}
                  disabled={selectedUser.isRemoved}
                >
                  {selectedUser.isRemoved ? 'User Removed' : 'Remove User'}
                </button>
              </form>
            )}
          </div>
        )}

        {tab === 'transaction' && (
          <div className="admin-transaction-grid">
            <form className="tab-section" onSubmit={submitTransaction}>
              <h2>Transaction</h2>
              <select value={transaction.type} onChange={e => setTransaction({ ...transaction, type: e.target.value })}>
                <option value="Credited">Credited</option>
                <option value="Debited">Debited</option>
              </select>
              <input required type="number" min="1" placeholder="Amount" value={transaction.amount} onChange={e => setTransaction({ ...transaction, amount: parseFloat(e.target.value) })} />
              <input placeholder="Meeting ID" list="meetings" onChange={e => setTransaction({ ...transaction, meetingIds: e.target.value ? [e.target.value] : [] })} />
              <datalist id="meetings">{meetingSuggestions.map((m) => <option key={m} value={m} />)}</datalist>
              <input placeholder="Event ID" list="events" onChange={e => setTransaction({ ...transaction, eventIds: e.target.value ? [e.target.value] : [] })} />
              <datalist id="events">{eventSuggestions.map((eventId) => <option key={eventId} value={eventId} />)}</datalist>
              <input required placeholder="Username" list="users" value={transaction.username} onChange={e => setTransaction({ ...transaction, username: e.target.value })} />
              <datalist id="users">{userSuggestions.map((u) => <option key={u} value={u} />)}</datalist>
              <button type="submit">Submit Transaction</button>
            </form>

            <form className="tab-section payment-settings-form" onSubmit={submitPaymentSettings}>
              <h2>Donation Payment Details</h2>
              <input placeholder="Account holder name" value={paymentSettings.accountHolderName} onChange={e => setPaymentField('accountHolderName', e.target.value)} />
              <input placeholder="Bank name" value={paymentSettings.bankName} onChange={e => setPaymentField('bankName', e.target.value)} />
              <input inputMode="numeric" placeholder="Account number" value={paymentSettings.accountNumber} onChange={e => setPaymentField('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 20))} />
              <input placeholder="IFSC code" value={paymentSettings.ifscCode} onChange={e => setPaymentField('ifscCode', e.target.value.toUpperCase())} />
              <input placeholder="Branch name" value={paymentSettings.branchName} onChange={e => setPaymentField('branchName', e.target.value)} />
              <input placeholder="UPI ID, e.g. community@upi" value={paymentSettings.upiId} onChange={e => setPaymentField('upiId', e.target.value)} />
              <input placeholder="UPI display name" value={paymentSettings.upiDisplayName} onChange={e => setPaymentField('upiDisplayName', e.target.value)} />
              <textarea placeholder="Payment note" value={paymentSettings.paymentNote} onChange={e => setPaymentField('paymentNote', e.target.value)} />
              <button type="submit">Save Payment Details</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSpace;

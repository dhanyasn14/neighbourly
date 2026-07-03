import React, { useEffect, useState } from 'react';
import './Profile.css';
import { apiFetch } from '../services/api';
import PageNav from '../components/PageNav';

const emptyProfile = {
  name: '',
  email: '',
  phoneNumber: '',
  ownership: '',
  address: {
    houseNumber: '',
    streetName: '',
    areaName: '',
    landmark: '',
  },
  bio: {
    profession: '',
    about: '',
    businessName: '',
    businessLocation: '',
    helpOffer: '',
  },
};

const emptyPasswordForm = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const sanitizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);

function Profile() {
  const username = localStorage.getItem('username');
  const userType = localStorage.getItem('userType');

  const [userData, setUserData] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');

  useEffect(() => {
    apiFetch(`/profile/${userType}/${username}`)
      .then(res => res.json())
      .then(data => {
        const nextProfile = {
          ...emptyProfile,
          ...data,
          address: {
            ...emptyProfile.address,
            ...(data.address || {}),
          },
          bio: {
            ...emptyProfile.bio,
            ...(data.bio || {}),
          },
        };

        setUserData(data);
        setProfileForm(nextProfile);
      });
  }, [username, userType]);

  const updateField = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const updateAddressField = (field, value) => {
    setProfileForm(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const updateBioField = (field, value) => {
    setProfileForm(prev => ({
      ...prev,
      bio: { ...prev.bio, [field]: value },
    }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setStatus('');

    const res = await apiFetch(`/profile/${userType}/${username}`, {
      method: 'PUT',
      body: { profile: profileForm },
    });
    const data = await res.json();

    if (res.ok) {
      setUserData(data);
      setStatus('Profile updated.');
      setIsEditing(false);
    } else {
      setStatus(data.message || 'Failed to update profile.');
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordStatus('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus('New password and confirmation do not match.');
      return;
    }

    const res = await apiFetch('/profile/password', {
      method: 'PATCH',
      body: passwordForm,
    });
    const data = await res.json();

    if (res.ok) {
      setPasswordForm(emptyPasswordForm);
      setPasswordStatus('Password changed.');
    } else {
      setPasswordStatus(data.message || 'Failed to change password.');
    }
  };

  if (!userData) return <p>Loading...</p>;

  return (
    <div className="profile-container">
      <PageNav />
      <section className="page-hero compact">
        <span className="eyebrow">Resident Profile</span>
        <h1>Keep your community identity and contact details accurate.</h1>
      </section>
      {status && <p className="profile-status">{status}</p>}

      {isEditing ? (
        <form className="profile-bio" onSubmit={handleProfileSubmit}>
          <input required name="name" placeholder="Full name" value={profileForm.name} onChange={e => updateField('name', e.target.value)} />
          <input required name="email" type="email" placeholder="Email" value={profileForm.email} onChange={e => updateField('email', e.target.value)} />
          <input
            required
            name="phoneNumber"
            inputMode="numeric"
            maxLength="10"
            pattern="[0-9]{10}"
            title="Phone number must be exactly 10 digits."
            placeholder="10-digit phone number"
            value={profileForm.phoneNumber}
            onChange={e => updateField('phoneNumber', sanitizePhone(e.target.value))}
          />
          <select required value={profileForm.ownership} onChange={e => updateField('ownership', e.target.value)}>
            <option value="">Ownership</option>
            <option value="Owner">Owner</option>
            <option value="Renter">Renter</option>
          </select>

          <input required placeholder="House number" value={profileForm.address.houseNumber} onChange={e => updateAddressField('houseNumber', e.target.value)} />
          <input required placeholder="Street name" value={profileForm.address.streetName} onChange={e => updateAddressField('streetName', e.target.value)} />
          <input required placeholder="Area name" value={profileForm.address.areaName} onChange={e => updateAddressField('areaName', e.target.value)} />
          <input placeholder="Landmark" value={profileForm.address.landmark} onChange={e => updateAddressField('landmark', e.target.value)} />

          <input required placeholder="Profession" value={profileForm.bio.profession} onChange={e => updateBioField('profession', e.target.value)} />
          <textarea required placeholder="About you" value={profileForm.bio.about} onChange={e => updateBioField('about', e.target.value)} />
          <input placeholder="Business name" value={profileForm.bio.businessName} onChange={e => updateBioField('businessName', e.target.value)} />
          <input placeholder="Business location" value={profileForm.bio.businessLocation} onChange={e => updateBioField('businessLocation', e.target.value)} />
          <textarea placeholder="How can you help the neighborhood?" value={profileForm.bio.helpOffer} onChange={e => updateBioField('helpOffer', e.target.value)} />

          <button type="submit">Save Profile</button>
          <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
        </form>
      ) : (
        <>
          <div className="profile-info">
            <p><strong>Name:</strong> {userData.name}</p>
            <p><strong>Email:</strong> {userData.email}</p>
            <p><strong>Phone:</strong> {userData.phoneNumber}</p>
            <p><strong>Ownership:</strong> {userData.ownership}</p>
            <p><strong>Address:</strong> {userData.address && Object.values(userData.address).filter(Boolean).join(', ')}</p>
          </div>

          <hr />
          <h3>Professional & Community Details</h3>
          <p><strong>Profession:</strong> {profileForm.bio.profession}</p>
          <p><strong>About:</strong> {profileForm.bio.about}</p>
          <p><strong>Business:</strong> {profileForm.bio.businessName || 'N/A'}</p>
          <p><strong>Business Location:</strong> {profileForm.bio.businessLocation || 'N/A'}</p>
          <p><strong>Offers Help:</strong> {profileForm.bio.helpOffer || 'N/A'}</p>
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
        </>
      )}

      <hr />
      <h3>Change Password</h3>
      {passwordStatus && <p className="profile-status">{passwordStatus}</p>}
      <form className="profile-bio" onSubmit={handlePasswordSubmit}>
        <input required type="password" placeholder="Old password" value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} />
        <input required type="password" minLength="8" placeholder="New password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
        <input required type="password" minLength="8" placeholder="Confirm new password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
        <button type="submit">Change Password</button>
      </form>
    </div>
  );
}

export default Profile;

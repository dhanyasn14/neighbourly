import React, { useEffect, useState } from 'react';
import './Commspace.css'; // Import this line

const Commspace = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/commspace')
      .then((res) => res.json())
      .then((data) => {
        console.log('Fetched users:', data);
        setUsers(data);
      })
      .catch((err) => console.error('Error fetching Commspace users:', err));
  }, []);

  const displayValue = (value) => {
    return value && value.trim() !== '' ? value : 'N/A';
  };

  return (
    <div className="commspace-container">
      <h2 className="commspace-title">Community Space</h2>
      <div className="user-cards">
        {users.map((user, index) => (
          <div key={index} className="user-card">
            <h3>{displayValue(user.name)}</h3>
            <p><strong>Username:</strong> {displayValue(user.username)}</p>
            <p><strong>Phone:</strong> {displayValue(user.phoneNumber)}</p>
            <p><strong>Email:</strong> {displayValue(user.email)}</p>
            <p><strong>House:</strong> {displayValue(user.address?.houseNumber)}</p>
            <p><strong>Profession:</strong> {displayValue(user.bio?.profession)}</p>
            <p><strong>Business Name:</strong> {displayValue(user.bio?.business)}</p>
            <p><strong>Business Location:</strong> {displayValue(user.bio?.location)}</p>
            <p><strong>Help Offered:</strong> {displayValue(user.bio?.help)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Commspace;

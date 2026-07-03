import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PageNav.css';

function PageNav() {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/home');
  };

  return (
    <div className="page-nav" aria-label="Page navigation">
      <button type="button" onClick={goBack} aria-label="Go back" title="Back">
        <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
      </button>
    </div>
  );
}

export default PageNav;

import React, { useEffect } from 'react';
import './Toast.css';

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast?.message) return undefined;

    const timer = window.setTimeout(() => {
      onClose();
    }, toast.duration || 3200);

    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast?.message) return null;

  return (
    <div className={`toast-message ${toast.type || 'success'}`} role="status" aria-live="polite">
      <i className={toast.type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check'} aria-hidden="true"></i>
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">
        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
  );
}

export default Toast;

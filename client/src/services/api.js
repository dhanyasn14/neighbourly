const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function getSession() {
  return {
    token: localStorage.getItem('token'),
    username: localStorage.getItem('username'),
    userType: localStorage.getItem('userType'),
  };
}

export function setSession({ token, username, userType }) {
  localStorage.setItem('token', token);
  localStorage.setItem('username', username);
  localStorage.setItem('userType', userType);
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('userType');
}

export function apiUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
  };
  const config = {
    ...options,
    headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(apiUrl(path), config);

  if (response.status === 401) {
    clearSession();
  }

  return response;
}

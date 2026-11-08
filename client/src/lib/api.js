import { useAuthStore } from '../store/authStore.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    // The session lives in an httpOnly cookie, not a header we attach —
    // this is what makes the browser actually send/accept it, since the
    // API runs on a different origin (port) than the frontend in dev.
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && auth) {
    useAuthStore.getState().logout();
  }
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

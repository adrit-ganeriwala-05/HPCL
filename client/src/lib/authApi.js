import { api } from './api.js';
import { useAuthStore } from '../store/authStore.js';

export async function login(email, password) {
  const data = await api.post('/auth/login', { email, password }, { auth: false });
  useAuthStore.getState().setSession(data.user);
  return data.user;
}

export async function register({ name, email, password, companyName, phone }) {
  const data = await api.post('/auth/register', { name, email, password, companyName, phone }, { auth: false });
  useAuthStore.getState().setSession(data.user);
  return data.user;
}

// credential is the ID token JWT from @react-oauth/google's onSuccess
// callback — the server verifies it (signature + audience + email_verified)
// before trusting anything in it; nothing here is trusted client-side.
// Same account either way: an existing email logs in as whatever it already
// is, a new one is provisioned as a client — see GoogleAuthHandler.SignIn.
export async function signInWithGoogle(credential) {
  const data = await api.post('/auth/google', { credential }, { auth: false });
  useAuthStore.getState().setSession(data.user);
  return data.user;
}

// Logging out is more than just clearing the token — see lib/useLogout.js
// for the real implementation (server-side cookie clear + query cache +
// navigation). This file has no access to hooks, so it can't do that
// itself; nothing should import a bare logout() from here.

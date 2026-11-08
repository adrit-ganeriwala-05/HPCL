import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore.js';
import { api } from './api.js';

// The single logout path for the whole app. Four things every time, no
// exceptions: tell the server to clear the httpOnly auth cookie (fire-and-
// forget — local logout doesn't wait on the network), clear TanStack
// Query's cache (otherwise a previous session's cached orders/employees/
// etc. can still be sitting in memory when a different user logs in right
// after — looks like "wrong data" or "stuck on the old screen"), clear the
// auth store, then navigate to /login explicitly rather than hoping
// ProtectedRoute's reactive redirect fires in time.
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return function logout() {
    api.post('/auth/logout', undefined, { auth: false }).catch(() => {});
    queryClient.clear();
    useAuthStore.getState().logout();
    navigate('/login', { replace: true });
  };
}

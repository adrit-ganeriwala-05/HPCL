import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// The JWT itself is never stored here — it lives only in an httpOnly cookie
// the backend sets, invisible to this (or any) JS on the page. That's the
// entire point: no client-side code, XSS payload included, can ever read
// it. `user` is just cached UI state (name/role/permissions, nothing
// secret) so the app can render instantly on load instead of blocking on
// a network round-trip; App.jsx reconciles it against GET /api/auth/me
// right after mount and logs out automatically if the cookie's gone/expired.
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setSession: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'hpcl-auth' }
  )
);

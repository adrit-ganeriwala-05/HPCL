import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';
import { useAuthStore } from '../store/authStore.js';

// Same payload shape as GET /auth/me (see routes.go — /profile GETs the
// same handler) — kept as its own query key so the Edit Profile page can
// refetch/invalidate independently of anything else that happens to read
// the session.
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/profile'),
  });
}

// On success, also pushes the fresh name/contact info into authStore so
// the navbar/portal header update immediately — without this the header
// would keep showing the pre-edit name until the next full page load.
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.put('/profile', payload),
    onSuccess: (user) => {
      useAuthStore.getState().setSession(user);
      qc.setQueryData(['profile'], user);
    },
  });
}

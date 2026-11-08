import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';

export function useClients() {
  return useQuery({ queryKey: ['clients'], queryFn: () => api.get('/clients') });
}

// Staff edit of a client's contact details (never their email). Also
// refetches orders, since order cards show the client's name/phone.
export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => api.put(`/clients/${id}`, payload),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['clients'] }),
        qc.invalidateQueries({ queryKey: ['orders'] }),
      ]),
  });
}

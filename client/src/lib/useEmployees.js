import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';

export function useEmployees() {
  return useQuery({ queryKey: ['employees'], queryFn: () => api.get('/employees') });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/employees', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useUpdateEmployeePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...permissions }) => api.patch(`/employees/${id}/permissions`, permissions),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

// "Remove employee" = deactivate (isActive: false), not delete — their
// orders/audit history stays intact. isActive: true undoes it.
export function useSetEmployeeActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/employees/${id}/status`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

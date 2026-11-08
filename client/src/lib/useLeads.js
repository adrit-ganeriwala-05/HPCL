import { useQuery } from '@tanstack/react-query';
import { api } from './api.js';

export function useLeads() {
  return useQuery({ queryKey: ['leads'], queryFn: () => api.get('/leads') });
}

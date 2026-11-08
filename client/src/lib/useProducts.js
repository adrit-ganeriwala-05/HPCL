import { useQuery } from '@tanstack/react-query';
import { api } from './api.js';

export function useProducts({ category, includeInactive } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (includeInactive) params.set('includeInactive', 'true');
  const qs = params.toString();

  return useQuery({
    queryKey: ['products', category ?? 'all', includeInactive ?? false],
    queryFn: () => api.get(qs ? `/products?${qs}` : '/products', { auth: false }),
  });
}

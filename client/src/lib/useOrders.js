import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';

// Same GET /orders endpoint for both client and admin — the Go API branches
// by role server-side (own orders vs. all orders), so one hook covers both.
export function useOrders(status) {
  return useQuery({
    queryKey: ['orders', status ?? 'all'],
    queryFn: () => api.get(status ? `/orders?status=${encodeURIComponent(status)}` : '/orders'),
  });
}

// payload: { items } for client self-service, or { clientId, items } when
// an admin/employee places an order on a client's behalf.
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/orders', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useApproveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId) => api.post(`/orders/${orderId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useReorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId) => api.post(`/orders/${orderId}/reorder`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

// Client-only — the server rejects this unless the order is currently
// Dispatched and belongs to the caller (see OrderHandler.ConfirmDelivery).
export function useConfirmDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId) => api.post(`/orders/${orderId}/confirm-delivery`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useAddOrderNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }) => api.post(`/orders/${id}/notes`, { text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

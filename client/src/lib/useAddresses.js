import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';
import { api } from './api.js';

// The logged-in client's delivery addresses. No user id is sent anywhere
// here: the server reads it from the session cookie and only ever returns
// or edits the caller's own rows (see AddressHandler in services/api).
export function useAddresses() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/profile/addresses'),
  });
}

// Every mutation below refetches the whole list on success instead of
// patching the cache with the single row the server returns: saving an
// address with isDefault=true also clears the flag on the user's *other*
// addresses server-side, and the response doesn't include those rows.
// Returning the invalidate promise keeps isPending true until the fresh
// list has arrived, so the UI never shows two "Default" badges in between.
//
// mutationKey ['addresses'] lets useIsAddressMutating() below see every
// one of these at once.

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['addresses'],
    mutationFn: (payload) => api.post('/profile/addresses', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

// variables: { id, ...payload } — the full address body (the server
// requires every field on PUT, not just the ones that changed).
export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['addresses'],
    mutationFn: ({ id, ...payload }) => api.put(`/profile/addresses/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['addresses'],
    mutationFn: (id) => api.del(`/profile/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

// True while any address create/update/delete is in flight, from any
// component — used to disable every address button, not just the one
// that was clicked, so two changes can't race each other.
export function useIsAddressMutating() {
  return useIsMutating({ mutationKey: ['addresses'] }) > 0;
}

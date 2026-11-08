import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';
import { submitInwardEntry } from './inventorySync.js';

// Live current-stock balance per (grade, pack size) — the dashboard.
export function useInventoryStock() {
  return useQuery({ queryKey: ['inventory', 'stock'], queryFn: () => api.get('/inventory') });
}

// entry: { clientTxnId, productId, sizeInLiters, quantityUnits, entryDate }.
// Goes through submitInwardEntry rather than a raw api.post — that's what
// falls back to the offline queue when the request can't complete, instead
// of the mutation just failing outright while the warehouse has no signal.
export function useInwardStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry) => submitInwardEntry(entry),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

// Audit ledger — admin-only server-side (see routes.go), the page gates
// rendering this on the frontend too so a non-admin never even fires it.
export function useInventoryTransactions(productId) {
  return useQuery({
    queryKey: ['inventory', 'transactions', productId ?? 'all'],
    queryFn: () => api.get(productId ? `/inventory/transactions?productId=${productId}` : '/inventory/transactions'),
  });
}

export function useUpdateInventoryTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantityUnits, entryDate }) => api.patch(`/inventory/transactions/${id}`, { quantityUnits, entryDate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

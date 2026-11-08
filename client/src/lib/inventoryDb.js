import Dexie from 'dexie';

// Offline queue for stock-inward entries. `syncedAt` is null while queued;
// rows are deleted once the sync endpoint confirms them, not just marked —
// there's nothing useful to keep around after that.
export const inventoryDb = new Dexie('hpcl-inventory');
inventoryDb.version(1).stores({
  pendingInward: 'clientTxnId, syncedAt',
});

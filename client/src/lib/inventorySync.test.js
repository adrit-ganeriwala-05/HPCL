// Must load before Dexie so Dexie picks up the in-memory IndexedDB.
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('./api.js', () => ({ api: { post: vi.fn() } }));

let queueInwardEntry, syncPendingInward, inventoryDb, api;

beforeAll(async () => {
  // inventorySync.js registers an 'online' listener and a 60s retry timer at
  // import time, and checks navigator.onLine before syncing. The test env is
  // plain Node, so give it a minimal online browser and a timer that never
  // fires on its own (the test calls syncPendingInward directly).
  vi.stubGlobal('window', { addEventListener: vi.fn() });
  vi.stubGlobal('navigator', { onLine: true });
  vi.useFakeTimers({ toFake: ['setInterval'] });
  ({ queueInwardEntry, syncPendingInward } = await import('./inventorySync.js'));
  ({ inventoryDb } = await import('./inventoryDb.js'));
  ({ api } = await import('./api.js'));
  vi.useRealTimers();
});

afterEach(async () => {
  await inventoryDb.pendingInward.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const entry = {
  clientTxnId: 'txn-1',
  productId: 1,
  sizeInLiters: 20,
  quantityUnits: 5,
  entryDate: '2026-11-08',
};

describe('syncPendingInward', () => {
  it('sends a queued entry once and removes it after the server confirms it', async () => {
    await queueInwardEntry(entry);
    api.post.mockResolvedValue({ results: [{ clientTxnId: 'txn-1', status: 'ok' }] });

    await syncPendingInward();

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/inventory/inward/sync', { entries: [entry] });
    expect(await inventoryDb.pendingInward.count()).toBe(0);
  });

  it('keeps the entry queued and logs a warning when the request fails', async () => {
    await queueInwardEntry(entry);
    api.post.mockRejectedValue(new Error('network down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await syncPendingInward();

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    expect(await inventoryDb.pendingInward.count()).toBe(1);
  });
});

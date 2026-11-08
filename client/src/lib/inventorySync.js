import { inventoryDb } from './inventoryDb.js';
import { api } from './api.js';

// Queues an inward entry locally. Called both when genuinely offline and as
// the fallback when a direct online POST fails mid-flight (dropped wifi
// mid-request) — either way the entry has a fixed clientTxnId already, so
// queuing it here and syncing it later can never double-apply it.
export async function queueInwardEntry(entry) {
  await inventoryDb.pendingInward.put({ ...entry, syncedAt: null });
}

// submitInwardEntry is what the stock-inward form calls on save: try a
// direct online sync first (a single-item batch — same endpoint the offline
// queue flush uses), and only fall back to the local queue if that fails.
export async function submitInwardEntry(entry) {
  if (!navigator.onLine) {
    await queueInwardEntry(entry);
    return { queued: true };
  }
  try {
    const { results } = await api.post('/inventory/inward/sync', { entries: [entry] });
    if (results?.[0]?.status === 'ok') return { queued: false };
    throw new Error(results?.[0]?.error || 'sync rejected the entry');
  } catch {
    await queueInwardEntry(entry);
    return { queued: true };
  }
}

// Flushes whatever's queued once connectivity is back. Safe to call
// repeatedly/concurrently — a `syncing` guard keeps overlapping triggers
// (the 'online' event firing right as the periodic fallback also fires)
// from sending the same batch twice; the server's idempotency check would
// no-op the duplicate anyway, but there's no reason to make the request.
let syncing = false;

export async function syncPendingInward() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    // Synced rows are deleted below, so every row still here is pending.
    // Don't filter on syncedAt: it's null while queued, and null isn't a
    // valid IndexedDB key, so where('syncedAt').equals(null) throws.
    const pending = await inventoryDb.pendingInward.toArray();
    if (pending.length === 0) return;

    const entries = pending.map(({ syncedAt: _syncedAt, ...entry }) => entry);
    const { results } = await api.post('/inventory/inward/sync', { entries });

    const okIds = results.filter((r) => r.status === 'ok').map((r) => r.clientTxnId);
    if (okIds.length > 0) {
      await inventoryDb.pendingInward.where('clientTxnId').anyOf(okIds).delete();
    }
  } catch (err) {
    // Leave everything queued — next trigger (reconnect, or the periodic
    // fallback below) retries. Log it so a failure that keeps happening
    // is visible instead of silently stranding the queue.
    console.warn('Inward stock sync failed; entries stay queued for retry.', err);
  } finally {
    syncing = false;
  }
}

// Trigger points: connectivity restored, plus a periodic fallback since the
// 'online' event doesn't fire reliably on every carrier/VPN. Module-scope
// (not inside a component) so it registers exactly once for the app's
// lifetime, same as any other app-wide singleton listener.
window.addEventListener('online', syncPendingInward);
setInterval(() => syncPendingInward(), 60_000);

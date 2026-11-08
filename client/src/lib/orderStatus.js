// All states an order can be in, including the pre-pipeline approval gate.
export const ALL_STATUSES = ['Pending Approval', 'New', 'Quote Sent', 'Dispatched', 'Delivered'];

// What UpdateStatus will actually accept — matches server's validStatuses
// map exactly. Pending Approval is deliberately excluded: it's only ever
// entered at order-creation time and only ever exited via the dedicated
// admin-only Approve action, never via a generic status-set.
export const ORDER_STATUSES = ['New', 'Quote Sent', 'Dispatched', 'Delivered'];

// Legal next statuses for UpdateStatus — same map as allowedTransitions in
// services/api/internal/handlers/order_handler.go. Forward moves only, so an
// order can't re-enter Dispatched and deduct stock twice. Delivered is
// final; Pending Approval is only exited via Approve, so it has no entry.
export const STATUS_TRANSITIONS = {
  New: ['Quote Sent', 'Dispatched'],
  'Quote Sent': ['Dispatched'],
  Dispatched: ['Delivered'],
  Delivered: [],
};

// Bordered, not filled — matches the site's flat/bordered visual language
// instead of soft colored-pill backgrounds.
export const STATUS_STYLES = {
  'Pending Approval': 'border border-error/40 text-error',
  New: 'border border-brand/40 text-brand',
  'Quote Sent': 'border border-warning/40 text-warning',
  Dispatched: 'border border-accent/40 text-accent',
  Delivered: 'border border-success/40 text-success',
};

import { useState } from 'react';
import { Plus, ShieldCheck, AlertCircle } from 'lucide-react';
import { useOrders, useUpdateOrderStatus, useAddOrderNote, useApproveOrder } from '../../lib/useOrders.js';
import { ALL_STATUSES, STATUS_TRANSITIONS } from '../../lib/orderStatus.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { hasPermission, ROLE_ADMIN } from '../../lib/roles.js';
import NewOrderForm from '../../components/NewOrderForm.jsx';

export default function AdminOrders() {
  const user = useAuthStore((s) => s.user);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewOrder, setShowNewOrder] = useState(false);
  const { data: orders, isLoading, isError } = useOrders(statusFilter || undefined);

  const canCreate = hasPermission(user, 'canCreateOrders');

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip label="All" active={statusFilter === ''} onClick={() => setStatusFilter('')} />
          {ALL_STATUSES.map((s) => (
            <FilterChip key={s} label={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>
        {canCreate && !showNewOrder && (
          <button
            onClick={() => setShowNewOrder(true)}
            className="inline-flex items-center gap-1.5 bg-brand px-4 py-2 text-[18.5px] font-semibold text-white hover:bg-brand-dark"
          >
            <Plus size={15} /> New Order
          </button>
        )}
      </div>

      {showNewOrder && <NewOrderForm onClose={() => setShowNewOrder(false)} />}

      {isLoading && <div className="py-16 text-center text-[17.5px] text-text-muted">Loading orders…</div>}
      {isError && (
        <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> Could not load orders.
        </div>
      )}
      {!isLoading && !isError && orders?.length === 0 && (
        <div className="border border-dashed border-hairline bg-surface p-10 text-center text-[17.5px] text-text-muted">
          No orders match this filter.
        </div>
      )}

      <div className="space-y-4">
        {orders?.map((order) => (
          <OrderRow key={order.id} order={order} user={user} />
        ))}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`border px-3.5 py-1.5 font-mono text-[12.5px] font-semibold uppercase tracking-wide transition-colors ${
        active ? 'border-brand bg-brand text-white' : 'border-hairline text-text-secondary hover:border-brand'
      }`}
    >
      {label}
    </button>
  );
}

function OrderRow({ order, user }) {
  const [noteText, setNoteText] = useState('');
  const updateStatus = useUpdateOrderStatus();
  const addNote = useAddOrderNote();
  const approve = useApproveOrder();

  const canManageStatus = hasPermission(user, 'canManageOrderStatus');
  const isPending = order.status === 'Pending Approval';
  const isAdmin = user?.role === ROLE_ADMIN;

  function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    addNote.mutate({ id: order.id, text: noteText.trim() }, { onSuccess: () => setNoteText('') });
  }

  return (
    <div className={`border bg-surface p-6 ${isPending ? 'border-error/40' : 'border-hairline'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[13.5px] text-text-muted">Order #{order.id}</div>
          <div className="mt-1 font-semibold text-text">{order.client?.name}</div>
          {order.client?.companyName && <div className="text-[17.5px] text-text-secondary">{order.client.companyName}</div>}
          <div className="mt-1 text-[18.5px] text-text-muted">{order.client?.email}</div>
          <div className="text-[18.5px] text-text-muted">
            {order.client?.phone ? (
              <a href={`tel:${order.client.phone}`} className="hover:text-brand">
                {order.client.phone}
              </a>
            ) : (
              'No phone on file'
            )}
          </div>
          {order.createdBy?.role === 'employee' && (
            <div className="mt-1.5 inline-block border-2 border-hairline px-2.5 py-0.5 text-[18.5px] font-semibold text-text-secondary">
              Placed by {order.createdBy.name} (employee)
            </div>
          )}
          {order.approvedBy && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-[18.5px] text-text-muted">
              <ShieldCheck size={12} /> Approved by {order.approvedBy.name}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />

          {isPending && isAdmin && (
            <button
              onClick={() => approve.mutate(order.id)}
              disabled={approve.isPending}
              className="bg-brand px-3.5 py-1.5 text-[18.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {approve.isPending ? 'Approving…' : 'Approve'}
            </button>
          )}

          {!isPending && canManageStatus && (
            <select
              value={order.status}
              onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value })}
              disabled={updateStatus.isPending}
              className="field-input !w-auto !py-1.5 text-[18.5px]"
            >
              {/* Only the current status plus its legal next steps. */}
              {[order.status, ...(STATUS_TRANSITIONS[order.status] ?? [])].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-1 border-t border-hairline pt-4">
        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between text-[17.5px] text-text-secondary">
            <span>
              {item.product?.name} <span className="text-text-muted">× {item.quantity}</span> @ ₹{Number(item.rate).toFixed(2)}
            </span>
            <span className="font-semibold text-text">₹{(item.rate * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-1.5 text-[18.5px] font-semibold text-text">
          <span>Total volume: {order.totalVolume}</span>
          <span>Total amount: ₹{Number(order.totalAmount).toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-hairline pt-4">
        <div className="mb-2 font-mono text-[12.5px] uppercase tracking-wider text-text-muted">Internal Notes</div>
        {order.internalNotes ? (
          <pre className="whitespace-pre-wrap border-2 border-hairline bg-bg p-3 font-sans text-[18.5px] leading-relaxed text-text-secondary">
            {order.internalNotes}
          </pre>
        ) : (
          <div className="text-[18.5px] text-text-muted">No notes yet.</div>
        )}
        {canManageStatus && (
          <form onSubmit={handleAddNote} className="mt-3 flex gap-2">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add an internal note…"
              className="field-input flex-1"
            />
            <button
              type="submit"
              disabled={addNote.isPending}
              className="bg-brand px-4 py-2 text-[18.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              Add
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Pencil, WifiOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { hasPermission, ROLE_ADMIN } from '../../lib/roles.js';
import { useProducts } from '../../lib/useProducts.js';
import {
  useInventoryStock,
  useInwardStock,
  useInventoryTransactions,
  useUpdateInventoryTransaction,
} from '../../lib/useInventory.js';

const PACK_SIZES = [20, 50, 210];

const EMPTY_FORM = { productId: '', sizeInLiters: 210, quantityUnits: '', entryDate: new Date().toISOString().slice(0, 10) };

function InwardForm() {
  const { data: products } = useProducts();
  const inward = useInwardStock();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [feedback, setFeedback] = useState(null);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    return (q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products).slice(0, 20);
  }, [products, query]);

  const selectedProduct = products?.find((p) => p.id === Number(form.productId));

  function handleSubmit(e) {
    e.preventDefault();
    const entry = {
      clientTxnId: crypto.randomUUID(), // fixed for this entry through every retry — see submitInwardEntry
      productId: Number(form.productId),
      sizeInLiters: Number(form.sizeInLiters),
      quantityUnits: Number(form.quantityUnits),
      entryDate: form.entryDate,
    };
    inward.mutate(entry, {
      onSuccess: (result) => {
        setFeedback(result.queued ? 'offline' : 'saved');
        setForm(EMPTY_FORM);
        setQuery('');
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 border-2 border-hairline bg-surface p-6">
      <h2 className="mb-4 text-[17.5px] font-bold text-text">Stock Inward</h2>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="relative">
          <label htmlFor="inward-grade" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
            Lubricant Grade
          </label>
          <input
            id="inward-grade"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setForm((f) => ({ ...f, productId: '' }));
            }}
            placeholder="Search grade…"
            className="field-input"
            required
            autoComplete="off"
          />
          {query && !form.productId && filteredProducts.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto border-2 border-hairline bg-surface shadow-lg">
              {filteredProducts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, productId: String(p.id) }));
                      setQuery(p.name);
                    }}
                    className="block w-full px-3.5 py-2 text-left text-[17.5px] text-text hover:bg-bg"
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {form.productId && selectedProduct && (
            <p className="mt-1 text-[14.5px] text-text-muted">Selected: {selectedProduct.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="inward-size" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
            Packaging Size
          </label>
          <select
            id="inward-size"
            value={form.sizeInLiters}
            onChange={(e) => setForm((f) => ({ ...f, sizeInLiters: e.target.value }))}
            className="field-input"
          >
            {PACK_SIZES.map((s) => (
              <option key={s} value={s}>{s}L</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="inward-qty" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
            Quantity
          </label>
          <input
            id="inward-qty"
            type="number"
            min={1}
            value={form.quantityUnits}
            onChange={(e) => setForm((f) => ({ ...f, quantityUnits: e.target.value }))}
            className="field-input"
            required
          />
        </div>

        <div>
          <label htmlFor="inward-date" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
            Entry Date
          </label>
          <input
            id="inward-date"
            type="date"
            value={form.entryDate}
            onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
            className="field-input"
            required
          />
        </div>
      </div>

      {feedback === 'offline' && (
        <div className="mt-3 flex items-start gap-2 border border-warning/40 bg-warning/5 px-4 py-2.5 text-[17.5px] text-warning">
          <WifiOff size={15} className="mt-0.5 flex-shrink-0" /> Offline — saved locally, will sync automatically once connection returns.
        </div>
      )}
      {feedback === 'saved' && <p className="mt-3 text-[17.5px] font-semibold text-success">Saved.</p>}
      {inward.isError && (
        <div role="alert" className="mt-3 flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-2.5 text-[17.5px] text-error">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {inward.error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={inward.isPending || !form.productId}
        className="mt-4 bg-brand px-5 py-2.5 text-[17.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {inward.isPending ? 'Saving…' : 'Save Inward Entry'}
      </button>
    </form>
  );
}

function StockDashboard() {
  const { data: stock, isLoading, isError } = useInventoryStock();

  if (isLoading) return <div className="py-10 text-center text-[17.5px] text-text-muted">Loading inventory…</div>;
  if (isError)
    return (
      <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> Could not load inventory.
      </div>
    );
  if (stock?.length === 0)
    return (
      <div className="border border-dashed border-hairline bg-bg p-10 text-center text-[17.5px] text-text-muted">
        No stock recorded yet — inward entries above will show up here.
      </div>
    );

  return (
    <div className="overflow-x-auto border-2 border-hairline bg-surface">
      <table className="w-full min-w-[560px] text-left text-[17.5px]">
        <thead>
          <tr className="border-b border-hairline bg-bg font-mono text-[12.5px] uppercase tracking-wider text-text-muted">
            <th className="px-4 py-3 font-semibold">Grade</th>
            <th className="px-4 py-3 font-semibold">Pack Size</th>
            <th className="px-4 py-3 font-semibold">Quantity on Hand</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
          </tr>
        </thead>
        <tbody>
          {stock?.map((row) => (
            <tr key={`${row.productId}-${row.sizeInLiters}`} className="border-b border-hairline last:border-b-0">
              <td className="px-4 py-3 font-semibold text-text">{row.product?.name}</td>
              <td className="px-4 py-3 text-text-secondary">{row.sizeInLiters}L</td>
              <td className={`px-4 py-3 font-semibold ${row.quantityUnits === 0 ? 'text-error' : 'text-text'}`}>{row.quantityUnits}</td>
              <td className="px-4 py-3 text-text-secondary">
                {new Date(row.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Admin-only audit ledger + correction UI — server already enforces this
// (GET/PATCH /inventory/transactions is adminOnly), this gate just keeps a
// flagged-but-non-admin employee from seeing controls that would 403 anyway.
function TransactionLedger() {
  const { data: transactions, isLoading, isError } = useInventoryTransactions();
  const updateTxn = useUpdateInventoryTransaction();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ quantityUnits: '', entryDate: '' });

  function startEdit(txn) {
    setEditingId(txn.id);
    setEditForm({ quantityUnits: txn.quantityUnits, entryDate: txn.entryDate.slice(0, 10) });
  }

  function saveEdit(id) {
    updateTxn.mutate(
      { id, quantityUnits: Number(editForm.quantityUnits), entryDate: editForm.entryDate },
      { onSuccess: () => setEditingId(null) },
    );
  }

  if (isLoading) return <div className="py-10 text-center text-[17.5px] text-text-muted">Loading audit log…</div>;
  if (isError)
    return (
      <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> Could not load the audit log.
      </div>
    );

  return (
    <div className="overflow-x-auto border-2 border-hairline bg-surface">
      <table className="w-full min-w-[820px] text-left text-[17.5px]">
        <thead>
          <tr className="border-b border-hairline bg-bg font-mono text-[12.5px] uppercase tracking-wider text-text-muted">
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Grade</th>
            <th className="px-4 py-3 font-semibold">Size</th>
            <th className="px-4 py-3 font-semibold">Qty</th>
            <th className="px-4 py-3 font-semibold">Entry Date</th>
            <th className="px-4 py-3 font-semibold">Entered By</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {transactions?.map((txn) => {
            const editing = editingId === txn.id;
            return (
              <tr key={txn.id} className="border-b border-hairline last:border-b-0">
                <td className="px-4 py-3 text-text-secondary capitalize">{txn.txnType}</td>
                <td className="px-4 py-3 font-semibold text-text">{txn.product?.name}</td>
                <td className="px-4 py-3 text-text-secondary">{txn.sizeInLiters}L</td>
                <td className="px-4 py-3 text-text-secondary">
                  {editing ? (
                    <input
                      type="number"
                      min={1}
                      value={editForm.quantityUnits}
                      onChange={(e) => setEditForm((f) => ({ ...f, quantityUnits: e.target.value }))}
                      className="field-input w-24 py-1"
                    />
                  ) : (
                    txn.quantityUnits
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {editing ? (
                    <input
                      type="date"
                      value={editForm.entryDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, entryDate: e.target.value }))}
                      className="field-input w-40 py-1"
                    />
                  ) : (
                    new Date(txn.entryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">{txn.enteredBy?.name}</td>
                <td className="px-4 py-3">
                  {editing ? (
                    <button
                      onClick={() => saveEdit(txn.id)}
                      disabled={updateTxn.isPending}
                      className="text-[14.5px] font-semibold text-brand hover:underline disabled:opacity-50"
                    >
                      Save
                    </button>
                  ) : (
                    <button onClick={() => startEdit(txn)} aria-label="Edit entry" className="text-text-muted hover:text-brand">
                      <Pencil size={14} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminInventory() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLE_ADMIN;

  if (!hasPermission(user, 'canManageInventory')) return <Navigate to="/admin" replace />;

  return (
    <div>
      <InwardForm />
      <h2 className="mb-4 text-[17.5px] font-bold text-text">Current Stock</h2>
      <StockDashboard />

      {isAdmin && (
        <div className="mt-8">
          <h2 className="mb-4 text-[17.5px] font-bold text-text">Audit Log</h2>
          <TransactionLedger />
        </div>
      )}
    </div>
  );
}

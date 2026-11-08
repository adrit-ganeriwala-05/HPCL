import { useState } from 'react';
import { Plus, Trash2, X, AlertCircle } from 'lucide-react';
import { useClients } from '../lib/useClients.js';
import { useProducts } from '../lib/useProducts.js';
import { useCreateOrder } from '../lib/useOrders.js';

const PACK_SIZES = [20, 50, 210];

const EMPTY_LINE = { productId: '', sizeInLiters: 210, quantity: 1, rate: '' };

export default function NewOrderForm({ onClose }) {
  const { data: clients } = useClients();
  const { data: products } = useProducts();
  const createOrder = useCreateOrder();

  const [clientId, setClientId] = useState('');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);

  function updateLine(i, patch) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((ls) => [...ls, { ...EMPTY_LINE }]);
  }

  function removeLine(i) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0);

  function handleSubmit(e) {
    e.preventDefault();
    const items = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: Number(l.productId),
        sizeInLiters: Number(l.sizeInLiters),
        quantity: Number(l.quantity) || 1,
        rate: Number(l.rate) || 0,
      }));
    if (!clientId || items.length === 0) return;

    createOrder.mutate(
      { clientId: Number(clientId), items },
      { onSuccess: onClose }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 border-2 border-hairline bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[17.5px] font-bold text-text">Place Order for Client</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text">
          <X size={18} />
        </button>
      </div>

      <label htmlFor="nof-client" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
        Client
      </label>
      <select id="nof-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="field-input" required>
        <option value="">Select client…</option>
        {clients?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.companyName ? `— ${c.companyName}` : ''} {c.phone ? `· ${c.phone}` : ''}
          </option>
        ))}
      </select>

      <div className="mt-4 space-y-2.5">
        <div className="grid grid-cols-[1fr_84px_72px_112px_auto] gap-2 px-1 font-mono text-[12.5px] font-semibold uppercase tracking-wider text-text-muted">
          <span>Product</span>
          <span>Size</span>
          <span>Qty</span>
          <span>Rate / unit</span>
          <span />
        </div>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_84px_72px_112px_auto] gap-2">
            <select
              value={line.productId}
              onChange={(e) => updateLine(i, { productId: e.target.value })}
              className="field-input"
              required
              aria-label="Product"
            >
              <option value="">Select product…</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={line.sizeInLiters}
              onChange={(e) => updateLine(i, { sizeInLiters: e.target.value })}
              className="field-input"
              aria-label="Pack size"
            >
              {PACK_SIZES.map((s) => (
                <option key={s} value={s}>{s}L</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) => updateLine(i, { quantity: e.target.value })}
              className="field-input"
              required
              aria-label="Quantity"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="₹0.00"
              value={line.rate}
              onChange={(e) => updateLine(i, { rate: e.target.value })}
              className="field-input"
              required
              aria-label="Rate per unit"
            />
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => removeLine(i)}
                aria-label="Remove product line"
                className="border-2 border-hairline px-3 text-text-muted hover:border-error hover:text-error"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 text-[18.5px] font-semibold text-brand hover:underline">
          <Plus size={14} /> Add another product
        </button>
        <div className="text-[17.5px] font-semibold text-text">Total: ₹{total.toFixed(2)}</div>
      </div>

      {createOrder.isError && (
        <div role="alert" className="mt-3 flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-2.5 text-[17.5px] text-error">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {createOrder.error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={createOrder.isPending}
        className="mt-4 bg-brand px-5 py-2.5 text-[17.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {createOrder.isPending ? 'Placing order…' : 'Place Order'}
      </button>
    </form>
  );
}

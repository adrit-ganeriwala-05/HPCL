import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Pencil, Trash2, X, AlertCircle } from 'lucide-react';
import { useProducts } from '../../lib/useProducts.js';
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from '../../lib/useProductAdmin.js';
import { PRODUCT_CATEGORIES } from '../../lib/content.js';
import { useAuthStore } from '../../store/authStore.js';
import { hasPermission } from '../../lib/roles.js';

const EMPTY = { name: '', category: PRODUCT_CATEGORIES[0], description: '', viscosityGrade: '', applicationArea: '' };

export default function AdminProducts() {
  const user = useAuthStore((s) => s.user);
  const { data: products, isLoading, isError } = useProducts({ includeInactive: true });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const saving = createMutation.isPending || updateMutation.isPending;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description,
      viscosityGrade: product.viscosityGrade,
      applicationArea: product.applicationArea,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form }, { onSuccess: cancelEdit });
    } else {
      createMutation.mutate(form, { onSuccess: () => setForm(EMPTY) });
    }
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this product? It will be removed from the public catalog.')) return;
    deleteMutation.mutate(id);
  }

  if (!hasPermission(user, 'canManageProducts')) return <Navigate to="/admin" replace />;

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-8 border-2 border-hairline bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17.5px] font-bold text-text">{editingId ? `Edit Product #${editingId}` : 'Add Product'}</h2>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-text-muted hover:text-text">
              <X size={14} /> Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <input name="name" required placeholder="Product name" value={form.name} onChange={handleChange} className="field-input" />
          <select name="category" value={form.category} onChange={handleChange} className="field-input">
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input name="viscosityGrade" placeholder="Viscosity grade (e.g. ISO VG 68)" value={form.viscosityGrade} onChange={handleChange} className="field-input" />
          <input name="applicationArea" placeholder="Application area" value={form.applicationArea} onChange={handleChange} className="field-input" />
        </div>
        <textarea
          name="description"
          rows={2}
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="field-input mt-3.5 resize-none"
        />

        {(createMutation.isError || updateMutation.isError) && (
          <div role="alert" className="mt-3 flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-2.5 text-[17.5px] text-error">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {(createMutation.error || updateMutation.error).message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-4 bg-brand px-5 py-2.5 text-[17.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? 'Saving…' : editingId ? 'Update Product' : 'Add Product'}
        </button>
      </form>

      {isLoading && <div className="py-10 text-center text-[17.5px] text-text-muted">Loading catalog…</div>}
      {isError && (
        <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> Could not load products.
        </div>
      )}

      <div className="space-y-3">
        {products?.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-2 border-hairline bg-surface p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text">{p.name}</span>
                {!p.isActive && (
                  <span className="border-2 border-hairline px-2 py-0.5 font-mono text-[12.5px] font-semibold uppercase text-text-muted">inactive</span>
                )}
              </div>
              <div className="mt-0.5 text-[18.5px] text-text-secondary">
                {p.category}
                {p.viscosityGrade && ` · ${p.viscosityGrade}`}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(p)} aria-label={`Edit ${p.name}`} className="border-2 border-hairline p-2 text-text-secondary hover:border-brand hover:text-brand">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(p.id)} aria-label={`Delete ${p.name}`} className="border-2 border-hairline p-2 text-text-secondary hover:border-error hover:text-error">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

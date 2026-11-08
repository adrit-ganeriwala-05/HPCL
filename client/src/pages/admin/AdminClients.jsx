import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Pencil, Phone, Users } from 'lucide-react';
import Button from '../../components/Button.jsx';
import { useClients, useUpdateClient } from '../../lib/useClients.js';
import { useAuthStore } from '../../store/authStore.js';
import { hasPermission } from '../../lib/roles.js';

// Staff view of every client account, with their contact details editable.
// Same permission as the client picker in New Order (canCreateOrders) —
// the server enforces it too (PUT /api/clients/:id).
export default function AdminClients() {
  const user = useAuthStore((s) => s.user);
  const { data: clients, isLoading, isError } = useClients();
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');

  if (!hasPermission(user, 'canCreateOrders')) return <Navigate to="/admin" replace />;

  return (
    <div>
      {notice && (
        <div role="status" className="mb-5 flex items-start gap-2 border border-success/30 bg-success/5 px-4 py-3.5 text-[17.5px] text-success">
          <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> {notice}
        </div>
      )}

      {isLoading && <div className="py-16 text-center text-[17.5px] text-text-muted">Loading clients…</div>}
      {isError && (
        <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> Could not load clients.
        </div>
      )}
      {!isLoading && !isError && clients?.length === 0 && (
        <div className="border border-dashed border-hairline bg-surface p-10 text-center">
          <Users className="mx-auto mb-3 text-text-muted" size={26} strokeWidth={1.5} />
          <p className="text-[17.5px] text-text-muted">No client accounts yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {clients?.map((client) =>
          editingId === client.id ? (
            <ClientForm
              key={client.id}
              client={client}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                setNotice(`Saved changes to ${client.name}.`);
              }}
            />
          ) : (
            <div key={client.id} className="flex flex-wrap items-start justify-between gap-4 border-2 border-hairline bg-surface p-5">
              <div>
                <div className="font-semibold text-text">{client.name}</div>
                {client.companyName && <div className="text-[17.5px] text-text-secondary">{client.companyName}</div>}
                {client.contactPerson && (
                  <div className="text-[17.5px] text-text-secondary">Contact: {client.contactPerson}</div>
                )}
                <div className="mt-1 text-[18.5px] text-text-muted">{client.email}</div>
                <div className="inline-flex items-center gap-1.5 text-[18.5px] text-text-muted">
                  <Phone size={13} />
                  {client.phone ? (
                    <a href={`tel:${client.phone}`} className="hover:text-brand">
                      {client.phone}
                    </a>
                  ) : (
                    'No phone on file'
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNotice('');
                  setEditingId(client.id);
                }}
                className="inline-flex items-center gap-2 border-2 border-hairline px-4 py-2 text-[17.5px] font-semibold text-text-secondary hover:border-brand hover:text-brand"
              >
                <Pencil size={14} /> Edit
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

const FIELDS = [
  { name: 'name', label: 'Name', required: true, placeholder: 'Full name' },
  { name: 'companyName', label: 'Company', placeholder: 'e.g. Andal Steel Works' },
  { name: 'contactPerson', label: 'Contact Person', placeholder: 'Who to call at the company' },
  { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'e.g. +91 98765 43210' },
];

function ClientForm({ client, onCancel, onSaved }) {
  const updateClient = useUpdateClient();
  const [form, setForm] = useState({
    name: client.name ?? '',
    companyName: client.companyName ?? '',
    contactPerson: client.contactPerson ?? '',
    phone: client.phone ?? '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    updateClient.mutate({ id: client.id, ...form }, { onSuccess: onSaved });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-2 border-brand/40 bg-surface p-6">
      <h2 className="text-[17.5px] font-bold text-text">Edit client</h2>

      {/* Email is the client's login, so staff can see it but not change it. */}
      <div>
        <span className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">Email</span>
        <div className="field-input cursor-not-allowed bg-bg text-text-muted">{client.email}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={`client-${client.id}-${f.name}`} className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
              {f.label}
            </label>
            <input
              id={`client-${client.id}-${f.name}`}
              name={f.name}
              type={f.type ?? 'text'}
              required={f.required}
              value={form[f.name]}
              onChange={handleChange}
              className="field-input"
              placeholder={f.placeholder}
            />
          </div>
        ))}
      </div>

      {updateClient.isError && (
        <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3 text-[17.5px] text-error">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {updateClient.error.message}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={updateClient.isPending} className="disabled:opacity-60">
          {updateClient.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={updateClient.isPending} className="disabled:opacity-60">
          Cancel
        </Button>
      </div>
    </form>
  );
}

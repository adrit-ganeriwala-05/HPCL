import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import PageWrapper from '../../components/PageWrapper.jsx';
import Button from '../../components/Button.jsx';
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useIsAddressMutating,
} from '../../lib/useAddresses.js';
import { EMPTY_ADDRESS, validateAddress, toAddressPayload } from '../../lib/addressLogic.js';

// Same look as the row actions on PortalDashboard (Quick Re-order etc.).
const ROW_BUTTON =
  'inline-flex items-center gap-2 border-2 border-hairline px-4 py-2 text-[17.5px] font-semibold text-text-secondary hover:border-brand hover:text-brand disabled:opacity-50';

export default function ManageAddresses() {
  const { data: addresses, isLoading, isError } = useAddresses();
  const busy = useIsAddressMutating();
  // Make default / Delete live here rather than in each card: a deleted
  // card unmounts as soon as the list refetches, and React Query skips
  // per-call onSuccess callbacks for unmounted components — so the
  // "Address deleted." message has to be set from a component that stays.
  const setDefault = useUpdateAddress();
  const remove = useDeleteAddress();

  // null = no form open, 'new' = adding, a number = editing that address.
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');

  // The server already sends the default first; sorting again means the
  // page doesn't silently depend on that. sort() is stable, so the rest
  // keep the server's order.
  const sorted = [...(addresses ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  function openForm(target) {
    setNotice('');
    setEditing(target);
  }

  function handleSaved(message) {
    setEditing(null);
    setNotice(message);
  }

  function handleMakeDefault(address) {
    setNotice('');
    setDefault.mutate(
      { id: address.id, ...toAddressPayload({ ...address, isDefault: true }) },
      { onSuccess: () => setNotice(`"${address.label}" is now your default address.`) },
    );
  }

  function handleDelete(address) {
    setNotice('');
    remove.mutate(address.id, { onSuccess: () => setNotice('Address deleted.') });
  }

  // A failed Make default / Delete is shown on the card it happened to.
  function rowError(address) {
    if (setDefault.isError && setDefault.variables?.id === address.id) return setDefault.error.message;
    if (remove.isError && remove.variables === address.id) return remove.error.message;
    return null;
  }

  return (
    <PageWrapper>
      <section className="bg-bg pt-14 pb-20">
        <div className="mx-auto max-w-[760px] px-7">
          <Link to="/portal" className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-text-muted hover:text-text">
            <ArrowLeft size={14} /> Back to Portal
          </Link>

          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
            <div>
              <div className="font-mono text-[12.5px] font-medium uppercase tracking-[0.14em] text-accent">Account</div>
              <h1 className="mt-2.5 text-[26px] font-bold leading-tight text-text">Delivery Addresses</h1>
              <p className="mt-1 text-[17.5px] text-text-secondary">Where we deliver your orders. Mark one as your default.</p>
            </div>
            {editing !== 'new' && (
              <Button type="button" onClick={() => openForm('new')} disabled={busy} className="disabled:opacity-60">
                <Plus size={16} /> Add address
              </Button>
            )}
          </div>

          {notice && (
            <div role="status" className="mb-5 flex items-start gap-2 border border-success/30 bg-success/5 px-4 py-3.5 text-[17.5px] text-success">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> {notice}
            </div>
          )}

          {editing === 'new' && (
            <div className="mb-5">
              <AddressForm busy={busy} onCancel={() => setEditing(null)} onSaved={() => handleSaved('Address added.')} />
            </div>
          )}

          {isLoading && <div className="py-16 text-center text-[17.5px] text-text-muted">Loading your addresses…</div>}

          {isError && (
            <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> Could not load your addresses. Try refreshing.
            </div>
          )}

          {!isLoading && !isError && sorted.length === 0 && editing !== 'new' && (
            <div className="border border-dashed border-hairline bg-surface p-12 text-center">
              <MapPin className="mx-auto mb-3 text-text-muted" size={26} strokeWidth={1.5} />
              <p className="text-[17.5px] text-text-secondary">No delivery addresses yet.</p>
            </div>
          )}

          {!isLoading && !isError && sorted.length > 0 && (
            <ul className="space-y-4">
              {sorted.map((address) => (
                <li key={address.id}>
                  {editing === address.id ? (
                    <AddressForm
                      address={address}
                      busy={busy}
                      onCancel={() => setEditing(null)}
                      onSaved={() => handleSaved('Address updated.')}
                    />
                  ) : (
                    <AddressCard
                      address={address}
                      busy={busy}
                      makingDefault={setDefault.isPending && setDefault.variables?.id === address.id}
                      deleting={remove.isPending && remove.variables === address.id}
                      error={rowError(address)}
                      onEdit={() => openForm(address.id)}
                      onMakeDefault={() => handleMakeDefault(address)}
                      onDelete={() => handleDelete(address)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageWrapper>
  );
}

function AddressCard({ address, busy, makingDefault, deleting, error, onEdit, onMakeDefault, onDelete }) {
  // In-page confirm step instead of window.confirm.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="border-2 border-hairline bg-surface p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <MapPin size={16} className="text-text-muted" />
        <span className="font-semibold text-text">{address.label}</span>
        {address.isDefault && (
          <span className="border border-success/40 px-2.5 py-1 font-mono text-[12.5px] font-semibold uppercase tracking-wide text-success">
            Default
          </span>
        )}
      </div>

      <address className="mt-3 text-[17.5px] not-italic leading-relaxed text-text-secondary">
        {address.line1}
        <br />
        {address.line2 && (
          <>
            {address.line2}
            <br />
          </>
        )}
        {address.city}, {address.state} {address.pincode}
      </address>

      <div className="mt-4 border-t border-hairline pt-4">
        {confirmingDelete ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[17.5px] font-semibold text-text">Delete this address?</span>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="inline-flex items-center gap-2 border-2 border-error px-4 py-2 text-[17.5px] font-semibold text-error hover:bg-error/5 disabled:opacity-50"
            >
              <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} disabled={busy} className={ROW_BUTTON}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {!address.isDefault && (
              <button type="button" onClick={onMakeDefault} disabled={busy} className={ROW_BUTTON}>
                <Star size={14} /> {makingDefault ? 'Saving…' : 'Make default'}
              </button>
            )}
            <button type="button" onClick={onEdit} disabled={busy} className={ROW_BUTTON}>
              <Pencil size={14} /> Edit
            </button>
            <button type="button" onClick={() => setConfirmingDelete(true)} disabled={busy} className={ROW_BUTTON}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3 text-[17.5px] text-error">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}

// Used for both "Add address" (no `address` prop) and "Edit" (with one).
function AddressForm({ address, busy, onCancel, onSaved }) {
  const isEdit = Boolean(address);
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const save = isEdit ? update : create;

  const [form, setForm] = useState(() => (address ? toAddressPayload(address) : EMPTY_ADDRESS));
  const [errors, setErrors] = useState({});
  const idPrefix = `address-${address?.id ?? 'new'}`;

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const found = validateAddress(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = toAddressPayload(form);
    save.mutate(isEdit ? { id: address.id, ...payload } : payload, { onSuccess: onSaved });
  }

  const fieldProps = (name) => ({ id: `${idPrefix}-${name}`, name, value: form[name], onChange: handleChange, error: errors[name] });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 border-2 border-brand/40 bg-surface p-6">
      <h2 className="text-[19px] font-bold text-text">{isEdit ? 'Edit address' : 'New address'}</h2>

      <Field label="Label" required placeholder="e.g. Main Warehouse" {...fieldProps('label')} />
      <Field label="Address line 1" required placeholder="Plot / building, street" autoComplete="address-line1" {...fieldProps('line1')} />
      <Field label="Address line 2" placeholder="Area, landmark (optional)" autoComplete="address-line2" {...fieldProps('line2')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" required autoComplete="address-level2" {...fieldProps('city')} />
        <Field label="State" required autoComplete="address-level1" {...fieldProps('state')} />
      </div>
      <div className="sm:w-1/2 sm:pr-2">
        <Field label="PIN code" required inputMode="numeric" autoComplete="postal-code" placeholder="6 digits" {...fieldProps('pincode')} />
      </div>

      <label className="flex items-center gap-2 text-[17.5px] text-text-secondary">
        <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleChange} className="h-4 w-4 accent-brand" />
        Make this my default address
      </label>

      {save.isError && (
        <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3 text-[17.5px] text-error">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {save.error.message}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy} className="disabled:opacity-60">
          {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add address'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy} className="disabled:opacity-60">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({ id, name, label, required, value, onChange, error, ...inputProps }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="field-input"
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13.5px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}

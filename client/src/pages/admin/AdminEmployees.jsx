import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserX, UserCheck, AlertCircle } from 'lucide-react';
import { useEmployees, useCreateEmployee, useUpdateEmployeePermissions, useSetEmployeeActive } from '../../lib/useEmployees.js';
import { useAuthStore } from '../../store/authStore.js';
import { ROLE_ADMIN } from '../../lib/roles.js';

const PERMISSIONS = [
  { key: 'canCreateOrders', label: 'Create Orders' },
  { key: 'canManageOrderStatus', label: 'Manage Order Status & Notes' },
  { key: 'canManageProducts', label: 'Manage Products' },
  { key: 'canViewLeads', label: 'View Leads' },
  { key: 'canManageInventory', label: 'Manage Inventory' },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  canCreateOrders: false,
  canManageOrderStatus: false,
  canManageProducts: false,
  canViewLeads: false,
  canManageInventory: false,
};

export default function AdminEmployees() {
  const user = useAuthStore((s) => s.user);
  const { data: employees, isLoading, isError } = useEmployees();
  const [form, setForm] = useState(EMPTY_FORM);
  const createEmployee = useCreateEmployee();
  const updatePermissions = useUpdateEmployeePermissions();
  const setActive = useSetEmployeeActive();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function toggleCreateFormPermission(key) {
    setForm((f) => ({ ...f, [key]: !f[key] }));
  }

  function setCreateFormFullAccess(value) {
    setForm((f) => ({
      ...f,
      canCreateOrders: value,
      canManageOrderStatus: value,
      canManageProducts: value,
      canViewLeads: value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    createEmployee.mutate(form, { onSuccess: () => setForm(EMPTY_FORM) });
  }

  function togglePermission(employee, key) {
    updatePermissions.mutate({
      id: employee.id,
      canCreateOrders: employee.canCreateOrders,
      canManageOrderStatus: employee.canManageOrderStatus,
      canManageProducts: employee.canManageProducts,
      canViewLeads: employee.canViewLeads,
      canManageInventory: employee.canManageInventory,
      [key]: !employee[key],
    });
  }

  // "Full access" = all 5 togglable permissions. Approving orders and
  // managing other employees' access stays admin-only no matter what —
  // that boundary isn't part of this toggle, by design.
  function setFullAccess(employee, value) {
    updatePermissions.mutate({
      id: employee.id,
      canCreateOrders: value,
      canManageOrderStatus: value,
      canManageProducts: value,
      canViewLeads: value,
      canManageInventory: value,
    });
  }

  if (user?.role !== ROLE_ADMIN) return <Navigate to="/admin" replace />;

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-8 border-2 border-hairline bg-surface p-6">
        <h2 className="mb-4 text-[17.5px] font-bold text-text">Add Employee</h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <input name="name" required placeholder="Full name" value={form.name} onChange={handleChange} className="field-input" />
          <input type="email" name="email" required placeholder="Email" value={form.email} onChange={handleChange} className="field-input" />
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={handleChange}
            className="field-input"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {PERMISSIONS.map((p) => (
            <label key={p.key} className="inline-flex items-center gap-2 text-[17.5px] font-semibold text-text-secondary">
              <input type="checkbox" checked={form[p.key]} onChange={() => toggleCreateFormPermission(p.key)} className="h-4 w-4 accent-brand" />
              {p.label}
            </label>
          ))}
          <button
            type="button"
            onClick={() => setCreateFormFullAccess(true)}
            className="text-[18.5px] font-semibold text-brand hover:underline"
          >
            Grant Full Access
          </button>
        </div>

        {createEmployee.isError && (
          <div role="alert" className="mt-3 flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-2.5 text-[17.5px] text-error">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {createEmployee.error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={createEmployee.isPending}
          className="mt-4 bg-brand px-5 py-2.5 text-[17.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {createEmployee.isPending ? 'Adding…' : 'Add Employee'}
        </button>
      </form>

      {isLoading && <div className="py-10 text-center text-[17.5px] text-text-muted">Loading employees…</div>}
      {isError && (
        <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> Could not load employees.
        </div>
      )}
      {!isLoading && !isError && employees?.length === 0 && (
        <div className="border border-dashed border-hairline bg-bg p-10 text-center text-[17.5px] text-text-muted">
          No employees yet — add your first one above.
        </div>
      )}

      <div className="space-y-3">
        {employees?.map((emp) => {
          const isFullAccess = PERMISSIONS.every((p) => emp[p.key]);
          return (
            <div key={emp.id} className={`border-2 border-hairline bg-surface p-5 ${emp.isActive ? '' : 'opacity-60'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text">{emp.name}</span>
                    {!emp.isActive && (
                      <span className="border-2 border-hairline px-2 py-0.5 font-mono text-[12.5px] font-semibold uppercase text-text-muted">removed</span>
                    )}
                  </div>
                  <div className="text-[18.5px] text-text-secondary">{emp.email}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFullAccess(emp, !isFullAccess)}
                    disabled={updatePermissions.isPending}
                    className={`px-3.5 py-1.5 text-[18.5px] font-semibold disabled:opacity-50 ${
                      isFullAccess ? 'bg-brand text-white hover:bg-brand-dark' : 'border-2 border-hairline text-text-secondary hover:border-brand hover:text-brand'
                    }`}
                  >
                    {isFullAccess ? 'Full Access Granted' : 'Grant Full Access'}
                  </button>
                  <button
                    onClick={() => setActive.mutate({ id: emp.id, isActive: !emp.isActive })}
                    disabled={setActive.isPending}
                    className="inline-flex items-center gap-1.5 border-2 border-hairline px-3.5 py-1.5 text-[18.5px] font-semibold text-text-secondary hover:border-error hover:text-error disabled:opacity-50"
                  >
                    {emp.isActive ? (
                      <>
                        <UserX size={14} /> Remove
                      </>
                    ) : (
                      <>
                        <UserCheck size={14} /> Reactivate
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 border-t border-hairline pt-3">
                {PERMISSIONS.map((p) => (
                  <label key={p.key} className="inline-flex items-center gap-2 text-[17.5px] font-semibold text-text-secondary">
                    <input
                      type="checkbox"
                      checked={emp[p.key]}
                      onChange={() => togglePermission(emp, p.key)}
                      disabled={updatePermissions.isPending}
                      className="h-4 w-4 accent-brand"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

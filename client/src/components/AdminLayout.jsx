import { NavLink, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useLogout } from '../lib/useLogout.js';
import { hasPermission, ROLE_ADMIN } from '../lib/roles.js';

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const isAdmin = user?.role === ROLE_ADMIN;

  const tabs = [
    { to: '/admin', label: 'Orders', end: true, show: true },
    { to: '/admin/clients', label: 'Clients', show: hasPermission(user, 'canCreateOrders') },
    { to: '/admin/products', label: 'Products', show: hasPermission(user, 'canManageProducts') },
    { to: '/admin/inventory', label: 'Inventory', show: hasPermission(user, 'canManageInventory') },
    { to: '/admin/leads', label: 'Leads', show: hasPermission(user, 'canViewLeads') },
    { to: '/admin/employees', label: 'Employees', show: isAdmin },
  ].filter((t) => t.show);

  return (
    <section className="min-h-[70vh] bg-bg pt-14 pb-20">
      <div className="mx-auto max-w-container px-7">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-8">
          <div>
            <div className="font-mono text-[12.5px] font-medium uppercase tracking-[0.14em] text-accent">
              {isAdmin ? 'Admin CRM' : 'Staff CRM'}
            </div>
            <h1 className="mt-2.5 text-[26px] font-bold leading-tight text-text">{user?.name}</h1>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 border-2 border-hairline px-4 py-2.5 text-[17.5px] font-semibold text-text-secondary hover:border-brand hover:text-brand"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>

        <div className="mb-8 flex gap-1 border-b border-hairline">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `border-b-2 px-4 py-2.5 text-[17.5px] font-semibold transition-colors ${
                  isActive ? 'border-brand text-text' : 'border-transparent text-text-muted hover:text-text'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <Outlet />
      </div>
    </section>
  );
}

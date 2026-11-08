import { Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useLeads } from '../../lib/useLeads.js';
import { useAuthStore } from '../../store/authStore.js';
import { hasPermission } from '../../lib/roles.js';

const ENQUIRY_TYPE_LABELS = {
  dealer: 'Dealer',
  'order-stock': 'Order / Stock',
  institution: 'Institutional',
  general: 'General',
};

export default function AdminLeads() {
  const user = useAuthStore((s) => s.user);
  const { data: leads, isLoading, isError } = useLeads();

  if (!hasPermission(user, 'canViewLeads')) return <Navigate to="/admin" replace />;
  if (isLoading) return <div className="py-10 text-center text-[17.5px] text-text-muted">Loading enquiries…</div>;
  if (isError)
    return (
      <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error">
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> Could not load enquiries.
      </div>
    );
  if (leads?.length === 0)
    return (
      <div className="border border-dashed border-hairline bg-bg p-10 text-center text-[17.5px] text-text-muted">
        No enquiries yet — they&apos;ll show up here as visitors submit the Contact form.
      </div>
    );

  return (
    <div className="overflow-x-auto border-2 border-hairline bg-surface">
      <table className="w-full min-w-[960px] text-left text-[17.5px]">
        <thead>
          <tr className="border-b border-hairline bg-bg font-mono text-[12.5px] uppercase tracking-wider text-text-muted">
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Company</th>
            <th className="px-4 py-3 font-semibold">Company Address</th>
            <th className="px-4 py-3 font-semibold">Phone</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Location</th>
            <th className="px-4 py-3 font-semibold">Interest</th>
            <th className="px-4 py-3 font-semibold">Details</th>
            <th className="px-4 py-3 font-semibold">Received</th>
          </tr>
        </thead>
        <tbody>
          {leads?.map((lead) => (
            <tr key={lead.id} className="border-b border-hairline last:border-b-0">
              <td className="px-4 py-3 text-text-secondary">{ENQUIRY_TYPE_LABELS[lead.enquiryType] || 'General'}</td>
              <td className="px-4 py-3 font-semibold text-text">{lead.name}</td>
              <td className="px-4 py-3 text-text-secondary">{lead.company || '—'}</td>
              <td className="max-w-[220px] px-4 py-3 text-text-secondary">{lead.companyAddress || '—'}</td>
              <td className="px-4 py-3 text-text-secondary">{lead.phone}</td>
              <td className="px-4 py-3 text-text-secondary">{lead.email || '—'}</td>
              <td className="px-4 py-3 text-text-secondary">{lead.location || '—'}</td>
              <td className="px-4 py-3 text-text-secondary">{lead.productInterest || '—'}</td>
              <td className="max-w-[280px] px-4 py-3 text-text-secondary">{lead.details || '—'}</td>
              <td className="px-4 py-3 text-text-secondary">
                {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

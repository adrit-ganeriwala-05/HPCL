import { STATUS_STYLES } from '../lib/orderStatus.js';

export default function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 font-mono text-[12.5px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

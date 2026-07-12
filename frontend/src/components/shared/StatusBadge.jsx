import { cn } from '../../lib/utils';

const VARIANTS = {
  // Vehicle status
  AVAILABLE:    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  ON_TRIP:      'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  MAINTENANCE:  'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  RETIRED:      'bg-red-500/20 text-red-400 border border-red-500/30',

  // Driver status
  OFF_DUTY:     'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  ON_LEAVE:     'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  SUSPENDED:    'bg-orange-500/20 text-orange-400 border border-orange-500/30',

  // Trip status
  PENDING:      'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  DISPATCHED:   'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  ACTIVE:       'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  COMPLETED:    'bg-emerald-600/20 text-emerald-300 border border-emerald-600/30',
  CANCELLED:    'bg-red-500/20 text-red-400 border border-red-500/30',

  // Maintenance status
  SCHEDULED:    'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  IN_PROGRESS:  'bg-amber-500/20 text-amber-400 border border-amber-500/30',

  // Generic fallback
  DEFAULT:      'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const LABELS = {
  AVAILABLE:   'Available',
  ON_TRIP:     'On Trip',
  MAINTENANCE: 'In Shop',
  RETIRED:     'Retired',
  OFF_DUTY:    'Off Duty',
  ON_LEAVE:    'On Leave',
  SUSPENDED:   'Suspended',
  PENDING:     'Pending',
  DISPATCHED:  'Dispatched',
  ACTIVE:      'Active',
  COMPLETED:   'Completed',
  CANCELLED:   'Cancelled',
  SCHEDULED:   'Scheduled',
  IN_PROGRESS: 'In Progress',
};

export default function StatusBadge({ status, className }) {
  const variant = VARIANTS[status] ?? VARIANTS.DEFAULT;
  const label   = LABELS[status] ?? status;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variant, className)}>
      {label}
    </span>
  );
}

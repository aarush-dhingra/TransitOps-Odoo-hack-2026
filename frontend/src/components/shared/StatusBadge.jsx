import { cn } from '../../lib/utils';

const VARIANTS = {
  // Vehicle status
  AVAILABLE:    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  ON_TRIP:      'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  MAINTENANCE:  'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  IN_SHOP:      'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  RETIRED:      'bg-red-500/15 text-red-400 border border-red-500/30',

  // Driver status
  OFF_DUTY:     'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  ON_LEAVE:     'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  SUSPENDED:    'bg-orange-500/15 text-orange-400 border border-orange-500/30',

  // Trip status
  PENDING:      'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  DRAFT:        'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  DISPATCHED:   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  ACTIVE:       'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  COMPLETED:    'bg-emerald-600/15 text-emerald-300 border border-emerald-600/30',
  CANCELLED:    'bg-red-500/15 text-red-400 border border-red-500/30',

  // Maintenance status
  SCHEDULED:    'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  IN_PROGRESS:  'bg-amber-500/15 text-amber-400 border border-amber-500/30',

  DEFAULT:      'bg-slate-500/15 text-slate-400 border border-slate-500/30',
};

const DOT_COLORS = {
  AVAILABLE:   'bg-emerald-400',
  ON_TRIP:     'bg-blue-400 animate-pulse',
  ACTIVE:      'bg-emerald-400 animate-pulse',
  MAINTENANCE: 'bg-amber-400',
  IN_SHOP:     'bg-amber-400 animate-pulse',
  RETIRED:     'bg-red-400',
  OFF_DUTY:    'bg-slate-400',
  ON_LEAVE:    'bg-purple-400',
  SUSPENDED:   'bg-orange-400',
  PENDING:     'bg-slate-400',
  DRAFT:       'bg-slate-400',
  DISPATCHED:  'bg-blue-400',
  COMPLETED:   'bg-emerald-300',
  CANCELLED:   'bg-red-400',
  SCHEDULED:   'bg-blue-400',
  IN_PROGRESS: 'bg-amber-400 animate-pulse',
};

const LABELS = {
  AVAILABLE:   'Available',
  ON_TRIP:     'On Trip',
  MAINTENANCE: 'In Shop',
  IN_SHOP:     'In Shop',
  RETIRED:     'Retired',
  OFF_DUTY:    'Off Duty',
  ON_LEAVE:    'On Leave',
  SUSPENDED:   'Suspended',
  PENDING:     'Pending',
  DRAFT:       'Draft',
  DISPATCHED:  'Assigned',
  ACTIVE:      'En Route',
  COMPLETED:   'Completed',
  CANCELLED:   'Cancelled',
  SCHEDULED:   'Scheduled',
  IN_PROGRESS: 'In Progress',
};

export default function StatusBadge({ status, className }) {
  const variant = VARIANTS[status] ?? VARIANTS.DEFAULT;
  const label   = LABELS[status] ?? status;
  const dot     = DOT_COLORS[status] ?? 'bg-slate-400';

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide', variant, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
      {label}
    </span>
  );
}

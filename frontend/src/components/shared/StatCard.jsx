import { cn } from '../../lib/utils';

export default function StatCard({ label, value, accent = 'blue', icon: Icon, sub }) {
  const accents = {
    blue:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
    green:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red:    'text-red-400 bg-red-500/10 border-red-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    slate:  'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };

  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-2', accents[accent] ?? accents.blue)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
        {Icon && <Icon className="w-4 h-4 opacity-60" />}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value ?? '—'}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

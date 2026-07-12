import { cn } from '../../lib/utils';

export default function StatCard({ label, value, accent = 'blue', icon: Icon, sub }) {
  const accents = {
    blue:   'border-t-blue-500 text-blue-500',
    green:  'border-t-emerald-500 text-emerald-500',
    amber:  'border-t-amber-500 text-amber-500',
    red:    'border-t-red-500 text-red-500',
    purple: 'border-t-purple-500 text-purple-500',
    slate:  'border-t-slate-500 text-slate-500',
  };

  return (
    <div className={cn('devpulse-panel p-4 flex flex-col gap-1 border-t-2', accents[accent] ?? accents.blue)}>
      <div className="flex items-center gap-1.5 mb-1 opacity-80">
        {Icon && <Icon className="w-3 h-3" />}
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">{label}</p>
      </div>
      <div className="flex items-baseline gap-1.5">
        <p className="text-3xl font-bold tracking-tight text-white">{value ?? '0'}</p>
        <span className="text-xs text-[#666]">units</span>
      </div>
      {sub && <p className="text-[10px] text-[#666] mt-2 font-medium tracking-wide">▲ {sub}</p>}
    </div>
  );
}

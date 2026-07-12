import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function StatCard({ label, value, accent = 'blue', icon: Icon, unit, trend, trendLabel }) {
  const accents = {
    blue:   { border: 'border-t-blue-500',   icon: 'text-blue-400',   bg: 'bg-blue-500/10' },
    green:  { border: 'border-t-emerald-500', icon: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    amber:  { border: 'border-t-amber-500',   icon: 'text-amber-400',  bg: 'bg-amber-500/10' },
    red:    { border: 'border-t-red-500',     icon: 'text-red-400',    bg: 'bg-red-500/10' },
    purple: { border: 'border-t-purple-500',  icon: 'text-purple-400', bg: 'bg-purple-500/10' },
    slate:  { border: 'border-t-slate-500',   icon: 'text-slate-400',  bg: 'bg-slate-500/10' },
  };
  const a = accents[accent] ?? accents.blue;

  const trendNum = parseFloat(trend);
  const trendPositive = !isNaN(trendNum) && trendNum > 0;
  const trendNegative = !isNaN(trendNum) && trendNum < 0;

  return (
    <div className={cn('devpulse-panel p-4 flex flex-col gap-1 border-t-2 group hover:scale-[1.02] transition-transform duration-200 cursor-default', a.border)}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 opacity-80">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">{label}</p>
        </div>
        {Icon && (
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', a.bg)}>
            <Icon className={cn('w-3.5 h-3.5', a.icon)} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mt-1">
        <p className="text-2xl font-bold tracking-tight text-white tabular-nums">{value ?? '—'}</p>
        {unit && <span className="text-xs text-[#666] font-medium">{unit}</span>}
      </div>

      {trend != null && (
        <div className="flex items-center gap-1 mt-1.5">
          {trendPositive && <TrendingUp className="w-3 h-3 text-emerald-400" />}
          {trendNegative && <TrendingDown className="w-3 h-3 text-red-400" />}
          <span className={cn(
            'text-[10px] font-semibold',
            trendPositive ? 'text-emerald-400' : trendNegative ? 'text-red-400' : 'text-slate-500'
          )}>
            {trendPositive ? '+' : ''}{trend}
          </span>
          {trendLabel && <span className="text-[10px] text-[#666]">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

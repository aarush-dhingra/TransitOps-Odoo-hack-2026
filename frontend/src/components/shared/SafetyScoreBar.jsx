import { cn } from '../../lib/utils';

export default function SafetyScoreBar({ score, className }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const color =
    pct >= 90 ? 'bg-emerald-500' :
    pct >= 70 ? 'bg-amber-500' :
    'bg-red-500';
  const textColor =
    pct >= 90 ? 'text-emerald-400' :
    pct >= 70 ? 'text-amber-400' :
    'text-red-400';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('text-sm font-bold tabular-nums w-8 text-right', textColor)}>{score ?? '—'}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-700/60 overflow-hidden min-w-[48px]">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

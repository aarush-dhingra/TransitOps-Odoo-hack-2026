import { AlertCircle, InboxIcon } from 'lucide-react';

export default function EmptyState({ type = 'empty', title, message, action }) {
  const Icon = type === 'error' ? AlertCircle : InboxIcon;
  const iconColor = type === 'error' ? 'text-red-400' : 'text-slate-500';

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-center px-4 glass-panel rounded-xl py-10 animate-fade-in-up">
      <div className={`p-4 rounded-full bg-slate-800/50 mb-2 ${type === 'error' ? 'bg-red-500/10' : ''}`}>
        <Icon className={`w-10 h-10 ${iconColor}`} />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-200">{title}</p>
        {message && <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{message}</p>}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

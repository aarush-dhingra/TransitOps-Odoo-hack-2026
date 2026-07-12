import { AlertCircle, InboxIcon } from 'lucide-react';

export default function EmptyState({ type = 'empty', title, message, action }) {
  const Icon = type === 'error' ? AlertCircle : InboxIcon;
  const iconColor = type === 'error' ? 'text-red-400' : 'text-slate-500';

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-center px-4">
      <Icon className={`w-10 h-10 ${iconColor}`} />
      <div>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        {message && <p className="text-xs text-slate-500 mt-1">{message}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

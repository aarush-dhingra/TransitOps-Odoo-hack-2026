import { Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const ROLE_LABELS = {
  FLEET_MANAGER:    'Fleet Mgr',
  DISPATCHER:       'Dispatcher',
  SAFETY_OFFICER:   'Safety Off.',
  FINANCIAL_ANALYST:'Fin. Analyst',
};

const ROLE_COLORS = {
  FLEET_MANAGER:    'bg-blue-600 text-white',
  DISPATCHER:       'bg-amber-500 text-slate-900',
  SAFETY_OFFICER:   'bg-emerald-600 text-white',
  FINANCIAL_ANALYST:'bg-purple-600 text-white',
};

export default function Topbar() {
  const { user } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="search"
          placeholder="Search..."
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* User name */}
        <span className="text-sm text-slate-300 hidden sm:block">{user?.name}</span>

        {/* Role badge */}
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${ROLE_COLORS[user?.role] ?? 'bg-slate-700 text-slate-200'}`}>
          {ROLE_LABELS[user?.role] ?? user?.role}
        </span>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white select-none">
          {initials}
        </div>
      </div>
    </header>
  );
}

import { Search, Bell, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useSearch } from '../../context/SearchContext';
import { cn } from '../../lib/utils';

export default function Topbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { query, setQuery } = useSearch();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 px-6 py-3 glass border-b border-white/5 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in current view…"
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-900/50 border border-white/10 rounded-full text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Smooth theme slider */}
        <div className="flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-slate-500" />
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={cn(
              'relative flex items-center w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none',
              theme === 'light' ? 'bg-amber-400' : 'bg-slate-700 border border-white/10'
            )}
          >
            <span
              className={cn(
                'absolute w-4 h-4 rounded-full shadow transition-transform duration-300',
                theme === 'light'
                  ? 'bg-white translate-x-6'
                  : 'bg-slate-400 translate-x-1'
              )}
            />
          </button>
          <Moon className="w-3.5 h-3.5 text-slate-500" />
        </div>

        {/* Notification bell (placeholder) */}
        <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
          <Bell className="w-4 h-4" />
        </button>

        {/* User name only */}
        <span className="text-sm text-slate-300 hidden md:block">{user?.name}</span>

        {/* Avatar only — no role badge */}
        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-400 select-none shadow-[0_0_10px_rgba(245,158,11,0.15)]">
          {initials}
        </div>
      </div>
    </header>
  );
}

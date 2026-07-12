import { useEffect, useRef, useState } from 'react';
import {
  Search, Bell, Moon, Sun,
  AlertTriangle, Info, ShieldAlert, Wrench, Route, CheckCircle2, X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useSearch } from '../../context/SearchContext';
import { useNotifications } from '../../context/NotificationsContext';
import { cn } from '../../lib/utils';

const SEV_ICON = {
  error:   <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />,
  warning: <ShieldAlert   className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />,
  info:    <Info          className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />,
};

const SEV_STRIP = {
  error:   'border-l-2 border-red-500/60',
  warning: 'border-l-2 border-amber-500/60',
  info:    'border-l-2 border-blue-500/50',
};

const TYPE_ICON = {
  LICENSE_EXPIRED:     <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />,
  LICENSE_EXPIRING:    <ShieldAlert   className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />,
  MAINTENANCE_OVERDUE: <Wrench        className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />,
  MAINTENANCE_UPCOMING:<Wrench        className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />,
  TRIP_ACTIVE:         <Route         className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />,
  TRIP_DISPATCHED:     <CheckCircle2  className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />,
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Topbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { query, setQuery } = useSearch();
  const { notifications, unreadCount, readIds, markRead, markAllRead } = useNotifications();

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const bellRef  = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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
        {/* Theme slider */}
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
                theme === 'light' ? 'bg-white translate-x-6' : 'bg-slate-400 translate-x-1'
              )}
            />
          </button>
          <Moon className="w-3.5 h-3.5 text-slate-500" />
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'relative w-8 h-8 rounded-full flex items-center justify-center transition-all',
              open
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            )}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-lg animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {open && (
            <div
              ref={panelRef}
              className="absolute right-0 top-full mt-2 w-80 glass-panel rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in-up"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">All clear — no alerts right now</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !readIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={cn(
                          'flex gap-3 px-4 py-3 cursor-pointer transition-colors',
                          SEV_STRIP[n.severity],
                          isUnread
                            ? 'bg-white/3 hover:bg-white/5'
                            : 'opacity-60 hover:opacity-80 hover:bg-white/3'
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          {TYPE_ICON[n.type] ?? SEV_ICON[n.severity]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-xs font-semibold leading-none mb-1', isUnread ? 'text-white' : 'text-slate-400')}>
                            {n.title}
                            {isUnread && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />}
                          </p>
                          <p className="text-[11px] text-slate-400 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-white/5 bg-white/2">
                  <p className="text-[10px] text-slate-600 text-center">
                    Refreshes every 30 s · {notifications.length} alert{notifications.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User name */}
        <span className="text-sm text-slate-300 hidden md:block">{user?.name}</span>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-400 select-none shadow-[0_0_10px_rgba(245,158,11,0.15)]">
          {initials}
        </div>
      </div>
    </header>
  );
}

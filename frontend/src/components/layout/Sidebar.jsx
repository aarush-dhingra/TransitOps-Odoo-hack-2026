import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Route, Wrench,
  Fuel, BarChart2, UserCog, LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NAV_ITEMS, canRead } from '../../lib/permissions';
import { cn } from '../../lib/utils';

const ICONS = {
  '/dashboard':   LayoutDashboard,
  '/vehicles':    Truck,
  '/drivers':     Users,
  '/trips':       Route,
  '/maintenance': Wrench,
  '/fuel':        Fuel,
  '/analytics':   BarChart2,
  '/users':       UserCog,
};

const ROLE_LABELS = {
  ADMIN:            'Admin',
  FLEET_MANAGER:    'Fleet Manager',
  DISPATCHER:       'Dispatcher',
  SAFETY_OFFICER:   'Safety Officer',
  FINANCIAL_ANALYST:'Financial Analyst',
};


export default function Sidebar() {
  const { user, logout } = useAuth();
  const visible = NAV_ITEMS.filter((item) => canRead(user?.role, item.resource));

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <aside className="flex flex-col w-56 h-screen sticky top-0 glass-panel border-r border-white/5 shrink-0 overflow-hidden">
      {/* Decorative glow — pointer-events-none so it never blocks nav clicks */}
      <div className="pointer-events-none fixed top-0 left-0 w-56 h-48 bg-amber-500/8 blur-[60px] -z-10 rounded-full" />

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_2px_8px_rgba(245,158,11,0.4)]">
            <Truck className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block leading-none">TransitOps</span>
            <span className="text-[10px] text-slate-500 font-medium leading-none mt-0.5 block">Fleet Platform</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 mb-2">Navigation</p>
        {visible.map(({ path, label }) => {
          const Icon = ICONS[path];
          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-amber-400' : '')} />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-white/5 space-y-3">
        {/* User card */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-200 truncate font-semibold leading-none">{user?.name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{ROLE_LABELS[user?.role] ?? user?.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

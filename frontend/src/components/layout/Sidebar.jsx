import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Route, Wrench,
  Fuel, BarChart2, Settings, LogOut,
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
  '/settings':    Settings,
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const visible = NAV_ITEMS.filter((item) => canRead(user?.role, item.resource));

  return (
    <aside className="flex flex-col w-52 min-h-screen glass-panel border-r border-white/5 shrink-0 animate-slide-in-right relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute top-0 left-0 w-full h-32 bg-amber-500/10 blur-[50px] -z-10 rounded-full" />
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <Truck className="w-5 h-5 text-amber-500" />
          TransitOps
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visible.map(({ path, label }) => {
          const Icon = ICONS[path];
          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300',
                  isActive
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-white/5 bg-black/20">
        <p className="text-xs text-slate-300 truncate font-medium">{user?.name}</p>
        <button
          onClick={logout}
          className="mt-2 flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

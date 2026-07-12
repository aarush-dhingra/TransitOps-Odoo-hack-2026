import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Route, Wrench,
  Fuel, BarChart2, Settings, LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

const navItems = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'],
  },
  {
    path: '/vehicles',
    label: 'Vehicles',
    icon: Truck,
    roles: ['FLEET_MANAGER'],
  },
  {
    path: '/drivers',
    label: 'Drivers',
    icon: Users,
    roles: ['FLEET_MANAGER', 'SAFETY_OFFICER'],
  },
  {
    path: '/trips',
    label: 'Trips',
    icon: Route,
    roles: ['FLEET_MANAGER', 'DISPATCHER'],
  },
  {
    path: '/maintenance',
    label: 'Maintenance',
    icon: Wrench,
    roles: ['FLEET_MANAGER'],
  },
  {
    path: '/fuel',
    label: 'Fuel & Expenses',
    icon: Fuel,
    roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST'],
  },
  {
    path: '/analytics',
    label: 'Analytics',
    icon: BarChart2,
    roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST'],
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['FLEET_MANAGER'],
  },
];

const roleLabel = {
  FLEET_MANAGER: 'Fleet Manager',
  DISPATCHER: 'Dispatcher',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
};

export default function Sidebar() {
  const { user, logout } = useAuth();

  const visible = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-slate-900 text-slate-100 shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-xl font-bold tracking-tight text-white">TransitOps</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visible.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 truncate">{user?.name}</p>
        <p className="text-xs text-slate-500 mb-3">{roleLabel[user?.role]}</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

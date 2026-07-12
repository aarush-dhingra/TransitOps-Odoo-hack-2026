import { Outlet } from 'react-router-dom';
import { LogOut, Truck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function DriverPortalShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-400" />
          <span className="font-semibold">TransitOps Driver</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-300">{user?.name}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

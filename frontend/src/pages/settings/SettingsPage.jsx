import { useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { toast } from 'sonner';

const RBAC_TABLE = [
  { role: 'Fleet Manager',    fleet: '✓',    drivers: '✓',    trips: '✓',    fuel: '✓',    analytics: '✓' },
  { role: 'Dispatcher',       fleet: 'View', drivers: '—',    trips: '✓',    fuel: '—',    analytics: '—' },
  { role: 'Safety Officer',   fleet: '—',    drivers: '✓',    trips: 'View', fuel: '—',    analytics: '—' },
  { role: 'Financial Analyst',fleet: 'View', drivers: '—',    trips: '—',    fuel: '✓',    analytics: '✓' },
];

const CURRENCIES = ['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'];
const DISTANCE_UNITS = ['Kilometers', 'Miles'];

export default function SettingsPage() {
  const [general, setGeneral] = useState({
    depotName:    'Gandhinagar Depot GJ4',
    currency:     'INR (₹)',
    distanceUnit: 'Kilometers',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    // Settings endpoint — backend team to implement; optimistic save for now
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success('Settings saved.');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings & RBAC" subtitle="Configure depot settings and view access control matrix" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* General settings */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-sm font-semibold text-white mb-5 uppercase tracking-wider">General</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Depot Name</label>
              <input
                type="text"
                value={general.depotName}
                onChange={(e) => setGeneral((g) => ({ ...g, depotName: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Currency</label>
              <select
                value={general.currency}
                onChange={(e) => setGeneral((g) => ({ ...g, currency: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Distance Unit</label>
              <select
                value={general.distanceUnit}
                onChange={(e) => setGeneral((g) => ({ ...g, distanceUnit: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {DISTANCE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* RBAC table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-sm font-semibold text-white mb-5 uppercase tracking-wider">Role-Based Access (RBAC)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="py-2 text-left pr-4">Role</th>
                  <th className="py-2 text-center px-3">Fleet</th>
                  <th className="py-2 text-center px-3">Drivers</th>
                  <th className="py-2 text-center px-3">Trips</th>
                  <th className="py-2 text-center px-3">Fuel/Exp</th>
                  <th className="py-2 text-center px-3">Analytics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {RBAC_TABLE.map(({ role, fleet, drivers, trips, fuel, analytics }) => (
                  <tr key={role} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 pr-4 text-slate-200 font-medium text-xs">{role}</td>
                    {[fleet, drivers, trips, fuel, analytics].map((val, i) => (
                      <td key={i} className="py-3 text-center px-3">
                        <span className={`text-xs font-semibold ${
                          val === '✓'    ? 'text-emerald-400' :
                          val === 'View' ? 'text-blue-400' :
                          'text-slate-600'
                        }`}>
                          {val}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600 mt-4">
            ✓ = Full access · View = Read only · — = No access
          </p>
        </div>
      </div>
    </div>
  );
}

import PageHeader from '../../components/shared/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { Shield, User, Mail, Tag } from 'lucide-react';

const ROLE_LABELS = {
  ADMIN:            'Administrator',
  FLEET_MANAGER:    'Fleet Manager',
  DISPATCHER:       'Dispatcher',
  SAFETY_OFFICER:   'Safety Officer',
  FINANCIAL_ANALYST:'Financial Analyst',
  DRIVER:           'Driver',
};

const ROLE_COLORS = {
  ADMIN:            'bg-red-500/15 text-red-400 border-red-500/25',
  FLEET_MANAGER:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  DISPATCHER:       'bg-amber-500/15 text-amber-400 border-amber-500/25',
  SAFETY_OFFICER:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  FINANCIAL_ANALYST:'bg-purple-500/15 text-purple-400 border-purple-500/25',
  DRIVER:           'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

const ACCESS_MATRIX = [
  { role: 'Fleet Manager',     fleet: 'Full',  drivers: 'Full',  trips: 'Full', fuel: 'Full', analytics: 'Full',  maintenance: 'Full' },
  { role: 'Dispatcher',        fleet: 'Read',  drivers: '—',     trips: 'Full', fuel: '—',    analytics: '—',     maintenance: '—' },
  { role: 'Safety Officer',    fleet: '—',     drivers: 'Full',  trips: 'Read', fuel: '—',    analytics: '—',     maintenance: '—' },
  { role: 'Financial Analyst', fleet: '—',     drivers: '—',     trips: '—',    fuel: 'Full', analytics: 'Full',  maintenance: '—' },
];

function CellValue({ val }) {
  if (val === 'Full')  return <span className="text-[11px] font-bold text-emerald-400">Full</span>;
  if (val === 'Read')  return <span className="text-[11px] font-bold text-blue-400">Read</span>;
  return <span className="text-[11px] text-slate-700">—</span>;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Settings" subtitle="Account details and platform access control" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Account card */}
        <div className="devpulse-panel p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#666] mb-5">Account</h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-lg font-bold text-amber-400 select-none">
              {initials}
            </div>
            <div>
              <p className="text-lg font-bold text-white">{user?.name ?? '—'}</p>
              <p className="text-sm text-slate-400">{user?.email ?? '—'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/3 border border-white/5 rounded-xl">
              <User className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#666]">Name</p>
                <p className="text-sm text-slate-200 truncate">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-white/3 border border-white/5 rounded-xl">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#666]">Email</p>
                <p className="text-sm text-slate-200 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-white/3 border border-white/5 rounded-xl">
              <Tag className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#666] mb-1.5">Role</p>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${ROLE_COLORS[user?.role] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
                  {ROLE_LABELS[user?.role] ?? user?.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Access Control Matrix */}
        <div className="devpulse-panel p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#666]">Role Access Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="thead-row rounded-lg">
                  <th className="py-2 text-left px-3 text-[10px]">Role</th>
                  <th className="py-2 text-center px-2 text-[10px]">Fleet</th>
                  <th className="py-2 text-center px-2 text-[10px]">Drivers</th>
                  <th className="py-2 text-center px-2 text-[10px]">Trips</th>
                  <th className="py-2 text-center px-2 text-[10px]">Fuel</th>
                  <th className="py-2 text-center px-2 text-[10px]">Reports</th>
                  <th className="py-2 text-center px-2 text-[10px]">Maint.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {ACCESS_MATRIX.map(({ role, fleet, drivers, trips, fuel, analytics, maintenance }) => (
                  <tr key={role} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-3 px-3 text-slate-300 font-semibold text-xs whitespace-nowrap">{role}</td>
                    {[fleet, drivers, trips, fuel, analytics, maintenance].map((val, i) => (
                      <td key={i} className="py-3 text-center px-2"><CellValue val={val} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[#555] mt-4">Admin role has unrestricted access to all modules.</p>
        </div>
      </div>
    </div>
  );
}

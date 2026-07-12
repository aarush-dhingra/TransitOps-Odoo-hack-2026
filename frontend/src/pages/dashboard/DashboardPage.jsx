import { useEffect, useState, useCallback } from 'react';
import { Truck, CheckCircle, Wrench, Route, Clock, Users, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { getDashboardStats } from '../../api/analytics';
import { getTrips } from '../../api/trips';
import StatCard from '../../components/shared/StatCard';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatDateTime } from '../../lib/utils';

const STATUS_COLORS = {
  AVAILABLE:   '#10b981',
  ON_TRIP:     '#3b82f6',
  MAINTENANCE: '#f59e0b',
  RETIRED:     '#ef4444',
};

export default function DashboardPage() {
  const [stats,     setStats]     = useState(null);
  const [trips,     setTrips]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, tripRes] = await Promise.all([
        getDashboardStats(),
        getTrips({ status: 'ACTIVE' }),
      ]);
      setStats(dashRes.data.data);
      setTrips(tripRes.data.data?.slice(0, 6) ?? []);
    } catch {
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <LoadingSpinner message="Loading dashboard…" />;
  if (error)   return (
    <EmptyState
      type="error"
      title="Dashboard unavailable"
      message={error}
      action={<button onClick={fetchAll} className="btn-amber">Retry</button>}
    />
  );

  const vehicleStatusData = stats?.vehicleStatusCounts
    ? Object.entries(stats.vehicleStatusCounts).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard label="Active Vehicles"       value={stats?.activeVehicles}       accent="blue"   icon={Truck} />
        <StatCard label="Available Vehicles"    value={stats?.availableVehicles}    accent="green"  icon={CheckCircle} />
        <StatCard label="In Maintenance"        value={stats?.vehiclesInMaintenance} accent="amber" icon={Wrench} />
        <StatCard label="Active Trips"          value={stats?.activeTrips}          accent="blue"   icon={Route} />
        <StatCard label="Pending Trips"         value={stats?.pendingTrips}         accent="slate"  icon={Clock} />
        <StatCard label="Drivers on Duty"       value={stats?.driversOnDuty}        accent="purple" icon={Users} />
        <StatCard
          label="Fleet Utilization"
          value={stats?.fleetUtilization != null ? `${stats.fleetUtilization}%` : '—'}
          accent="green"
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Trips */}
        <div className="xl:col-span-2 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">Recent Trips</h2>
          </div>
          {trips.length === 0 ? (
            <EmptyState title="No active trips" message="Trips will appear here once dispatched." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Trip</th>
                    <th className="px-5 py-3 text-left">Vehicle</th>
                    <th className="px-5 py-3 text-left">Driver</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Departure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {trips.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">{t.tripNumber}</td>
                      <td className="px-5 py-3 text-slate-300">{t.vehicle?.registrationNumber ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-300">{t.driver?.name ?? '—'}</td>
                      <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{formatDateTime(t.plannedDeparture)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vehicle Status Chart */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Vehicle Status</h2>
          {vehicleStatusData.length === 0 ? (
            <EmptyState title="No vehicle data" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vehicleStatusData} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={85}
                  tickFormatter={(v) => ({ AVAILABLE: 'Available', ON_TRIP: 'On Trip', MAINTENANCE: 'In Shop', RETIRED: 'Retired' }[v] ?? v)}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: '#334155' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {vehicleStatusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

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
import { usePermissions } from '../../hooks/useAuth';

const STATUS_COLORS = {
  AVAILABLE:   '#10b981',
  ON_TRIP:     '#3b82f6',
  MAINTENANCE: '#f59e0b',
  RETIRED:     '#ef4444',
};

export default function DashboardPage() {
  const { canRead } = usePermissions();
  const canViewTrips = canRead('trips');
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
        canViewTrips ? getTrips({ status: 'ACTIVE' }) : Promise.resolve({ data: { data: [] } }),
      ]);
      setStats(dashRes.data.data);
      setTrips(tripRes.data.data?.slice(0, 6) ?? []);
    } catch {
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [canViewTrips]);

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

  const getCount = (arr, status) => arr?.find(x => x.status === status)?.count || 0;

  const availableVehicles = getCount(stats?.vehicles?.byStatus, 'AVAILABLE');
  const onTripVehicles = getCount(stats?.vehicles?.byStatus, 'ON_TRIP');
  const activeVehicles = availableVehicles + onTripVehicles;
  const inMaintenance = getCount(stats?.vehicles?.byStatus, 'MAINTENANCE');
  const driversOnDuty = getCount(stats?.drivers?.byStatus, 'ON_TRIP');

  const vehicleStatusData = stats?.vehicles?.byStatus?.map(g => ({ name: g.status, value: g.count })) || [];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard label="Active Vehicles"       value={activeVehicles}       accent="blue"   icon={Truck} />
        <StatCard label="Available Vehicles"    value={availableVehicles}    accent="green"  icon={CheckCircle} />
        <StatCard label="In Maintenance"        value={inMaintenance}        accent="amber" icon={Wrench} />
        <StatCard label="Active Trips"          value={stats?.trips?.active || 0} accent="blue"   icon={Route} />
        <StatCard label="Completed Trips"       value={stats?.trips?.completed || 0} accent="slate"  icon={Clock} />
        <StatCard label="Drivers on Duty"       value={driversOnDuty}        accent="purple" icon={Users} />
        <StatCard
          label="Maint. Alerts"
          value={stats?.vehicles?.maintenanceDue || 0}
          accent="red"
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Trips */}
        <div className="xl:col-span-2 devpulse-panel overflow-hidden">
          <div className="px-6 py-4 border-b border-[#222]">
            <h2 className="text-sm font-semibold text-white tracking-wide">Recent Trips</h2>
          </div>
          {trips.length === 0 ? (
            <EmptyState title="No active trips" message="Trips will appear here once dispatched." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#222] text-[10px] text-[#666] uppercase tracking-widest bg-[#0a0a0a]">
                    <th className="px-6 py-3 text-left font-bold">Trip</th>
                    <th className="px-6 py-3 text-left font-bold">Vehicle</th>
                    <th className="px-6 py-3 text-left font-bold">Driver</th>
                    <th className="px-6 py-3 text-left font-bold">Status</th>
                    <th className="px-6 py-3 text-left font-bold">Departure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {trips.map((t) => (
                    <tr key={t.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-[#888]">{t.tripNumber}</td>
                      <td className="px-6 py-4 text-white text-sm font-medium">{t.vehicle?.registrationNumber ?? '—'}</td>
                      <td className="px-6 py-4 text-zinc-300 text-sm">{t.driver?.name ?? '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                      <td className="px-6 py-4 text-[#888] text-xs">{formatDateTime(t.plannedDeparture)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vehicle Status Chart */}
        <div className="devpulse-panel p-6">
          <h2 className="text-sm font-semibold text-white mb-6 tracking-wide">Fleet Status</h2>
          {vehicleStatusData.length === 0 ? (
            <EmptyState title="No vehicle data" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vehicleStatusData} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fill: '#666', fontSize: 10 }} axisLine={{ stroke: '#222' }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#888', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={85}
                  tickFormatter={(v) => ({ AVAILABLE: 'Available', ON_TRIP: 'On Trip', MAINTENANCE: 'In Shop', RETIRED: 'Retired' }[v] ?? v)}
                />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: '12px' }}
                  labelStyle={{ color: '#888', marginBottom: '4px' }}
                  cursor={{ fill: '#1a1a1a' }}
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

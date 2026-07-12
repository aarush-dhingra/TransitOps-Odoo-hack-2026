import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid,
} from 'recharts';
import { getDashboardStats, getFleetUtilization, getFuelEfficiency, getCostBreakdown } from '../../api/analytics';
import StatCard from '../../components/shared/StatCard';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatCurrency } from '../../lib/utils';
import { Fuel, Activity, DollarSign, TrendingUp } from 'lucide-react';

const VEHICLE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [dashboard,    setDashboard]    = useState(null);
  const [utilization,  setUtilization]  = useState([]);
  const [fuelEff,      setFuelEff]      = useState(null);
  const [costs,        setCosts]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dRes, uRes, fRes, cRes] = await Promise.all([
        getDashboardStats(),
        getFleetUtilization(),
        getFuelEfficiency(),
        getCostBreakdown(),
      ]);
      setDashboard(dRes.data.data   ?? null);
      setUtilization(uRes.data.data ?? []);
      setFuelEff(fRes.data.data     ?? null);
      setCosts(cRes.data.data       ?? null);
    } catch {
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <LoadingSpinner message="Loading analytics…" />;
  if (error)   return (
    <EmptyState type="error" title="Analytics unavailable" message={error}
      action={<button onClick={fetchAll} className="text-sm text-amber-400 hover:underline">Retry</button>} />
  );

  // Monthly revenue data from utilization endpoint
  const monthlyData = Array.isArray(utilization) ? utilization : [];

  // Top costliest vehicles
  const topCostly = costs?.topCostliest ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" subtitle="Fleet performance metrics and cost breakdown" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Fuel Efficiency"
          value={fuelEff?.avgKmPerLitre != null ? `${fuelEff.avgKmPerLitre} km/l` : '—'}
          accent="green"
          icon={Fuel}
        />
        <StatCard
          label="Fleet Utilization"
          value={dashboard?.fleetUtilization != null ? `${dashboard.fleetUtilization}%` : '—'}
          accent="blue"
          icon={Activity}
        />
        <StatCard
          label="Operational Cost"
          value={costs?.totalOperationalCost != null ? formatCurrency(costs.totalOperationalCost) : '—'}
          accent="amber"
          icon={DollarSign}
        />
        <StatCard
          label="Vehicle ROI"
          value={costs?.avgRoi != null ? `${costs.avgRoi}%` : '—'}
          accent="purple"
          icon={TrendingUp}
          sub="ROI = (Revenue – (Maint + Fuel)) / Acq. Cost"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly utilization / revenue chart */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Monthly Fleet Utilization</h2>
          {monthlyData.length === 0 ? (
            <EmptyState title="No data" message="Utilization data will appear after trips are completed." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: '#1e293b' }}
                />
                <Bar dataKey="utilization" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top costliest vehicles */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Top Costliest Vehicles</h2>
          {topCostly.length === 0 ? (
            <EmptyState title="No data" message="Cost data will appear after expenses are logged." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topCostly} layout="vertical" barSize={14}>
                <XAxis
                  type="number"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="vehicle"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(v) => [formatCurrency(v), 'Cost']}
                  cursor={{ fill: '#1e293b' }}
                />
                <Bar dataKey="totalCost" radius={[0, 4, 4, 0]}>
                  {topCostly.map((_, i) => (
                    <Cell key={i} fill={VEHICLE_COLORS[i % VEHICLE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ROI formula note */}
      <p className="text-xs text-slate-600">
        ROI = (Revenue – (Maintenance + Fuel)) / Acquisition Cost
      </p>
    </div>
  );
}

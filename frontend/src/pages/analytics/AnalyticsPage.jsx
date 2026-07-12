import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, Legend,
} from 'recharts';
import { getDashboardStats, getFuelEfficiency, getCostBreakdown, getVehicleCosts } from '../../api/analytics';
import StatCard from '../../components/shared/StatCard';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatCurrency } from '../../lib/utils';
import { Fuel, Activity, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#111', border: '1px solid #222', borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: '#888', marginBottom: 4 },
  cursor:       { fill: '#1a1a1a' },
};

export default function AnalyticsPage() {
  const [dashboard,    setDashboard]    = useState(null);
  const [fuelEff,      setFuelEff]      = useState(null);
  const [costs,        setCosts]        = useState(null);
  const [vehicleCosts, setVehicleCosts] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dRes, fRes, cRes, vcRes] = await Promise.all([
        getDashboardStats(),
        getFuelEfficiency(),
        getCostBreakdown(),
        getVehicleCosts(),
      ]);
      setDashboard(dRes.data.data   ?? null);
      setFuelEff(fRes.data.data     ?? null);
      setCosts(cRes.data.data       ?? null);
      setVehicleCosts(vcRes.data.data ?? []);
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

  // Derived values using correct data shapes
  const totalLitres     = fuelEff?.overall?.totalLitres ?? 0;
  const totalFuelCost   = fuelEff?.overall?.totalCost   ?? 0;
  const utilizationPct  = dashboard?.vehicles?.utilizationPct ?? 0;
  const totalOpsCost    = costs?.summary?.totalCost ?? 0;

  // Stacked bar chart data: top 8 vehicles by total cost
  const stackedData = vehicleCosts
    .slice(0, 8)
    .map((v) => ({
      vehicle:     v.registration_number ?? v.registrationNumber ?? 'Unknown',
      fuel:        Math.round(v.fuel_cost ?? v.fuelCost ?? 0),
      maintenance: Math.round(v.maintenance_cost ?? v.maintenanceCost ?? 0),
      other:       Math.round(v.expense_cost ?? v.expenseCost ?? 0),
    }));

  // Monthly cost data from costs endpoint
  const monthlyFuel    = (costs?.fuelByMonth ?? []).slice(0, 6).reverse();
  const monthlyExpense = (costs?.expenseByMonth ?? []).slice(0, 6).reverse();

  // Merge monthly data
  const mergedMonthly = monthlyFuel.map((f) => {
    const matchExp = monthlyExpense.find((e) => e.month === f.month);
    return {
      month:   f.month,
      fuel:    Math.round(f.fuel_cost ?? 0),
      expense: Math.round(matchExp?.expense_cost ?? 0),
    };
  });

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Reports & Analytics" subtitle="Fleet performance metrics and cost breakdown" />

      {/* KPI cards — using correct data keys */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Total Fuel Used"
          value={totalLitres > 0 ? `${totalLitres.toFixed(0)} L` : '—'}
          accent="green"
          icon={Fuel}
        />
        <StatCard
          label="Fleet Utilization"
          value={utilizationPct != null ? `${utilizationPct}%` : '—'}
          accent="blue"
          icon={Activity}
        />
        <StatCard
          label="Total Fuel Cost"
          value={totalFuelCost > 0 ? formatCurrency(totalFuelCost) : '—'}
          accent="amber"
          icon={DollarSign}
        />
        <StatCard
          label="Total Ops Cost"
          value={totalOpsCost > 0 ? formatCurrency(totalOpsCost) : '—'}
          accent="red"
          icon={TrendingUp}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Monthly costs chart */}
        <div className="devpulse-panel p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Monthly Costs</h2>
          <p className="text-xs text-[#666] mb-4">Fuel vs other expenses over last 6 months</p>
          {mergedMonthly.length === 0 ? (
            <EmptyState title="No data" message="Cost data will appear after fuel logs are added." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mergedMonthly} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [formatCurrency(v), n === 'fuel' ? 'Fuel' : 'Expenses']} />
                <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v === 'fuel' ? 'Fuel' : 'Expenses'}</span>} />
                <Bar dataKey="fuel"    name="fuel"    fill="#f59e0b" radius={[3,3,0,0]} stackId="a" />
                <Bar dataKey="expense" name="expense" fill="#3b82f6" radius={[3,3,0,0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Per-vehicle stacked cost */}
        <div className="devpulse-panel p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Cost per Vehicle</h2>
          <p className="text-xs text-[#666] mb-4">Fuel · Maintenance · Other (top 8)</p>
          {stackedData.length === 0 ? (
            <EmptyState title="No data" message="Cost data will appear after fuel logs are recorded." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stackedData} layout="vertical" barSize={12}>
                <XAxis type="number" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="vehicle" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} width={75} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [formatCurrency(v), n.charAt(0).toUpperCase() + n.slice(1)]} />
                <Bar dataKey="fuel"        fill="#f59e0b" radius={[0,0,0,0]} stackId="b" />
                <Bar dataKey="maintenance" fill="#3b82f6" radius={[0,0,0,0]} stackId="b" />
                <Bar dataKey="other"       fill="#64748b" radius={[0,2,2,0]} stackId="b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Vehicle ROI table */}
      <div className="devpulse-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-[#222]">
          <h2 className="text-sm font-semibold text-white">Vehicle ROI</h2>
          <p className="text-xs text-[#666] mt-0.5">ROI = (Revenue − Cost) ÷ Acquisition Cost × 100</p>
        </div>

        {vehicleCosts.length === 0 ? (
          <EmptyState title="No vehicle cost data" message="Data appears after trips and fuel logs are recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="thead-row">
                  <th className="px-5 py-3 text-left">Vehicle</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-right">Fuel Cost</th>
                  <th className="px-5 py-3 text-right">Maintenance</th>
                  <th className="px-5 py-3 text-right">Other</th>
                  <th className="px-5 py-3 text-right">Total Cost</th>
                  <th className="px-5 py-3 text-right">Revenue</th>
                  <th className="px-5 py-3 text-right">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {vehicleCosts.map((v, i) => {
                  const roi       = v.roi ?? null;
                  const regNumber = v.registration_number ?? v.registrationNumber ?? '—';
                  const type      = v.type ?? '—';
                  const fuelCost  = v.fuel_cost ?? v.fuelCost ?? 0;
                  const maintCost = v.maintenance_cost ?? v.maintenanceCost ?? 0;
                  const otherCost = v.expense_cost ?? v.expenseCost ?? 0;
                  const totalCost = v.total_cost ?? v.totalCost ?? 0;
                  const revenue   = v.total_revenue ?? v.totalRevenue ?? 0;

                  return (
                    <tr key={i} className="tbody-row">
                      <td className="px-5 py-3 font-mono text-xs text-slate-300 font-semibold">{regNumber}</td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700/40 text-slate-400">{type}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-amber-400/90 text-xs tabular-nums">{formatCurrency(fuelCost)}</td>
                      <td className="px-5 py-3 text-right text-blue-400/90 text-xs tabular-nums">{formatCurrency(maintCost)}</td>
                      <td className="px-5 py-3 text-right text-slate-400 text-xs tabular-nums">{formatCurrency(otherCost)}</td>
                      <td className="px-5 py-3 text-right text-slate-200 font-semibold text-xs tabular-nums">{formatCurrency(totalCost)}</td>
                      <td className="px-5 py-3 text-right text-emerald-400 text-xs tabular-nums">{formatCurrency(revenue)}</td>
                      <td className="px-5 py-3 text-right">
                        {roi == null ? (
                          <span className="text-[11px] text-slate-600">—</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            roi >= 0
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}>
                            {roi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense by category */}
      {costs?.expenseByCategory?.length > 0 && (
        <div className="devpulse-panel p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Expense by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {costs.expenseByCategory.map((c) => (
              <div key={c.category} className="bg-white/3 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">{c.category.replace(/_/g, ' ')}</p>
                <p className="text-sm font-bold text-amber-400 tabular-nums">{formatCurrency(c.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

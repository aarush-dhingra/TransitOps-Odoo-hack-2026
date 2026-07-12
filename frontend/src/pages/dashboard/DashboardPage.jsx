import { useEffect, useState, useCallback } from 'react';
import {
  Truck, CheckCircle, Wrench, Route, Clock,
  Users, Activity, DollarSign, AlertTriangle, ShieldCheck,
  TrendingUp, Fuel,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboardStats } from '../../api/analytics';
import StatCard from '../../components/shared/StatCard';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatDateTime, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

const STATUS_COLORS = {
  AVAILABLE:   '#10b981',
  ON_TRIP:     '#3b82f6',
  MAINTENANCE: '#f59e0b',
  IN_SHOP:     '#f59e0b',
  RETIRED:     '#ef4444',
};

const STATUS_LABELS = {
  AVAILABLE:   'Available',
  ON_TRIP:     'On Trip',
  MAINTENANCE: 'In Shop',
  IN_SHOP:     'In Shop',
  RETIRED:     'Retired',
};

/** Returns the KPI card definitions relevant to a role */
function getKpiCards(role, stats) {
  const onTripVehicles  = count(stats?.vehicles?.byStatus, 'ON_TRIP');
  const available       = count(stats?.vehicles?.byStatus, 'AVAILABLE');
  const inMaintenance   = (count(stats?.vehicles?.byStatus, 'MAINTENANCE') + count(stats?.vehicles?.byStatus, 'IN_SHOP'));
  const driversOnDuty   = stats?.drivers?.onDuty ?? 0;
  const activeTrips     = stats?.trips?.active   ?? 0;
  const completedTrips  = stats?.trips?.completed ?? 0;
  const draftTrips      = stats?.trips?.pending   ?? 0;
  const maintAlerts     = stats?.vehicles?.maintenanceDue ?? 0;
  const fuelThisMonth   = stats?.costsThisMonth?.fuel      ?? 0;
  const expThisMonth    = stats?.costsThisMonth?.expenses  ?? 0;
  const totalThisMonth  = fuelThisMonth + expThisMonth;
  const utilizationPct  = stats?.vehicles?.utilizationPct ?? 0;

  switch (role) {
    case 'FLEET_MANAGER':
      return [
        { label: 'Available Vehicles',  value: available,          accent: 'green',  icon: CheckCircle },
        { label: 'On Trip',             value: onTripVehicles,     accent: 'blue',   icon: Truck },
        { label: 'In Maintenance',      value: inMaintenance,      accent: 'amber',  icon: Wrench },
        { label: 'Maintenance Alerts',  value: maintAlerts,        accent: 'red',    icon: AlertTriangle },
        { label: 'Trips En Route',       value: activeTrips,        accent: 'blue',   icon: Route },
        { label: 'Completed Trips',     value: completedTrips,     accent: 'slate',  icon: Clock },
        { label: 'Drivers On Duty',     value: driversOnDuty,      accent: 'purple', icon: Users },
        { label: 'Ops Cost (Month)',    value: formatCurrency(totalThisMonth), accent: 'amber', icon: DollarSign },
      ];

    case 'DISPATCHER':
      return [
        { label: 'Available Vehicles',  value: available,           accent: 'green',  icon: CheckCircle },
        { label: 'On Trip',             value: onTripVehicles,      accent: 'blue',   icon: Truck },
        { label: 'Draft Trips',         value: draftTrips,          accent: 'slate',  icon: Clock },
        { label: 'Trips En Route',      value: activeTrips,         accent: 'blue',   icon: Activity },
        { label: 'Completed Trips',     value: completedTrips,      accent: 'green',  icon: Route },
        { label: 'Fleet Utilization',   value: `${utilizationPct}%`, accent: 'amber', icon: TrendingUp },
      ];

    case 'SAFETY_OFFICER':
      return [
        { label: 'Drivers On Duty',     value: driversOnDuty,       accent: 'blue',   icon: Users },
        { label: 'Trips En Route',      value: activeTrips,         accent: 'amber',  icon: Route },
        { label: 'Completed Trips',     value: completedTrips,      accent: 'green',  icon: CheckCircle },
        { label: 'Maintenance Alerts',  value: maintAlerts,         accent: 'red',    icon: AlertTriangle },
        { label: 'Fleet Utilization',   value: `${utilizationPct}%`, accent: 'slate', icon: ShieldCheck },
      ];

    case 'FINANCIAL_ANALYST':
      return [
        { label: 'Fuel Cost (Month)',   value: formatCurrency(fuelThisMonth),  accent: 'amber',  icon: Fuel },
        { label: 'Other Expenses (Mo.)',value: formatCurrency(expThisMonth),   accent: 'blue',   icon: DollarSign },
        { label: 'Total Ops (Month)',   value: formatCurrency(totalThisMonth), accent: 'red',    icon: TrendingUp },
        { label: 'Completed Trips',     value: completedTrips,                 accent: 'green',  icon: CheckCircle },
        { label: 'Trips En Route',      value: activeTrips,                    accent: 'slate',  icon: Route },
      ];

    default: // ADMIN
      return [
        { label: 'Available Vehicles',  value: available,      accent: 'green',  icon: CheckCircle },
        { label: 'On Trip',             value: onTripVehicles, accent: 'blue',   icon: Truck },
        { label: 'In Maintenance',      value: inMaintenance,  accent: 'amber',  icon: Wrench },
        { label: 'Active Trips',        value: activeTrips,    accent: 'blue',   icon: Route },
        { label: 'Completed Trips',     value: completedTrips, accent: 'slate',  icon: Clock },
        { label: 'Drivers On Duty',     value: driversOnDuty,  accent: 'purple', icon: Users },
        { label: 'Ops Cost (Month)',     value: formatCurrency(totalThisMonth), accent: 'amber', icon: DollarSign },
      ];
  }
}

function count(arr, status) {
  return arr?.find(x => x.status === status)?.count ?? 0;
}

function DonutCenter({ cx, cy, pct }) {
  return (
    <>
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-amber-500 dark:fill-amber-500" fontSize={26} fontWeight={700}>{pct}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" fontSize={11}>Utilization</text>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDashboardStats();
      setStats(res.data.data);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <LoadingSpinner message="Loading dashboard…" />;
  if (error)   return (
    <EmptyState type="error" title="Dashboard unavailable" message={error}
      action={<button onClick={fetchAll} className="btn-amber">Retry</button>} />
  );

  const kpiCards = getKpiCards(role, stats);

  const vehicleStatusData = (stats?.vehicles?.byStatus ?? [])
    .filter(g => g.count > 0)
    .map(g => ({
      name:  STATUS_LABELS[g.status] ?? g.status,
      value: g.count,
      color: STATUS_COLORS[g.status] ?? '#64748b',
    }));

  const utilizationPct = stats?.vehicles?.utilizationPct ?? 0;
  const recentTrips    = stats?.recentTrips ?? [];

  // Financial Analysts don't need the fleet donut since they can't access fleet
  const showDonut = role !== 'FINANCIAL_ANALYST';
  const colSpan   = showDonut ? 'xl:col-span-2' : 'xl:col-span-3';

  const ROLE_GREETINGS = {
    FLEET_MANAGER:     'Fleet Operations',
    DISPATCHER:        'Dispatch Centre',
    SAFETY_OFFICER:    'Safety Overview',
    FINANCIAL_ANALYST: 'Financial Overview',
    ADMIN:             'Platform Overview',
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{ROLE_GREETINGS[role] ?? 'Dashboard'}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Welcome back, {user?.name} — live data as of now</p>
      </div>

      {/* Role-specific KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent Trips */}
        <div className={`${colSpan} devpulse-panel overflow-hidden`}>
          <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white tracking-wide">Recent Trips</h2>
            <span className="text-[10px] text-[#666] uppercase tracking-widest">Last 10</span>
          </div>
          {recentTrips.length === 0 ? (
            <EmptyState title="No trips yet" message="Dispatched trips will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="thead-row">
                    <th className="px-5 py-3 text-left">Trip #</th>
                    <th className="px-5 py-3 text-left">Vehicle</th>
                    <th className="px-5 py-3 text-left">Driver</th>
                    <th className="px-5 py-3 text-left">Route</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Departure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {recentTrips.map((t) => (
                    <tr key={t.id} className="tbody-row">
                      <td className="px-5 py-3 font-mono text-[11px] text-[#888]">{t.tripNumber}</td>
                      <td className="px-5 py-3 text-white text-xs font-medium">{t.vehicle?.registrationNumber ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-300 text-xs">{t.driver?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs max-w-[180px]">
                        <span className="truncate block">{t.originAddress?.split(',')[0] ?? '—'}</span>
                        <span className="text-[#666] text-[10px]">→ {t.destinationAddress?.split(',')[0] ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-5 py-3 text-[#888] text-[11px] whitespace-nowrap">{formatDateTime(t.plannedDeparture)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Fleet Status Donut — only for roles that can see fleet data */}
        {showDonut && (
          <div className="devpulse-panel p-5 flex flex-col">
            <h2 className="text-sm font-semibold text-white mb-1 tracking-wide">Fleet Status</h2>
            <p className="text-xs text-[#666] mb-4">Vehicle distribution</p>

            {vehicleStatusData.length === 0 ? (
              <EmptyState title="No vehicle data" />
            ) : (
              <div className="flex-1 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={vehicleStatusData}
                      cx="50%" cy="50%"
                      innerRadius={58} outerRadius={82}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {vehicleStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="#111111" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        fontSize: 12,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        color: '#f1f5f9',
                        padding: '6px 12px',
                      }}
                      itemStyle={{ color: '#f1f5f9', fontWeight: 600 }}
                      labelStyle={{ color: '#94a3b8' }}
                      cursor={false}
                    />
                    <DonutCenter cx="50%" cy="50%" pct={utilizationPct} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="w-full space-y-2 mt-2">
                  {vehicleStatusData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-xs text-slate-400">{d.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-white tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

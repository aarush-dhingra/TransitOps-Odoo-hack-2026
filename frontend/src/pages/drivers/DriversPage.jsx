import { useEffect, useState, useCallback } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { getDrivers, createDriver, updateDriver, updateDriverStatus } from '../../api/drivers';
import StatusBadge from '../../components/shared/StatusBadge';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import SafetyScoreBar from '../../components/shared/SafetyScoreBar';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import { usePermissions } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { cn } from '../../lib/utils';

const DRIVER_STATUSES    = ['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'ON_LEAVE', 'SUSPENDED'];
const LICENSE_CATEGORIES = ['LMV', 'HMV', 'HPMV', 'TRANS'];
const STATUS_FILTERS     = ['', 'AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED'];

const STATUS_FILTER_COLORS = {
  '':          'bg-white/8 text-slate-300 border border-white/10',
  AVAILABLE:   'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
  ON_TRIP:     'bg-blue-500/15 text-blue-300 border border-blue-500/25',
  OFF_DUTY:    'bg-slate-500/15 text-slate-300 border border-slate-500/25',
  SUSPENDED:   'bg-orange-500/15 text-orange-300 border border-orange-500/25',
};

const EMPTY_FORM = {
  name:            '',
  phone:           '',
  email:           '',
  licenseNumber:   '',
  licenseCategory: 'LMV',
  licenseExpiry:   '',
  status:          'AVAILABLE',
};

const QUICK_OPTS = [
  { value: 'AVAILABLE', label: 'Available', active: 'bg-emerald-500 text-white', idle: 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10' },
  { value: 'OFF_DUTY',  label: 'Off Duty',  active: 'bg-slate-600 text-white',   idle: 'text-slate-500 hover:text-slate-300 hover:bg-slate-500/10' },
  { value: 'SUSPENDED', label: 'Suspend',   active: 'bg-orange-500 text-white',  idle: 'text-slate-500 hover:text-orange-400 hover:bg-orange-500/10' },
];

function QuickStatusControl({ current, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-white/8 overflow-hidden divide-x divide-white/8 bg-white/3">
      {QUICK_OPTS.map(({ value, label, active, idle }) => (
        <button
          key={value}
          onClick={() => current !== value && onChange(value)}
          disabled={current === value}
          className={cn(
            'px-2.5 py-1.5 text-[10px] font-semibold transition-all leading-none whitespace-nowrap',
            current === value ? active : idle,
            'disabled:cursor-default'
          )}
          title={`Set to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  return Math.floor((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function LicenseExpiryPill({ dateStr }) {
  if (!dateStr) return <span className="text-slate-600 text-xs">—</span>;
  const days = daysUntilExpiry(dateStr);
  const formatted = formatDate(dateStr);

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        EXPIRED · {formatted}
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        {days}d · {formatted}
      </span>
    );
  }
  if (days <= 90) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {days}d · {formatted}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      {formatted}
    </span>
  );
}

export default function DriversPage() {
  const { canWrite } = usePermissions();
  const canEditDrivers = canWrite('drivers');
  const { query } = useSearch();

  const [drivers,    setDrivers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDrivers();
      setDrivers(res.data.data ?? []);
    } catch {
      setError('Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDrawerOpen(true); };
  const openEdit   = (d) => {
    if (!canEditDrivers) return;
    setEditing(d);
    setForm({
      name:            d.name,
      phone:           d.phone,
      email:           d.email ?? '',
      licenseNumber:   d.licenseNumber,
      licenseCategory: d.licenseCategory,
      licenseExpiry:   d.licenseExpiry?.slice(0, 10) ?? '',
      status:          d.status,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateDriver(editing.id, form);
        toast.success(`${form.name} updated.`);
      } else {
        await createDriver(form);
        toast.success(`Driver ${form.name} added.`);
      }
      setDrawerOpen(false);
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to save driver.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (driver, newStatus) => {
    try {
      await updateDriverStatus(driver.id, newStatus);
      toast.success(`${driver.name} is now ${newStatus.replace('_', ' ').toLowerCase()}.`);
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to update status.');
    }
  };

  const q = query.toLowerCase();
  const displayed = drivers.filter(d => {
    const matchesStatus = !statusFilter || d.status === statusFilter;
    const matchesQuery  = !q ||
      d.name.toLowerCase().includes(q) ||
      d.licenseNumber.toLowerCase().includes(q) ||
      (d.phone ?? '').includes(q);
    return matchesStatus && matchesQuery;
  });

  const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all';

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Drivers & Safety"
        subtitle="Manage driver profiles, licenses, and safety scores"
        action={canEditDrivers ? (
          <button onClick={openCreate} className="flex items-center gap-2 btn-amber">
            <Plus className="w-4 h-4" /> Add Driver
          </button>
        ) : null}
      />

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 font-medium">Filter:</span>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
              statusFilter === s
                ? 'bg-amber-500 text-slate-900 shadow-[0_2px_8px_rgba(245,158,11,0.35)]'
                : STATUS_FILTER_COLORS[s]
            )}
          >
            {s || 'All'}
          </button>
        ))}
        <span className="text-[11px] text-slate-600 ml-1">{displayed.length} driver{displayed.length !== 1 ? 's' : ''}</span>
      </div>

      <p className="text-xs text-amber-400/70">
        Expired license or Suspended status blocks trip assignment
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState type="error" title="Could not load drivers" message={error}
          action={<button onClick={fetchDrivers} className="text-sm text-amber-400 hover:underline">Retry</button>} />
      ) : displayed.length === 0 ? (
        <EmptyState title="No drivers found" message={statusFilter || query ? 'Try clearing your filters.' : 'Add a driver to get started.'} />
      ) : (
        <div className="devpulse-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="thead-row">
                  <th className="px-5 py-3 text-left">Driver</th>
                  <th className="px-5 py-3 text-left">License</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Expiry</th>
                  <th className="px-5 py-3 text-left">Contact</th>
                  <th className="px-5 py-3 text-left">Safety Score</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  {canEditDrivers && <th className="px-5 py-3 text-left">Quick Status</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {displayed.map((d) => {
                  const days = daysUntilExpiry(d.licenseExpiry);
                  return (
                    <tr key={d.id} className="tbody-row">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => canEditDrivers && openEdit(d)}
                          className={`text-slate-200 text-left font-semibold text-sm transition-colors ${canEditDrivers ? 'hover:text-amber-400 cursor-pointer' : 'cursor-default'}`}
                        >
                          {d.name}
                        </button>
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-400">{d.licenseNumber}</td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                          {d.licenseCategory}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <LicenseExpiryPill dateStr={d.licenseExpiry} />
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{d.phone}</td>
                      <td className="px-5 py-3 min-w-[120px]">
                        <SafetyScoreBar score={d.safetyScore} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      {canEditDrivers && (
                        <td className="px-5 py-3">
                          <QuickStatusControl
                            current={d.status}
                            onChange={(s) => handleStatusToggle(d, s)}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && canEditDrivers && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md glass-panel border-l border-white/5 overflow-y-auto p-6 space-y-4 animate-slide-in-right">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{editing ? 'Edit Driver' : 'Add Driver'}</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {[
                { label: 'Full Name *',      key: 'name',          required: true },
                { label: 'Phone *',          key: 'phone',         type: 'tel', required: true, pattern: '[0-9]{10}', maxLength: 10, title: 'Exactly 10 digits' },
                { label: 'Email',            key: 'email',         type: 'email' },
                { label: 'License Number *', key: 'licenseNumber', required: true, pattern: '^[A-Za-z0-9]{10,16}$', maxLength: 16, title: '10-16 alphanumeric characters', onChangeTransform: (v) => v.toUpperCase() },
                { label: 'License Expiry *', key: 'licenseExpiry', type: 'date', required: true, min: todayStr },
              ].map(({ label, key, type = 'text', required, pattern, maxLength, title, min, onChangeTransform }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
                  <input
                    type={type} required={required} pattern={pattern} maxLength={maxLength} title={title} min={min}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: onChangeTransform ? onChangeTransform(e.target.value) : e.target.value }))}
                    className={inputCls}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">License Category</label>
                <select value={form.licenseCategory} onChange={(e) => setForm((f) => ({ ...f, licenseCategory: e.target.value }))} className={inputCls}>
                  {LICENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {editing && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                    {DRIVER_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              )}

              {form.licenseExpiry && daysUntilExpiry(form.licenseExpiry) < 0 && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">License is expired — this driver cannot be assigned to trips.</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDrawerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm btn-amber disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { getVehicles, createVehicle, updateVehicle } from '../../api/vehicles';
import StatusBadge from '../../components/shared/StatusBadge';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import { usePermissions } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { cn } from '../../lib/utils';

const VEHICLE_TYPES  = ['VAN', 'TRUCK', 'BUS', 'CAR', 'BIKE'];
const FUEL_TYPES     = ['DIESEL', 'PETROL', 'CNG', 'ELECTRIC'];
const VEHICLE_STATUS = ['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'RETIRED'];

const TYPE_COLORS = {
  VAN:      'bg-blue-500/15 text-blue-400',
  TRUCK:    'bg-amber-500/15 text-amber-400',
  BUS:      'bg-emerald-500/15 text-emerald-400',
  CAR:      'bg-purple-500/15 text-purple-400',
  BIKE:     'bg-slate-500/15 text-slate-400',
};

const FUEL_COLORS = {
  DIESEL:   'text-slate-400',
  PETROL:   'text-blue-400',
  CNG:      'text-emerald-400',
  ELECTRIC: 'text-amber-400',
};

const EMPTY_FORM = {
  registrationNumber: '',
  make:               '',
  model:              '',
  year:               new Date().getFullYear(),
  type:               'VAN',
  fuelType:           'DIESEL',
  tankCapacity:       '',
  currentOdometer:    0,
  status:             'AVAILABLE',
  insuranceExpiry:    '',
  pucExpiry:          '',
};

export default function VehiclesPage() {
  const { canWrite } = usePermissions();
  const canEditFleet = canWrite('fleet');
  const { query } = useSearch();

  const [vehicles,   setVehicles]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filters,    setFilters]    = useState({ type: '', status: '' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type)   params.type   = filters.type;
      const res = await getVehicles(params);
      setVehicles(res.data.data ?? []);
    } catch {
      setError('Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.type]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDrawerOpen(true); };
  const openEdit   = (v) => {
    if (!canEditFleet) return;
    setEditing(v);
    setForm({
      registrationNumber: v.registrationNumber,
      make:               v.make,
      model:              v.model,
      year:               v.year,
      type:               v.type,
      fuelType:           v.fuelType,
      tankCapacity:       v.tankCapacity,
      currentOdometer:    v.currentOdometer,
      status:             v.status,
      insuranceExpiry:    v.insuranceExpiry ? v.insuranceExpiry.slice(0, 10) : '',
      pucExpiry:          v.pucExpiry       ? v.pucExpiry.slice(0, 10)       : '',
    });
    setDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        year:            Number(form.year),
        tankCapacity:    Number(form.tankCapacity),
        currentOdometer: Number(form.currentOdometer),
        insuranceExpiry: form.insuranceExpiry || undefined,
        pucExpiry:       form.pucExpiry       || undefined,
      };
      if (editing) {
        await updateVehicle(editing.id, payload);
        toast.success(`${form.registrationNumber} updated.`);
      } else {
        await createVehicle(payload);
        toast.success(`Vehicle ${form.registrationNumber} added to fleet.`);
      }
      setDrawerOpen(false);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  const q = query.toLowerCase();
  const displayed = vehicles.filter((v) =>
    !q ||
    v.registrationNumber.toLowerCase().includes(q) ||
    v.make.toLowerCase().includes(q) ||
    v.model.toLowerCase().includes(q)
  );

  const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all';
  const selectCls = 'px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40 cursor-pointer';

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Vehicle Registry"
        subtitle="Manage fleet vehicles and their status"
        action={canEditFleet ? (
          <button onClick={openCreate} className="flex items-center gap-2 btn-amber">
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        ) : null}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} className={selectCls}>
          <option value="">Type: All</option>
          {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className={selectCls}>
          <option value="">Status: All</option>
          {VEHICLE_STATUS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        {displayed.length > 0 && (
          <span className="text-[11px] text-[#666]">{displayed.length} vehicle{displayed.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <p className="text-xs text-amber-400/70">
        Retired / In Shop vehicles are excluded from trip dispatch
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState type="error" title="Could not load vehicles" message={error}
          action={<button onClick={fetchVehicles} className="text-sm text-amber-400 hover:underline">Retry</button>} />
      ) : displayed.length === 0 ? (
        <EmptyState title="No vehicles found" message={query || filters.type || filters.status ? 'Try clearing filters.' : 'Add a vehicle to get started.'} />
      ) : (
        <div className="devpulse-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="thead-row">
                  <th className="px-5 py-3 text-left">Reg. No.</th>
                  <th className="px-5 py-3 text-left">Make / Model</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Fuel</th>
                  <th className="px-5 py-3 text-right">Odometer</th>
                  <th className="px-5 py-3 text-left">Ins. Expiry</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {displayed.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => canEditFleet && openEdit(v)}
                    className={cn('tbody-row', canEditFleet && 'cursor-pointer')}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-200 font-semibold">{v.registrationNumber}</td>
                    <td className="px-5 py-3 text-slate-300">
                      {v.make} {v.model}
                      <span className="text-[#666] text-xs ml-1">({v.year})</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', TYPE_COLORS[v.type] ?? 'bg-slate-500/15 text-slate-400')}>
                        {v.type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('text-xs font-medium', FUEL_COLORS[v.fuelType] ?? 'text-slate-400')}>{v.fuelType}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-300 tabular-nums text-xs">
                      {v.currentOdometer?.toLocaleString('en-IN')} km
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(v.insuranceExpiry)}</td>
                    <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && canEditFleet && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md glass-panel border-l border-white/5 overflow-y-auto p-6 space-y-4 animate-slide-in-right">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{editing ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {[
                { label: 'Reg. Number *',     key: 'registrationNumber', required: true, pattern: '^[A-Za-z0-9- ]{4,15}$', title: '4–15 alphanumeric chars', onChangeTransform: (v) => v.toUpperCase() },
                { label: 'Make *',             key: 'make',               required: true },
                { label: 'Model *',            key: 'model',              required: true },
                { label: 'Year *',             key: 'year',               type: 'number', required: true, min: 1980, max: currentYear + 1 },
                { label: 'Tank Capacity (L) *',key: 'tankCapacity',       type: 'number', required: true, min: 0, step: 'any' },
                { label: 'Current Odometer',   key: 'currentOdometer',    type: 'number', min: 0 },
                { label: 'Insurance Expiry',   key: 'insuranceExpiry',    type: 'date', min: todayStr },
                { label: 'PUC Expiry',         key: 'pucExpiry',          type: 'date', min: todayStr },
              ].map(({ label, key, type = 'text', required, pattern, title, min, max, step, onChangeTransform }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
                  <input
                    type={type} required={required} pattern={pattern} title={title} min={min} max={max} step={step}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: onChangeTransform ? onChangeTransform(e.target.value) : e.target.value }))}
                    className={inputCls}
                  />
                </div>
              ))}

              {[
                { label: 'Vehicle Type', key: 'type',    options: VEHICLE_TYPES },
                { label: 'Fuel Type',   key: 'fuelType', options: FUEL_TYPES },
                { label: 'Status',      key: 'status',   options: VEHICLE_STATUS },
              ].map(({ label, key, options }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
                  <select value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className={inputCls}>
                    {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              ))}

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

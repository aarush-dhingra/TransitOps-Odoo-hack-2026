import { useEffect, useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { getVehicles, createVehicle, updateVehicle } from '../../api/vehicles';
import StatusBadge from '../../components/shared/StatusBadge';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';

const VEHICLE_TYPES  = ['VAN', 'TRUCK', 'BUS', 'CAR', 'BIKE'];
const FUEL_TYPES     = ['DIESEL', 'PETROL', 'CNG', 'ELECTRIC'];
const VEHICLE_STATUS = ['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'RETIRED'];

const EMPTY_FORM = {
  registrationNumber: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  type: 'VAN',
  fuelType: 'DIESEL',
  tankCapacity: '',
  currentOdometer: 0,
  status: 'AVAILABLE',
  insuranceExpiry: '',
  pucExpiry: '',
};

export default function VehiclesPage() {
  const [vehicles,  setVehicles]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [filters,   setFilters]   = useState({ type: '', status: '', search: '' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing,   setEditing]   = useState(null); // null = create, object = edit
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);

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

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (v) => {
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
        toast.success('Vehicle updated.');
      } else {
        await createVehicle(payload);
        toast.success('Vehicle added.');
      }
      setDrawerOpen(false);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  // Client-side reg-no search
  const displayed = vehicles.filter((v) =>
    !filters.search || v.registrationNumber.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vehicle Registry"
        subtitle="Manage fleet vehicles and their status"
        action={
          <button onClick={openCreate} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-md text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Type: All</option>
          {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Status: All</option>
          {VEHICLE_STATUS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>

        <input
          type="search"
          placeholder="Search reg. no…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Note */}
      <p className="text-xs text-amber-400/80">
        Rule: Registration No. must be unique · Retired/In Shop vehicles are hidden from Trip Dispatcher
      </p>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState type="error" title="Could not load vehicles" message={error}
          action={<button onClick={fetchVehicles} className="text-sm text-amber-400 hover:underline">Retry</button>} />
      ) : displayed.length === 0 ? (
        <EmptyState title="No vehicles found" message="Add a vehicle or clear filters." />
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Reg. No.</th>
                  <th className="px-5 py-3 text-left">Make / Model</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Fuel</th>
                  <th className="px-5 py-3 text-right">Odometer</th>
                  <th className="px-5 py-3 text-right">Acq. Cost</th>
                  <th className="px-5 py-3 text-left">Ins. Expiry</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {displayed.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => openEdit(v)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-200">{v.registrationNumber}</td>
                    <td className="px-5 py-3 text-slate-300">{v.make} {v.model} <span className="text-slate-500">({v.year})</span></td>
                    <td className="px-5 py-3 text-slate-400">{v.type}</td>
                    <td className="px-5 py-3 text-slate-400">{v.fuelType}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{v.currentOdometer?.toLocaleString('en-IN')} km</td>
                    <td className="px-5 py-3 text-right text-slate-500 text-xs">—</td>
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
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{editing ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {[
                { label: 'Registration Number', key: 'registrationNumber', required: true },
                { label: 'Make',                key: 'make',               required: true },
                { label: 'Model',               key: 'model',              required: true },
                { label: 'Year',                key: 'year',               type: 'number', required: true },
                { label: 'Tank Capacity (L)',   key: 'tankCapacity',       type: 'number', required: true },
                { label: 'Current Odometer',    key: 'currentOdometer',    type: 'number' },
                { label: 'Insurance Expiry',    key: 'insuranceExpiry',    type: 'date' },
                { label: 'PUC Expiry',          key: 'pucExpiry',          type: 'date' },
              ].map(({ label, key, type = 'text', required }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                  <select
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDrawerOpen(false)}
                  className="flex-1 py-2 rounded-md text-sm border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-md text-sm bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold disabled:opacity-50 transition-colors">
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

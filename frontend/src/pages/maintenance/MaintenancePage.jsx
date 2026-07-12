import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { getMaintenanceLogs, createMaintenanceLog, updateMaintenanceLog } from '../../api/maintenance';
import { getVehicles } from '../../api/vehicles';
import StatusBadge from '../../components/shared/StatusBadge';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { usePermissions } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { cn } from '../../lib/utils';

const MAINTENANCE_TYPES  = ['OIL_CHANGE', 'TYRE_ROTATION', 'FULL_SERVICE', 'BRAKE_SERVICE', 'ENGINE_CHECK', 'OTHER'];
const MAINTENANCE_STATUS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];

const TYPE_LABELS = {
  OIL_CHANGE:    'Oil Change',
  TYRE_ROTATION: 'Tyre Rotation',
  FULL_SERVICE:  'Full Service',
  BRAKE_SERVICE: 'Brake Service',
  ENGINE_CHECK:  'Engine Check',
  OTHER:         'Other',
};

const TYPE_COLORS = {
  OIL_CHANGE:    'bg-amber-500/15 text-amber-400',
  TYRE_ROTATION: 'bg-blue-500/15 text-blue-400',
  FULL_SERVICE:  'bg-purple-500/15 text-purple-400',
  BRAKE_SERVICE: 'bg-red-500/15 text-red-400',
  ENGINE_CHECK:  'bg-emerald-500/15 text-emerald-400',
  OTHER:         'bg-slate-500/15 text-slate-400',
};

const EMPTY_FORM = {
  vehicleId:         '',
  type:              'OIL_CHANGE',
  description:       '',
  date:              new Date().toISOString().slice(0, 10),
  cost:              '',
  odometerAtService: '',
  vendorName:        '',
  vendorContact:     '',
  status:            'SCHEDULED',
};

export default function MaintenancePage() {
  const { canWrite } = usePermissions();
  const canEditMaintenance = canWrite('maintenance');
  const { query } = useSearch();

  const [logs,      setLogs]      = useState([]);
  const [vehicles,  setVehicles]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [logRes, vRes] = await Promise.all([getMaintenanceLogs(), getVehicles()]);
      setLogs(logRes.data.data ?? []);
      setVehicles(vRes.data.data ?? []);
    } catch {
      setError('Failed to load maintenance records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const loadEdit = (log) => {
    if (!canEditMaintenance) return;
    setEditingId(log.id);
    setForm({
      vehicleId:         log.vehicleId,
      type:              log.type,
      description:       log.description ?? '',
      date:              log.date?.slice(0, 10) ?? '',
      cost:              log.cost ?? '',
      odometerAtService: log.odometerAtService ?? '',
      vendorName:        log.vendorName ?? '',
      vendorContact:     log.vendorContact ?? '',
      status:            log.status,
    });
    setDrawerOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        cost:              form.cost              ? parseFloat(form.cost)              : undefined,
        odometerAtService: form.odometerAtService ? parseFloat(form.odometerAtService) : undefined,
        date:              new Date(form.date).toISOString(),
      };
      const vReg = vehicles.find(v => v.id === form.vehicleId)?.registrationNumber ?? 'vehicle';
      if (editingId) {
        await updateMaintenanceLog(editingId, payload);
        toast.success(`${vReg} service record updated.`);
      } else {
        await createMaintenanceLog(payload);
        toast.success(`Service record logged for ${vReg}.`);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setDrawerOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  const vehicleName = (id) => vehicles.find((v) => v.id === id)?.registrationNumber ?? '—';

  const q = query.toLowerCase();
  const displayed = logs.filter(l =>
    !q ||
    vehicleName(l.vehicleId).toLowerCase().includes(q) ||
    (l.type ?? '').toLowerCase().includes(q) ||
    (l.vendorName ?? '').toLowerCase().includes(q)
  );

  const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all';

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Maintenance"
        subtitle="Log and track service records for all vehicles"
        action={canEditMaintenance ? (
          <button onClick={openCreate} className="flex items-center gap-2 btn-amber">
            <Plus className="w-4 h-4" /> Log Service
          </button>
        ) : null}
      />

      <p className="text-xs text-amber-400/70">
        Creating a maintenance record automatically sets vehicle status to In Shop
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState type="error" title="Could not load records" message={error}
          action={<button onClick={fetchAll} className="text-sm text-amber-400 hover:underline">Retry</button>} />
      ) : displayed.length === 0 ? (
        <EmptyState title="No service records" message={query ? 'No results match your search.' : 'Log a maintenance record to see it here.'} />
      ) : (
        <div className="devpulse-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="thead-row">
                  <th className="px-5 py-3 text-left">Vehicle</th>
                  <th className="px-5 py-3 text-left">Service</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-right">Cost</th>
                  <th className="px-5 py-3 text-left">Vendor</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {displayed.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => canEditMaintenance && loadEdit(log)}
                    className={cn('tbody-row', canEditMaintenance && 'cursor-pointer')}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-200 font-semibold">{vehicleName(log.vehicleId)}</td>
                    <td className="px-5 py-3">
                      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', TYPE_COLORS[log.type] ?? 'bg-slate-500/15 text-slate-400')}>
                        {TYPE_LABELS[log.type] ?? log.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(log.date)}</td>
                    <td className="px-5 py-3 text-right text-slate-300 tabular-nums text-xs">
                      {log.cost ? formatCurrency(log.cost) : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{log.vendorName ?? '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && canEditMaintenance && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setDrawerOpen(false); setEditingId(null); setForm(EMPTY_FORM); }} />
          <div className="relative w-full max-w-md glass-panel border-l border-white/5 overflow-y-auto p-6 space-y-4 animate-slide-in-right">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{editingId ? 'Edit Record' : 'Log Service'}</h2>
              <button onClick={() => { setDrawerOpen(false); setEditingId(null); setForm(EMPTY_FORM); }} className="text-slate-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Vehicle *</label>
                <select required value={form.vehicleId} onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))} className={inputCls}>
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Service Type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputCls}>
                  {MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>

              {[
                { label: 'Date *',               key: 'date',              type: 'date', required: true },
                { label: 'Cost (₹)',              key: 'cost',              type: 'number', min: 0, step: 'any' },
                { label: 'Odometer at Service',  key: 'odometerAtService', type: 'number', min: 0 },
                { label: 'Vendor Name',          key: 'vendorName' },
                { label: 'Vendor Contact',       key: 'vendorContact' },
              ].map(({ label, key, type = 'text', required, min, step }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
                  <input type={type} required={required} min={min} step={step} value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={inputCls} />
                </div>
              ))}

              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                  {MAINTENANCE_STATUS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Description</label>
                <textarea rows={2} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={cn(inputCls, 'resize-none')} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setDrawerOpen(false); setEditingId(null); setForm(EMPTY_FORM); }}
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

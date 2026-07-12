import { useEffect, useState, useCallback } from 'react';
import { getMaintenanceLogs, createMaintenanceLog, updateMaintenanceLog } from '../../api/maintenance';
import { getVehicles } from '../../api/vehicles';
import StatusBadge from '../../components/shared/StatusBadge';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { usePermissions } from '../../hooks/useAuth';

const MAINTENANCE_TYPES  = ['OIL_CHANGE', 'TYRE_ROTATION', 'FULL_SERVICE', 'BRAKE_SERVICE', 'ENGINE_CHECK', 'OTHER'];
const MAINTENANCE_STATUS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];

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
  const [logs,      setLogs]      = useState([]);
  const [vehicles,  setVehicles]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [logRes, vRes] = await Promise.all([
        getMaintenanceLogs(),
        getVehicles(),
      ]);
      setLogs(logRes.data.data     ?? []);
      setVehicles(vRes.data.data   ?? []);
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
      if (editingId) {
        await updateMaintenanceLog(editingId, payload);
        toast.success('Record updated.');
      } else {
        await createMaintenanceLog(payload);
        toast.success('Service record logged.');
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  const vehicleName = (id) => {
    const v = vehicles.find((v) => v.id === id);
    return v ? v.registrationNumber : id;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Maintenance" subtitle="Log and track service records for all vehicles" />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Log Service Record form */}
        {canEditMaintenance && (
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-white mb-4">
              {editingId ? 'Edit Service Record' : 'Log Service Record'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Vehicle */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Vehicle</label>
                <select
                  required
                  value={form.vehicleId}
                  onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registrationNumber}</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Service Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              {[
                { label: 'Cost (₹)',              key: 'cost',              type: 'number', min: 0, step: 'any' },
                { label: 'Date',                  key: 'date',              type: 'date', required: true },
                { label: 'Odometer at Service',   key: 'odometerAtService', type: 'number', min: 0 },
                { label: 'Vendor Name',           key: 'vendorName' },
                { label: 'Vendor Contact',        key: 'vendorContact' },
              ].map(({ label, key, type = 'text', required, min, step }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
                  <input
                    type={type}
                    required={required}
                    min={min}
                    step={step}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {MAINTENANCE_STATUS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-md text-sm transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}
                  className="w-full py-2 border border-slate-700 text-slate-400 hover:bg-slate-800 rounded-md text-sm transition-colors">
                  Clear
                </button>
              )}
            </form>

            {/* Status flow diagram */}
            <div className="mt-5 pt-5 border-t border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400">Available</span>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <span className="text-slate-400 flex-1">During active record</span>
                <span className="text-amber-400">In Shop</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-400">In Shop</span>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <span className="text-slate-400 flex-1">Once record released</span>
                <span className="text-emerald-400">Available</span>
              </div>
              <p className="text-xs text-amber-400/80 mt-2">
                Note: In Shop vehicles are removed from the dispatch pool.
              </p>
            </div>
          </div>
        </div>
        )}

        {/* Service Log table */}
        <div className={canEditMaintenance ? 'xl:col-span-3' : 'xl:col-span-5'}>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <EmptyState type="error" title="Could not load records" message={error}
              action={<button onClick={fetchAll} className="text-sm text-amber-400 hover:underline">Retry</button>} />
          ) : logs.length === 0 ? (
            <EmptyState title="No service records" message="Log a maintenance record to see it here." />
          ) : (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-white">Service Log</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left">Vehicle</th>
                      <th className="px-5 py-3 text-left">Service</th>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-right">Cost</th>
                      <th className="px-5 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => canEditMaintenance && loadEdit(log)}
                        className={`hover:bg-slate-800/50 transition-colors ${canEditMaintenance ? 'cursor-pointer' : ''}`}
                      >
                        <td className="px-5 py-3 font-mono text-xs text-slate-300">{vehicleName(log.vehicleId)}</td>
                        <td className="px-5 py-3 text-slate-300">{log.type.replace(/_/g, ' ')}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(log.date)}</td>
                        <td className="px-5 py-3 text-right text-slate-300">{log.cost ? formatCurrency(log.cost) : '—'}</td>
                        <td className="px-5 py-3"><StatusBadge status={log.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

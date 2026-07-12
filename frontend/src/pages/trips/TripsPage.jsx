import { useEffect, useState, useCallback } from 'react';
import { Plus, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { getTrips, createTrip, dispatchTrip, completeTrip, cancelTrip } from '../../api/trips';
import { getVehicles } from '../../api/vehicles';
import { getDrivers } from '../../api/drivers';
import StatusBadge from '../../components/shared/StatusBadge';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import { usePermissions } from '../../hooks/useAuth';

const LIFECYCLE = ['PENDING', 'DISPATCHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

const EMPTY_FORM = {
  originAddress:      '',
  originLat:          '',
  originLng:          '',
  destinationAddress: '',
  destinationLat:     '',
  destinationLng:     '',
  vehicleId:          '',
  driverId:           '',
  plannedDeparture:   '',
  cargoWeight:        '',
  distanceKm:         '',
  notes:              '',
};

export default function TripsPage() {
  const { canWrite } = usePermissions();
  const canEditTrips = canWrite('trips');
  const [trips,      setTrips]      = useState([]);
  const [vehicles,   setVehicles]   = useState([]);
  const [drivers,    setDrivers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [statusFilter, setFilter]  = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  
  // Format current datetime for datetime-local min attribute
  const now = new Date();
  const todayDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  // Capacity validation
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId);
  const cargo           = parseFloat(form.cargoWeight) || 0;
  const capacity        = selectedVehicle?.tankCapacity || null; // use actual capacity field when backend adds it
  const capacityExceeded = false; // placeholder — update when backend returns capacity in kg

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const [tripRes, vRes, dRes] = await Promise.all([
        getTrips(params),
        getVehicles({ status: 'AVAILABLE' }),
        getDrivers({ status: 'AVAILABLE' }),
      ]);
      setTrips(tripRes.data.data   ?? []);
      setVehicles(vRes.data.data   ?? []);
      setDrivers(dRes.data.data    ?? []);
    } catch {
      setError('Failed to load trips.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        originAddress:      form.originAddress,
        originLat:          parseFloat(form.originLat)  || 0,
        originLng:          parseFloat(form.originLng)  || 0,
        destinationAddress: form.destinationAddress,
        destinationLat:     parseFloat(form.destinationLat) || 0,
        destinationLng:     parseFloat(form.destinationLng) || 0,
        vehicleId:          form.vehicleId,
        driverId:           form.driverId,
        plannedDeparture:   new Date(form.plannedDeparture).toISOString(),
        distanceKm:         parseFloat(form.distanceKm) || undefined,
        notes:              form.notes || undefined,
      };
      await createTrip(payload);
      toast.success('Trip created.');
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to create trip.');
    } finally {
      setSaving(false);
    }
  };

  const handleDispatch = async (id) => {
    try {
      await dispatchTrip(id);
      toast.success('Trip dispatched.');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to dispatch.');
    }
  };

  const handleComplete = async (id) => {
    const endOdometer = prompt('Enter end odometer reading (km):');
    if (endOdometer === null) return;
    try {
      await completeTrip(id, { endOdometer: parseFloat(endOdometer) });
      toast.success('Trip completed.');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to complete trip.');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this trip?')) return;
    try {
      await cancelTrip(id);
      toast.success('Trip cancelled.');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to cancel trip.');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trip Dispatcher"
        subtitle="Create and manage trips across the fleet"
        action={canEditTrips ? (
          <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-md text-sm transition-colors">
            <Plus className="w-4 h-4" /> New Trip
          </button>
        ) : null}
      />

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {['', 'PENDING', 'DISPATCHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Live board */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <EmptyState type="error" title="Could not load trips" message={error}
              action={<button onClick={fetchAll} className="text-sm text-amber-400 hover:underline">Retry</button>} />
          ) : trips.length === 0 ? (
            <EmptyState title="No trips found" message="Create a new trip to get started." />
          ) : (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-white">Live Board</h2>
              </div>
              <div className="divide-y divide-slate-800">
                {trips.map((t) => (
                  <div key={t.id} className="px-5 py-4 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-500">{t.tripNumber}</span>
                          <StatusBadge status={t.status} />
                        </div>
                        <p className="text-sm text-slate-200 flex items-center gap-1.5">
                          {t.originAddress}
                          <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                          {t.destinationAddress}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t.vehicle?.registrationNumber ?? 'Unassigned'} / {t.driver?.name ?? 'No driver'}
                          {t.distanceKm && ` · ${t.distanceKm} km`}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">{formatDateTime(t.plannedDeparture)}</p>
                      </div>

                      {canEditTrips && (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {t.status === 'PENDING' && (
                            <button onClick={() => handleDispatch(t.id)}
                              className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-medium hover:bg-blue-500/30 transition-colors">
                              Dispatch
                            </button>
                          )}
                          {(t.status === 'DISPATCHED' || t.status === 'ACTIVE') && (
                            <button onClick={() => handleComplete(t.id)}
                              className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-medium hover:bg-emerald-500/30 transition-colors">
                              Complete
                            </button>
                          )}
                          {(t.status === 'PENDING' || t.status === 'DISPATCHED') && (
                            <button onClick={() => handleCancel(t.id)}
                              className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-medium hover:bg-red-500/30 transition-colors">
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lifecycle info */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 h-fit">
          <h2 className="text-sm font-semibold text-white mb-4">Trip Lifecycle</h2>
          <div className="flex flex-col gap-2">
            {LIFECYCLE.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  s === 'COMPLETED' ? 'bg-emerald-400' :
                  s === 'CANCELLED' ? 'bg-red-400' :
                  s === 'ACTIVE'    ? 'bg-blue-400' :
                  s === 'DISPATCHED'? 'bg-blue-400' :
                  'bg-slate-500'
                }`} />
                <span className="text-xs text-slate-400">{s.charAt(0) + s.slice(1).toLowerCase()}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-4 leading-relaxed">
            On Complete: odometer → fuel log → expenses → Vehicle & Driver available
          </p>
        </div>
      </div>

      {/* Create Trip Drawer */}
      {drawerOpen && canEditTrips && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Create Trip</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { label: 'Source / Origin',          key: 'originAddress',      required: true },
                { label: 'Origin Lat',               key: 'originLat',          type: 'number', step: 'any' },
                { label: 'Origin Lng',               key: 'originLng',          type: 'number', step: 'any' },
                { label: 'Destination',              key: 'destinationAddress', required: true },
                { label: 'Destination Lat',          key: 'destinationLat',     type: 'number', step: 'any' },
                { label: 'Destination Lng',          key: 'destinationLng',     type: 'number', step: 'any' },
                { label: 'Planned Distance (km)',    key: 'distanceKm',         type: 'number', min: 0, step: 'any' },
                { label: 'Planned Departure',        key: 'plannedDeparture',   type: 'datetime-local', required: true, min: todayDateTime },
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

              {/* Vehicle */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Vehicle (Available Only)</label>
                <select
                  required
                  value={form.vehicleId}
                  onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registrationNumber} – {v.make} {v.model}</option>
                  ))}
                </select>
              </div>

              {/* Driver */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Driver (Available Only)</label>
                <select
                  required
                  value={form.driverId}
                  onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select driver…</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.licenseCategory})</option>
                  ))}
                </select>
              </div>

              {/* Cargo weight */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Cargo Weight (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.cargoWeight}
                  onChange={(e) => setForm((f) => ({ ...f, cargoWeight: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              {capacityExceeded && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">Capacity exceeded — dispatch blocked</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDrawerOpen(false)}
                  className="flex-1 py-2 rounded-md text-sm border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving || capacityExceeded}
                  className="flex-1 py-2 rounded-md text-sm bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {saving ? 'Creating…' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

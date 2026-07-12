import { useEffect, useState, useCallback } from 'react';
import {
  getMyTrips,
  startTrip,
  completeTrip,
  submitFuelLog,
  submitExpense,
  updateTripLocation,
} from '../../api/portal';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import OdometerModal from '../../components/shared/OdometerModal';
import { formatDateTime, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { ArrowRight, Truck, MapPin, Clock, Fuel, Receipt, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

const EXPENSE_CATEGORIES = ['TOLL', 'PARKING', 'DRIVER_ALLOWANCE', 'LOADING', 'OTHER'];

function TripCard({ trip, onStart, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  const [fuelForm, setFuelForm] = useState(null);
  const [expForm,  setExpForm]  = useState(null);
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await submitFuelLog({
        vehicleId:      trip.vehicleId,
        tripId:         trip.id,
        date:           new Date(fuelForm.date).toISOString(),
        litres:         parseFloat(fuelForm.litres),
        pricePerLitre:  parseFloat(fuelForm.pricePerLitre),
        odometerAtFill: parseFloat(fuelForm.odometer),
        location:       fuelForm.location || undefined,
      });
      toast.success('Fuel log submitted.');
      setFuelForm(null);
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to submit fuel log.');
    } finally {
      setSaving(false);
    }
  };

  const handleExpSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await submitExpense({
        vehicleId:   trip.vehicleId,
        tripId:      trip.id,
        category:    expForm.category,
        amount:      parseFloat(expForm.amount),
        date:        new Date(expForm.date).toISOString(),
        description: expForm.description || undefined,
      });
      toast.success('Expense submitted.');
      setExpForm(null);
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to submit expense.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all placeholder:text-slate-600';

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      {/* Trip header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-[#888]">{trip.tripNumber}</span>
            <StatusBadge status={trip.status} />
            {trip.status === 'ACTIVE' && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                En Route
              </span>
            )}
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-300 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Route */}
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-200">
            <p className="font-medium">{trip.originAddress?.split(',').slice(0, 2).join(', ')}</p>
            <ArrowRight className="w-3 h-3 text-slate-600 my-0.5 ml-0.5" />
            <p className="font-medium">{trip.destinationAddress?.split(',').slice(0, 2).join(', ')}</p>
          </div>
        </div>

        {/* Vehicle info */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
          <span className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
            {trip.vehicle?.registrationNumber ?? '—'} · {trip.vehicle?.make} {trip.vehicle?.model}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDateTime(trip.plannedDeparture)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {trip.status === 'DISPATCHED' && (
            <button
              onClick={() => onStart(trip)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white transition-all shadow-[0_4px_12px_rgba(59,130,246,0.25)] min-w-[100px]"
            >
              Start Trip
            </button>
          )}
          {trip.status === 'ACTIVE' && (
            <button
              onClick={() => onComplete(trip)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition-all shadow-[0_4px_12px_rgba(16,185,129,0.25)] min-w-[100px]"
            >
              Complete Trip
            </button>
          )}
          {(trip.status === 'ACTIVE' || trip.status === 'DISPATCHED') && (
            <>
              <button
                onClick={() => { setFuelForm({ date: todayStr, litres: '', pricePerLitre: '', odometer: '', location: '' }); setExpanded(true); }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors"
              >
                <Fuel className="w-3.5 h-3.5" /> Fuel
              </button>
              <button
                onClick={() => { setExpForm({ category: 'TOLL', amount: '', date: todayStr, description: '' }); setExpanded(true); }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" /> Expense
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expandable section */}
      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4 bg-black/20">
          {/* Trip details */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Distance', value: trip.distanceKm ? `${trip.distanceKm} km` : '—' },
              { label: 'Cargo', value: trip.cargoWeight ? `${trip.cargoWeight} kg` : '—' },
              { label: 'Start Odometer', value: trip.startOdometer ? `${trip.startOdometer.toLocaleString()} km` : '—' },
              { label: 'Notes', value: trip.notes ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#666]">{label}</p>
                <p className="text-sm text-slate-300 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Fuel log form */}
          {fuelForm && (
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                  <Fuel className="w-4 h-4" /> Log Fuel
                </h3>
                <button onClick={() => setFuelForm(null)} className="text-slate-500 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleFuelSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Date *</label>
                    <input type="date" required max={todayStr} value={fuelForm.date}
                      onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Litres *</label>
                    <input type="number" required min="0" step="any" value={fuelForm.litres}
                      onChange={(e) => setFuelForm((f) => ({ ...f, litres: e.target.value }))} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Price/L (₹) *</label>
                    <input type="number" required min="0" step="any" value={fuelForm.pricePerLitre}
                      onChange={(e) => setFuelForm((f) => ({ ...f, pricePerLitre: e.target.value }))} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Odometer *</label>
                    <input type="number" required min="0" step="any" value={fuelForm.odometer}
                      onChange={(e) => setFuelForm((f) => ({ ...f, odometer: e.target.value }))} className={inputCls} placeholder="km" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Location</label>
                  <input type="text" value={fuelForm.location}
                    onChange={(e) => setFuelForm((f) => ({ ...f, location: e.target.value }))} className={inputCls} placeholder="Petrol station name" />
                </div>
                {fuelForm.litres && fuelForm.pricePerLitre && (
                  <p className="text-xs text-amber-400 font-semibold">
                    Total: {formatCurrency(parseFloat(fuelForm.litres) * parseFloat(fuelForm.pricePerLitre))}
                  </p>
                )}
                <button type="submit" disabled={saving}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-900 transition-all disabled:opacity-50">
                  {saving ? 'Submitting…' : 'Submit Fuel Log'}
                </button>
              </form>
            </div>
          )}

          {/* Expense form */}
          {expForm && (
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4" /> Log Expense
                </h3>
                <button onClick={() => setExpForm(null)} className="text-slate-500 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleExpSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Category</label>
                    <select value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                      {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Amount (₹) *</label>
                    <input type="number" required min="0" step="any" value={expForm.amount}
                      onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Date *</label>
                    <input type="date" required max={todayStr} value={expForm.date}
                      onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Description</label>
                    <input type="text" value={expForm.description}
                      onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Optional" />
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white transition-all disabled:opacity-50">
                  {saving ? 'Submitting…' : 'Submit Expense'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DriverPortalPage() {
  const [trips,   setTrips]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [odometerTarget, setOdometerTarget] = useState(null);
  const [activeFilter, setActiveFilter] = useState('active'); // 'active' | 'all'

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyTrips();
      setTrips(res.data.data ?? []);
    } catch {
      setError('Failed to load your trips.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  useEffect(() => {
    const activeTrip = trips.find((trip) => trip.status === 'ACTIVE');
    if (!activeTrip || !navigator.geolocation) return undefined;

    let lastSentAt = 0;
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (Date.now() - lastSentAt < 15000) return;
        lastSentAt = Date.now();
        updateTripLocation(activeTrip.id, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [trips]);

  const handleStart = async (trip) => {
    try {
      await startTrip(trip.id);
      toast.success(`Trip ${trip.tripNumber} started. Safe driving!`);
      fetchTrips();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to start trip.');
    }
  };

  const handleComplete = (trip) => {
    setOdometerTarget({ id: trip.id, tripNumber: trip.tripNumber, startOdometer: trip.startOdometer });
  };

  const handleCompleteConfirm = async (endOdometer) => {
    if (!odometerTarget) return;
    try {
      await completeTrip(odometerTarget.id, { endOdometer });
      toast.success(`Trip ${odometerTarget.tripNumber} completed. Well done!`);
      fetchTrips();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to complete trip.');
    } finally {
      setOdometerTarget(null);
    }
  };

  const filtered = trips.filter(t =>
    activeFilter === 'all'
      ? true
      : ['DISPATCHED', 'ACTIVE'].includes(t.status)
  );

  const activeCount = trips.filter(t => ['DISPATCHED', 'ACTIVE'].includes(t.status)).length;

  if (loading) return <LoadingSpinner message="Loading your trips…" />;
  if (error)   return (
    <EmptyState type="error" title="Could not load trips" message={error}
      action={<button onClick={fetchTrips} className="btn-amber">Retry</button>} />
  );

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">My Trips</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {activeCount > 0
            ? `${activeCount} active trip${activeCount !== 1 ? 's' : ''} assigned to you`
            : 'No active trips right now'}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Active', count: activeCount },
          { key: 'all',    label: 'All Trips', count: trips.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              activeFilter === key
                ? 'bg-amber-500 text-slate-900 shadow-[0_2px_8px_rgba(245,158,11,0.35)]'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            )}
          >
            {label}
            <span className={cn(
              'ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              activeFilter === key ? 'bg-slate-900/30 text-slate-900' : 'bg-white/10 text-slate-500'
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={activeFilter === 'active' ? 'No active trips' : 'No trips yet'}
          message={activeFilter === 'active' ? 'You have no trips currently dispatched or active.' : 'Your trip history will appear here.'}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onStart={handleStart}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      <OdometerModal
        open={!!odometerTarget}
        onOpenChange={(open) => !open && setOdometerTarget(null)}
        tripNumber={odometerTarget?.tripNumber}
        startOdometer={odometerTarget?.startOdometer}
        onConfirm={handleCompleteConfirm}
      />
    </div>
  );
}

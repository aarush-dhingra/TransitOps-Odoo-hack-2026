import { useEffect, useState, useCallback } from 'react';
import { Plus, X, AlertTriangle, ArrowRight, Clock, Truck, User, Sparkles, FileDown } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import {
  getTrips, getTrip, createTrip, updateTrip, dispatchTrip, startTrip, completeTrip, cancelTrip,
  getDispatchRecommendations, getTripSummary, downloadTripSummaryPdf,
} from '../../api/trips';
import { getVehicles } from '../../api/vehicles';
import { getDrivers } from '../../api/drivers';
import StatusBadge from '../../components/shared/StatusBadge';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import OdometerModal from '../../components/shared/OdometerModal';
import AddressAutocomplete from '../../components/shared/AddressAutocomplete';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import { usePermissions } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';
import { cn } from '../../lib/utils';
import { getRoute, getNearbyPlaces } from '../../api/locations';

const LIFECYCLE = ['DRAFT', 'DISPATCHED', 'ACTIVE', 'COMPLETED'];
const LIFECYCLE_LABELS = { DRAFT: 'Draft', DISPATCHED: 'Assigned', ACTIVE: 'En Route', COMPLETED: 'Completed' };

const EMPTY_FORM = {
  originAddress:      '',
  originLat:          '',
  originLng:          '',
  destinationAddress: '',
  destinationLat:     '',
  destinationLng:     '',
  vehicleId:          '',
  driverId:           '',
  departureDate:      '',
  departureTime:      '09:00',
  cargoWeight:        '',
  distanceKm:         '',
  notes:              '',
};

function TripStepper({ status }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-1 mt-2">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        <span className="text-[11px] text-red-400 font-medium">Cancelled</span>
      </div>
    );
  }

  const currentIdx = LIFECYCLE.indexOf(status);

  // COMPLETED → all dots green; otherwise amber pulse on current step
  const isCompleted = status === 'COMPLETED';

  return (
    <div className="flex items-center gap-0.5 mt-2">
      {LIFECYCLE.map((step, i) => {
        const done    = isCompleted ? true : i < currentIdx;
        const current = !isCompleted && i === currentIdx;
        return (
          <div key={step} className="flex items-center">
            <div
              title={LIFECYCLE_LABELS[step]}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                current ? 'bg-amber-400 ring-2 ring-amber-400/30 scale-125' :
                done    ? 'bg-emerald-500' :
                'bg-slate-700'
              )}
            />
            {i < LIFECYCLE.length - 1 && (
              <div className={cn('w-4 h-px mx-0.5 transition-colors', done ? 'bg-emerald-500/60' : 'bg-slate-700')} />
            )}
          </div>
        );
      })}
      <span className={cn('ml-1.5 text-[10px]', isCompleted ? 'text-emerald-500' : 'text-slate-500')}>
        {LIFECYCLE_LABELS[status] ?? status}
      </span>
    </div>
  );
}

export default function TripsPage() {
  const { canWrite } = usePermissions();
  const canEditTrips = canWrite('trips');
  const { query } = useSearch();

  const [trips,      setTrips]      = useState([]);
  const [vehicles,   setVehicles]   = useState([]);
  const [drivers,    setDrivers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [statusFilter, setFilter]   = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [insightTrip, setInsightTrip] = useState(null);
  const [insightType, setInsightType] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [distanceManuallyEdited, setDistanceManuallyEdited] = useState(false);
  const [routeCalculating, setRouteCalculating] = useState(false);
  const [trackingTrip, setTrackingTrip] = useState(null);
  const [trackingRoute, setTrackingRoute] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Modals
  const [odometerTarget, setOdometerTarget] = useState(null);
  const [cancelTarget,   setCancelTarget]   = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const selectedVehicle  = vehicles.find((v) => v.id === form.vehicleId);
  const cargo            = parseFloat(form.cargoWeight) || 0;
  const capacity         = selectedVehicle?.maximumLoadCapacity ?? null;
  const capacityExceeded = capacity !== null && cargo > capacity;
  const capacityOverBy   = capacityExceeded ? cargo - capacity : 0;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      // Only fetch vehicles/drivers for roles that can write trips (and therefore dispatch)
      const [tripRes, vRes, dRes] = await Promise.all([
        getTrips({ limit: 100, ...params }),
        canEditTrips ? getVehicles({ status: 'AVAILABLE' }) : Promise.resolve({ data: { data: [] } }),
        canEditTrips ? getDrivers({ status: 'AVAILABLE' })  : Promise.resolve({ data: { data: [] } }),
      ]);
      setTrips(tripRes.data.data ?? []);
      setVehicles(vRes.data.data ?? []);
      setDrivers(dRes.data.data ?? []);
    } catch {
      setError('Failed to load trips.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, canEditTrips]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const calculateDistance = useCallback(async (force = false) => {
    if (!form.originLat || !form.originLng || !form.destinationLat || !form.destinationLng) return;
    if (distanceManuallyEdited && !force) return;
    setRouteCalculating(true);
    try {
      const response = await getRoute({
        originLat: form.originLat,
        originLng: form.originLng,
        destinationLat: form.destinationLat,
        destinationLng: form.destinationLng,
      });
      setForm((current) => ({ ...current, distanceKm: response.data.data.distanceKm }));
      if (force) setDistanceManuallyEdited(false);
    } catch {
      toast.error('Could not calculate road distance. You can enter it manually.');
    } finally {
      setRouteCalculating(false);
    }
  }, [
    form.originLat,
    form.originLng,
    form.destinationLat,
    form.destinationLng,
    distanceManuallyEdited,
  ]);

  useEffect(() => {
    calculateDistance();
  }, [calculateDistance]);

  const openLiveMap = async (trip) => {
    setTrackingTrip(trip);
    setTrackingLoading(true);
    try {
      const routeResponse = await getRoute({
        originLat: trip.originLat,
        originLng: trip.originLng,
        destinationLat: trip.destinationLat,
        destinationLng: trip.destinationLng,
      });
      const currentLat = trip.currentLat ?? trip.originLat;
      const currentLng = trip.currentLng ?? trip.originLng;
      const placesResponse = await getNearbyPlaces({ lat: currentLat, lng: currentLng });
      setTrackingRoute(routeResponse.data.data.coordinates ?? []);
      setNearbyPlaces(placesResponse.data.data ?? []);
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to load live route.');
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    if (!trackingTrip || trackingTrip.status !== 'ACTIVE') return undefined;
    const timer = setInterval(async () => {
      try {
        const response = await getTrip(trackingTrip.id);
        setTrackingTrip(response.data.data);
      } catch {
        // Keep the last known position visible during transient refresh failures.
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [trackingTrip]);

  useEffect(() => {
    if (!trackingTrip?.currentLat || !trackingTrip?.currentLng) return;
    getNearbyPlaces({ lat: trackingTrip.currentLat, lng: trackingTrip.currentLng })
      .then((response) => setNearbyPlaces(response.data.data ?? []))
      .catch(() => {});
  }, [trackingTrip?.currentLat, trackingTrip?.currentLng]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.originLat || !form.destinationLat) {
      toast.error('Select a valid source and destination from the suggestions.');
      return;
    }
    if (!form.departureDate || !form.departureTime) {
      toast.error('Please set a planned departure date and time.');
      return;
    }
    setSaving(true);
    try {
      const plannedDeparture = new Date(`${form.departureDate}T${form.departureTime}:00`).toISOString();
      const payload = {
        originAddress:      form.originAddress,
        originLat:          Number(form.originLat),
        originLng:          Number(form.originLng),
        destinationAddress: form.destinationAddress,
        destinationLat:     Number(form.destinationLat),
        destinationLng:     Number(form.destinationLng),
        vehicleId:          form.vehicleId || undefined,
        driverId:           form.driverId  || undefined,
        plannedDeparture,
        cargoWeight:        form.cargoWeight ? Number(form.cargoWeight) : undefined,
        distanceKm:         form.distanceKm  ? Number(form.distanceKm)  : undefined,
        notes:              form.notes       || undefined,
      };
      await createTrip(payload);
      const label = [
        form.vehicleId ? '' : 'No vehicle yet',
        form.driverId  ? '' : 'No driver yet',
      ].filter(Boolean).join(', ');
      toast.success(`Trip created as Draft.${label ? ` (${label})` : ''}`);
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      setDistanceManuallyEdited(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to create trip.');
    } finally {
      setSaving(false);
    }
  };

  const handleDispatch = async (trip) => {
    if (!trip.vehicleId || !trip.driverId) {
      toast.error('Assign a vehicle and driver before dispatching.');
      return;
    }
    try {
      await dispatchTrip(trip.id);
      const vNum  = trip.vehicle?.registrationNumber ?? 'vehicle';
      const dName = trip.driver?.name ?? 'driver';
      toast.success(`${vNum} dispatched — ${dName} is now On Trip.`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to dispatch.');
    }
  };

  const handleStart = async (trip) => {
    try {
      await startTrip(trip.id);
      const vNum = trip.vehicle?.registrationNumber ?? 'Vehicle';
      toast.success(`${vNum} is now en route — departure logged.`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to mark departure.');
    }
  };

  const handleComplete = async (endOdometer) => {
    if (!odometerTarget) return;
    try {
      await completeTrip(odometerTarget.id, { endOdometer });
      toast.success(`Trip ${odometerTarget.tripNumber} completed — vehicle and driver now Available.`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to complete trip.');
    } finally {
      setOdometerTarget(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelTrip(cancelTarget.id);
      toast.success(`Trip ${cancelTarget.tripNumber} cancelled.`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to cancel trip.');
    } finally {
      setCancelTarget(null);
    }
  };

  const handleAssignRecommendation = async (recommendation) => {
    if (!insightTrip) return;
    try {
      await updateTrip(insightTrip.id, { vehicleId: recommendation.vehicle.id });
      toast.success(`${recommendation.vehicle.registrationNumber} assigned to ${insightTrip.tripNumber}.`);
      setInsightTrip(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to assign vehicle.');
    }
  };

  const openRecommendations = async (trip) => {
    const cargoWeight = Number(trip.cargoWeight);
    if (!cargoWeight) {
      toast.error('Add a cargo weight before requesting recommendations.');
      return;
    }
    setInsightTrip(trip);
    setInsightType('recommendations');
    setRecommendations([]);
    setInsightLoading(true);
    try {
      const response = await getDispatchRecommendations({ cargoWeight });
      setRecommendations(response.data.data ?? []);
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to load recommendations.');
      setInsightTrip(null);
    } finally {
      setInsightLoading(false);
    }
  };

  const openSummary = async (trip) => {
    setInsightTrip(trip);
    setInsightType('summary');
    setSummary(null);
    setInsightLoading(true);
    try {
      const response = await getTripSummary(trip.id);
      setSummary(response.data.data);
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to load trip summary.');
      setInsightTrip(null);
    } finally {
      setInsightLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!insightTrip || !summary) return;
    try {
      await downloadTripSummaryPdf(insightTrip.id, summary.tripNumber);
      toast.success('PDF download started.');
    } catch {
      toast.error('Failed to generate PDF summary.');
    }
  };

  const q = query.toLowerCase();
  const displayed = trips.filter(t =>
    !q ||
    (t.tripNumber ?? '').toLowerCase().includes(q) ||
    (t.originAddress ?? '').toLowerCase().includes(q) ||
    (t.destinationAddress ?? '').toLowerCase().includes(q) ||
    (t.vehicle?.registrationNumber ?? '').toLowerCase().includes(q) ||
    (t.driver?.name ?? '').toLowerCase().includes(q)
  );

  const STATUS_FILTERS = [
    { value: '',           label: 'All' },
    { value: 'DRAFT',      label: 'Draft' },
    { value: 'DISPATCHED', label: 'Assigned' },
    { value: 'ACTIVE',     label: 'En Route' },
    { value: 'COMPLETED',  label: 'Completed' },
    { value: 'CANCELLED',  label: 'Cancelled' },
  ];
  const STATUS_PILL_COLORS = {
    '':         'bg-white/8 text-slate-300 border border-white/10',
    DRAFT:      'bg-slate-500/20 text-slate-300 border border-slate-500/30',
    DISPATCHED: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    ACTIVE:     'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    COMPLETED:  'bg-emerald-600/20 text-emerald-200 border border-emerald-600/30',
    CANCELLED:  'bg-red-500/20 text-red-300 border border-red-500/30',
  };

  const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all';

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Trip Dispatcher"
        subtitle="Create and manage trips across the fleet"
        action={canEditTrips ? (
          <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 btn-amber">
            <Plus className="w-4 h-4" /> New Trip
          </button>
        ) : null}
      />

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
              statusFilter === value
                ? 'bg-amber-500 text-slate-900 shadow-[0_2px_8px_rgba(245,158,11,0.35)]'
                : STATUS_PILL_COLORS[value]
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Live Board */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState type="error" title="Could not load trips" message={error}
          action={<button onClick={fetchAll} className="text-sm text-amber-400 hover:underline">Retry</button>} />
      ) : displayed.length === 0 ? (
        <EmptyState title="No trips found"
          message={query ? 'No results match your search.' : 'Create a new trip to get started.'} />
      ) : (
        <div className="devpulse-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Live Board</h2>
              <p className="text-[11px] text-[#666] mt-0.5">{displayed.length} trip{displayed.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {displayed.map((t) => {
              const noVehicle = !t.vehicleId;
              const noDriver  = !t.driverId;
              const missingAssignment = noVehicle || noDriver;

              return (
                <div key={t.id} className="px-5 py-4 hover:bg-[#1a1a1a] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Header row */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-[11px] text-[#888]">{t.tripNumber}</span>
                        <StatusBadge status={t.status} />
                        {t.status === 'DRAFT' && noVehicle && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-600/20 text-slate-500 border border-slate-600/30">
                            Awaiting vehicle
                          </span>
                        )}
                        {t.status === 'DRAFT' && !noVehicle && noDriver && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500/70 border border-amber-500/20">
                            Awaiting driver
                          </span>
                        )}
                      </div>

                      {/* Route */}
                      <p className="text-sm text-slate-200 flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="truncate max-w-[160px]">{t.originAddress?.split(',')[0]}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[160px]">{t.destinationAddress?.split(',')[0]}</span>
                      </p>

                      {/* Vehicle & Driver */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {t.vehicle?.registrationNumber
                            ? <span className="text-slate-300">{t.vehicle.registrationNumber}</span>
                            : <span className="text-amber-500/70 italic">Unassigned</span>
                          }
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {t.driver?.name
                            ? <span className="text-slate-300">{t.driver.name}</span>
                            : <span className="text-amber-500/70 italic">No driver</span>
                          }
                        </span>
                        {t.distanceKm && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t.distanceKm} km
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#666]">{formatDateTime(t.plannedDeparture)}</p>
                      <TripStepper status={t.status} />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0 pt-1">
                      {/* Smart insights — available to all roles */}
                      {t.status === 'DRAFT' && (
                        <button
                          onClick={() => openRecommendations(t)}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" /> Recommend
                        </button>
                      )}
                      {t.status === 'COMPLETED' && (
                        <button
                          onClick={() => openSummary(t)}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-violet-500/10 text-violet-400 border border-violet-500/30 rounded-lg text-xs font-semibold hover:bg-violet-500/20 transition-colors"
                        >
                          <FileDown className="w-3 h-3" /> Summary
                        </button>
                      )}
                    {canEditTrips && (
                      <div className="flex flex-col gap-1.5">
                        {/* DRAFT: Dispatch (needs both vehicle & driver) */}
                        {t.status === 'DRAFT' && (
                          <button
                            onClick={() => handleDispatch(t)}
                            disabled={missingAssignment}
                            title={missingAssignment ? 'Assign vehicle and driver first' : 'Dispatch this trip'}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
                              missingAssignment
                                ? 'bg-slate-700/20 text-slate-600 border-slate-700/30 cursor-not-allowed'
                                : 'bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/25'
                            )}
                          >
                            Dispatch
                          </button>
                        )}

                        {/* DISPATCHED: Depart (moves to ACTIVE / En Route) */}
                        {t.status === 'DISPATCHED' && (
                          <button
                            onClick={() => handleStart(t)}
                            className="px-3 py-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-lg text-xs font-semibold hover:bg-amber-500/25 transition-colors"
                          >
                            Depart
                          </button>
                        )}

                        {/* ACTIVE: Complete trip (requires end odometer) */}
                        {t.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => openLiveMap(t)}
                              className="px-3 py-1.5 bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded-lg text-xs font-semibold hover:bg-blue-500/25 transition-colors"
                            >
                              Live Map
                            </button>
                            <button
                              onClick={() => setOdometerTarget({ id: t.id, tripNumber: t.tripNumber, startOdometer: t.startOdometer })}
                              className="px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-lg text-xs font-semibold hover:bg-emerald-500/25 transition-colors"
                            >
                              Complete
                            </button>
                          </>
                        )}

                        {/* Cancel — available for DRAFT, DISPATCHED, ACTIVE */}
                        {(t.status === 'DRAFT' || t.status === 'DISPATCHED' || t.status === 'ACTIVE') && (
                          <button
                            onClick={() => setCancelTarget({ id: t.id, tripNumber: t.tripNumber })}
                            className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/25 rounded-lg text-xs font-semibold hover:bg-red-500/25 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Odometer modal (ACTIVE → COMPLETED) */}
      <OdometerModal
        open={!!odometerTarget}
        onOpenChange={(open) => !open && setOdometerTarget(null)}
        tripNumber={odometerTarget?.tripNumber}
        startOdometer={odometerTarget?.startOdometer}
        onConfirm={handleComplete}
      />

      {/* Cancel confirm dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel this trip?"
        message={cancelTarget
          ? `Trip ${cancelTarget.tripNumber} will be cancelled and any assigned vehicle/driver will be freed.`
          : ''}
        confirmLabel="Yes, cancel trip"
        onConfirm={handleCancel}
        destructive
      />

      {trackingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setTrackingTrip(null)} />
          <div className="relative w-full max-w-5xl glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h2 className="font-semibold text-white">Live trip · {trackingTrip.tripNumber}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {trackingTrip.locationUpdatedAt
                    ? `Driver location updated ${formatDateTime(trackingTrip.locationUpdatedAt)}`
                    : 'Waiting for the driver device to share its first location'}
                </p>
              </div>
              <button onClick={() => setTrackingTrip(null)} className="text-slate-400 hover:text-white" aria-label="Close live map">
                <X className="w-5 h-5" />
              </button>
            </div>
            {trackingLoading ? (
              <div className="h-[560px] flex items-center justify-center"><LoadingSpinner /></div>
            ) : (
              <>
                <MapContainer
                  key={trackingTrip.id}
                  center={[trackingTrip.currentLat ?? trackingTrip.originLat, trackingTrip.currentLng ?? trackingTrip.originLng]}
                  zoom={8}
                  className="h-[500px] w-full"
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {trackingRoute.length > 1 && <Polyline positions={trackingRoute} color="blue" weight={5} />}
                  <CircleMarker center={[trackingTrip.originLat, trackingTrip.originLng]} radius={8} color="green">
                    <Popup>Source: {trackingTrip.originAddress}</Popup>
                  </CircleMarker>
                  <CircleMarker center={[trackingTrip.destinationLat, trackingTrip.destinationLng]} radius={8} color="red">
                    <Popup>Destination: {trackingTrip.destinationAddress}</Popup>
                  </CircleMarker>
                  {trackingTrip.currentLat && trackingTrip.currentLng && (
                    <CircleMarker center={[trackingTrip.currentLat, trackingTrip.currentLng]} radius={10} color="orange">
                      <Popup>Current vehicle position</Popup>
                    </CircleMarker>
                  )}
                  {nearbyPlaces.map((place) => (
                    <CircleMarker key={place.id} center={[place.latitude, place.longitude]} radius={5} color="purple">
                      <Popup>
                        <strong>{place.name}</strong><br />
                        {place.categories.some((category) => category.includes('gas')) ? 'Fuel stop' : 'Rest / service stop'}<br />
                        {place.address}
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
                <div className="px-5 py-3 flex flex-wrap gap-4 text-xs text-slate-400 border-t border-white/10">
                  <span>Route distance: {trackingTrip.distanceKm ?? '—'} km</span>
                  <span>Useful stops nearby: {nearbyPlaces.length}</span>
                  <span>Position refreshes every 15 seconds</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Trip Drawer */}
      {drawerOpen && canEditTrips && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md glass-panel border-l border-white/5 overflow-y-auto p-6 space-y-4 animate-slide-in-right">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Create Trip</h2>
                <p className="text-xs text-slate-500 mt-0.5">Vehicle and driver can be assigned later</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <AddressAutocomplete
                label="Source / Origin *"
                value={form.originAddress}
                required
                onChange={(originAddress) =>
                  setForm((c) => ({ ...c, originAddress, originLat: '', originLng: '' }))
                }
                onSelect={(loc) =>
                  setForm((c) => ({ ...c, originAddress: loc.label, originLat: loc.latitude, originLng: loc.longitude }))
                }
              />

              <AddressAutocomplete
                label="Destination *"
                value={form.destinationAddress}
                required
                onChange={(destinationAddress) =>
                  setForm((c) => ({ ...c, destinationAddress, destinationLat: '', destinationLng: '' }))
                }
                onSelect={(loc) =>
                  setForm((c) => ({ ...c, destinationAddress: loc.label, destinationLat: loc.latitude, destinationLng: loc.longitude }))
                }
              />

              {/* Departure: date + time as two clean inputs */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Planned Departure *</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={form.departureDate}
                    onChange={(e) => setForm((f) => ({ ...f, departureDate: e.target.value }))}
                    className={cn(inputCls, 'flex-1 pr-2')}
                  />
                  <input
                    type="time"
                    required
                    value={form.departureTime}
                    onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
                    className={cn(inputCls, 'w-28 shrink-0 pr-2')}
                  />
                </div>
              </div>

              {/* Distance */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Distance (km)</label>
                <input type="number" min="0" step="any" value={form.distanceKm}
                  onChange={(e) => {
                    setDistanceManuallyEdited(true);
                    setForm((f) => ({ ...f, distanceKm: e.target.value }));
                  }}
                  className={inputCls} placeholder={routeCalculating ? 'Calculating route…' : 'Calculated automatically'} />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-slate-500">
                    {distanceManuallyEdited ? 'Manual override' : 'Road distance from selected locations'}
                  </p>
                  {distanceManuallyEdited && (
                    <button type="button" onClick={() => calculateDistance(true)}
                      className="text-[11px] text-amber-400 hover:text-amber-300">
                      Use route distance
                    </button>
                  )}
                </div>
              </div>

              {/* Vehicle (optional) */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">
                  Vehicle <span className="text-slate-600 font-normal normal-case">(optional — assign later)</span>
                </label>
                <select value={form.vehicleId}
                  onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))} className={inputCls}>
                  <option value="">None — assign at dispatch</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} – {v.make} {v.model}
                      {v.maximumLoadCapacity ? ` (${v.maximumLoadCapacity} kg cap)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver (optional) */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">
                  Driver <span className="text-slate-600 font-normal normal-case">(optional — assign later)</span>
                </label>
                <select value={form.driverId}
                  onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))} className={inputCls}>
                  <option value="">None — assign at dispatch</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.licenseCategory})</option>
                  ))}
                </select>
              </div>

              {/* Cargo weight */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Cargo Weight (kg)</label>
                <input type="number" min="0" step="any" value={form.cargoWeight}
                  onChange={(e) => setForm((f) => ({ ...f, cargoWeight: e.target.value }))}
                  className={inputCls} placeholder="Optional" />
              </div>

              {/* Capacity warning */}
              {capacityExceeded && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-400">Capacity exceeded — dispatch will be blocked</p>
                    <p className="text-xs text-red-400/80 mt-0.5">
                      Cargo is {capacityOverBy.toFixed(1)} kg over the {capacity} kg limit for {selectedVehicle?.registrationNumber}.
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Notes</label>
                <textarea rows={2} value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className={cn(inputCls, 'resize-none')} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDrawerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || capacityExceeded || !form.originLat || !form.destinationLat}
                  className="flex-1 py-2.5 rounded-xl text-sm btn-amber disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating…' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {insightTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setInsightTrip(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {insightType === 'summary' ? 'Trip Summary' : 'Dispatch Recommendations'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{insightTrip.tripNumber}</p>
              </div>
              <button onClick={() => setInsightTrip(null)} className="text-slate-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {insightLoading ? (
              <LoadingSpinner />
            ) : insightType === 'recommendations' ? (
              recommendations.length === 0 ? (
                <EmptyState title="No suitable vehicles" message="No fleet vehicle matches this trip's cargo requirements." />
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 mb-1">Click a vehicle to auto-assign it to this trip.</p>
                  {recommendations.slice(0, 5).map((recommendation, index) => (
                    <button
                      key={recommendation.vehicle.id}
                      onClick={() => handleAssignRecommendation(recommendation)}
                      className="w-full text-left bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-amber-500/40 hover:bg-slate-700/60 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100 group-hover:text-amber-400 transition-colors">
                            {index + 1}. {recommendation.vehicle.registrationNumber}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {recommendation.vehicle.make} {recommendation.vehicle.model} · {recommendation.vehicle.type}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-sm font-semibold text-amber-400">{recommendation.score}% match</span>
                          <span className="text-[10px] text-slate-600 group-hover:text-amber-400/70 transition-colors">
                            Click to assign →
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {recommendation.reasons.map((reason) => (
                          <span key={reason} className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : summary ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['Vehicle', summary.vehicle?.registrationNumber ?? 'N/A'],
                    ['Driver', summary.driver?.name ?? 'N/A'],
                    ['Distance', `${summary.metrics.distance} km`],
                    ['Fuel used', `${summary.metrics.fuelUsed.toFixed(1)} L`],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-sm font-semibold text-slate-200 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ['Total cost', summary.metrics.totalCost],
                    ['Revenue', summary.metrics.revenue],
                    ['Net profit', summary.metrics.profit],
                  ].map(([label, value]) => (
                    <div key={label} className="border border-slate-700 rounded-lg p-3">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-lg font-semibold text-slate-100 mt-1">{value.toFixed(2)} INR</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button onClick={handleDownloadPdf}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-md text-sm transition-colors">
                    <FileDown className="w-4 h-4" /> Download PDF
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

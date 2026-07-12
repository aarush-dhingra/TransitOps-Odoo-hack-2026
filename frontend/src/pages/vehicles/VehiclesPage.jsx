import { useEffect, useState, useCallback } from 'react';
import { Eye, FileText, History, Plus, Trash2, Upload, X } from 'lucide-react';
import {
  createVehicle,
  getVehicleDocumentVault,
  getVehicleTimeline,
  getVehicles,
  updateVehicle,
} from '../../api/vehicles';
import { deleteDocument, downloadDocument, uploadDocument } from '../../api/documents';
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
const DOCUMENT_CATEGORIES = [
  { key: 'insurance', value: 'INSURANCE_CERTIFICATE', label: 'Insurance' },
  { key: 'rc', value: 'VEHICLE_REGISTRY', label: 'Registration Certificate' },
  { key: 'puc', value: 'PUC_CERTIFICATE', label: 'PUC Certificate' },
  { key: 'fitness', value: 'FITNESS_CERTIFICATE', label: 'Fitness Certificate' },
];

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
  const canEditFleet  = canWrite('fleet');
  const canUploadDocs = canWrite('documents');
  const { query } = useSearch();

  const [vehicles,   setVehicles]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filters,    setFilters]    = useState({ type: '', status: '' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing,        setEditing]        = useState(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [saving,         setSaving]         = useState(false);
  const [detailsVehicle, setDetailsVehicle] = useState(null);
  const [detailsTab,     setDetailsTab]     = useState('general');
  const [timeline,       setTimeline]       = useState([]);
  const [vault,          setVault]          = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [uploadForm,     setUploadForm]     = useState({ category: '', expiryDate: '', file: null });
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

  const refreshVehicleDetails = async (vehicleId) => {
    setDetailsLoading(true);
    try {
      const [timelineResponse, vaultResponse] = await Promise.all([
        getVehicleTimeline(vehicleId),
        getVehicleDocumentVault(vehicleId),
      ]);
      setTimeline(timelineResponse.data.data ?? []);
      setVault(vaultResponse.data.data);
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to load vehicle details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const openDetails = (vehicle) => {
    setDetailsVehicle(vehicle);
    setDetailsTab('general');
    setTimeline([]);
    setVault(null);
    setUploadForm({ category: '', expiryDate: '', file: null });
    refreshVehicleDetails(vehicle.id);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.category || !uploadForm.file) {
      toast.error('Select a document category and file.');
      return;
    }
    const formData = new FormData();
    formData.append('vehicleId', detailsVehicle.id);
    formData.append('category', uploadForm.category);
    formData.append('file', uploadForm.file);
    if (uploadForm.expiryDate) {
      formData.append('expiryDate', new Date(uploadForm.expiryDate).toISOString());
    }
    setUploading(true);
    try {
      await uploadDocument(formData);
      toast.success('Document uploaded.');
      setUploadForm({ category: '', expiryDate: '', file: null });
      await refreshVehicleDetails(detailsVehicle.id);
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await deleteDocument(documentId);
      toast.success('Document deleted.');
      await refreshVehicleDetails(detailsVehicle.id);
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to delete document.');
    }
  };

  const handleViewDocument = async (document) => {
    try {
      await downloadDocument(document.id, document.originalName);
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to open document.');
    }
  };

  // Client-side search
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
                  <th className="px-5 py-3 text-right">Actions</th>
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
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(v);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                    </td>
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

      {detailsVehicle && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetailsVehicle(null)} />
          <div className="relative w-full max-w-3xl bg-slate-900 border-l border-slate-800 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-6 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{detailsVehicle.registrationNumber}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {detailsVehicle.make} {detailsVehicle.model} · {detailsVehicle.type}
                  </p>
                </div>
                <button onClick={() => setDetailsVehicle(null)} className="text-slate-400 hover:text-white" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-5 mt-6 overflow-x-auto">
                {[
                  { key: 'general', label: 'General', icon: Eye },
                  { key: 'vault', label: 'Document Vault', icon: FileText },
                  { key: 'timeline', label: 'Timeline', icon: History },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setDetailsTab(key)}
                    className={`flex items-center gap-1.5 pb-3 border-b-2 text-sm whitespace-nowrap ${
                      detailsTab === key
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {detailsLoading ? (
                <LoadingSpinner />
              ) : detailsTab === 'general' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    ['Status', detailsVehicle.status.replace(/_/g, ' ')],
                    ['Year', detailsVehicle.year],
                    ['Fuel', detailsVehicle.fuelType],
                    ['Odometer', `${detailsVehicle.currentOdometer?.toLocaleString('en-IN')} km`],
                    ['Tank capacity', `${detailsVehicle.tankCapacity} L`],
                    ['Maximum load', detailsVehicle.maximumLoadCapacity ? `${detailsVehicle.maximumLoadCapacity} kg` : '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-sm font-medium text-slate-200 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
              ) : detailsTab === 'timeline' ? (
                timeline.length === 0 ? (
                  <EmptyState title="No activity yet" message="Trips, fuel, and maintenance events will appear here." />
                ) : (
                  <div className="border-l border-slate-700 ml-2 space-y-6">
                    {timeline.map((event, index) => (
                      <div key={`${event.type}-${event.date}-${index}`} className="relative pl-6">
                        <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-slate-900" />
                        <p className="text-xs text-slate-500">{formatDate(event.date)}</p>
                        <h3 className="text-sm font-semibold text-slate-200 mt-1">{event.title}</h3>
                        <p className="text-sm text-slate-400 mt-0.5">{event.description}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DOCUMENT_CATEGORIES.map((category) => {
                      const document = vault?.[category.key];
                      return (
                        <div key={category.key} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-slate-200">{category.label}</h3>
                              <p className="text-xs text-slate-500 truncate mt-1">
                                {document?.uploaded ? document.originalName : 'No document uploaded'}
                              </p>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded ${
                              document?.status === 'VALID' ? 'bg-emerald-500/10 text-emerald-400' :
                              document?.status === 'EXPIRING_SOON' ? 'bg-amber-500/10 text-amber-400' :
                              document?.status === 'EXPIRED' ? 'bg-red-500/10 text-red-400' :
                              'bg-slate-700 text-slate-400'
                            }`}>
                              {document?.status ?? 'MISSING'}
                            </span>
                          </div>
                          {document?.uploaded && (
                            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-700">
                              <button onClick={() => handleViewDocument(document)} className="text-xs text-amber-400 hover:text-amber-300">
                                View file
                              </button>
                              {canUploadDocs && (
                                <button onClick={() => handleDeleteDocument(document.id)}
                                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {canUploadDocs && (
                    <form onSubmit={handleUpload} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-slate-200">Upload document</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <select required value={uploadForm.category}
                          onChange={(e) => setUploadForm((current) => ({ ...current, category: e.target.value }))}
                          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-200">
                          <option value="">Category</option>
                          {DOCUMENT_CATEGORIES.map((category) => (
                            <option key={category.value} value={category.value}>{category.label}</option>
                          ))}
                        </select>
                        <input type="date" value={uploadForm.expiryDate}
                          onChange={(e) => setUploadForm((current) => ({ ...current, expiryDate: e.target.value }))}
                          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-200" />
                        <input type="file" required accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setUploadForm((current) => ({ ...current, file: e.target.files?.[0] ?? null }))}
                          className="text-xs text-slate-400 file:mr-2 file:px-3 file:py-2 file:border-0 file:rounded file:bg-slate-700 file:text-slate-200" />
                      </div>
                      <button type="submit" disabled={uploading}
                        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-md text-sm disabled:opacity-50">
                        <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

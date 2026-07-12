import { useEffect, useState, useCallback } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { getDrivers, createDriver, updateDriver, updateDriverStatus } from '../../api/drivers';
import StatusBadge from '../../components/shared/StatusBadge';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';

const DRIVER_STATUSES   = ['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'ON_LEAVE', 'SUSPENDED'];
const LICENSE_CATEGORIES = ['LMV', 'HMV', 'HPMV', 'TRANS'];

const EMPTY_FORM = {
  name:            '',
  phone:           '',
  email:           '',
  licenseNumber:   '',
  licenseCategory: 'LMV',
  licenseExpiry:   '',
  status:          'AVAILABLE',
};

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const diff = new Date(dateStr) - new Date();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function DriversPage() {
  const [drivers,    setDrivers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

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

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (d) => {
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
        toast.success('Driver updated.');
      } else {
        await createDriver(form);
        toast.success('Driver added.');
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
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to update status.');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Drivers & Safety Profiles"
        subtitle="Manage drivers, licenses, and safety scores"
        action={
          <button onClick={openCreate} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-md text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Driver
          </button>
        }
      />

      <p className="text-xs text-amber-400/80">
        Rule: Expired license or Suspended status → blocked from trip assignment
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState type="error" title="Could not load drivers" message={error}
          action={<button onClick={fetchDrivers} className="text-sm text-amber-400 hover:underline">Retry</button>} />
      ) : drivers.length === 0 ? (
        <EmptyState title="No drivers found" message="Add a driver to get started." />
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Driver</th>
                  <th className="px-5 py-3 text-left">License No.</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Expiry</th>
                  <th className="px-5 py-3 text-left">Contact</th>
                  <th className="px-5 py-3 text-right">Safety Score</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Quick Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {drivers.map((d) => {
                  const expired  = isExpired(d.licenseExpiry);
                  const expiring = isExpiringSoon(d.licenseExpiry);
                  return (
                    <tr key={d.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <button onClick={() => openEdit(d)} className="text-slate-200 hover:text-amber-400 text-left font-medium transition-colors">
                          {d.name}
                        </button>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{d.licenseNumber}</td>
                      <td className="px-5 py-3 text-slate-400">{d.licenseCategory}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium ${expired ? 'text-red-400' : expiring ? 'text-amber-400' : 'text-slate-400'}`}>
                          {formatDate(d.licenseExpiry)}
                          {expired  && <span className="ml-1 font-bold">EXPIRED</span>}
                          {expiring && !expired && <span className="ml-1">⚠</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{d.phone}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-sm font-semibold ${d.safetyScore >= 90 ? 'text-emerald-400' : d.safetyScore >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                          {d.safetyScore}
                        </span>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {['AVAILABLE', 'OFF_DUTY', 'SUSPENDED'].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusToggle(d, s)}
                              disabled={d.status === s}
                              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-default
                                ${s === 'AVAILABLE'  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : ''}
                                ${s === 'OFF_DUTY'   ? 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30' : ''}
                                ${s === 'SUSPENDED'  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : ''}
                              `}
                            >
                              {s.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{editing ? 'Edit Driver' : 'Add Driver'}</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {[
                { label: 'Full Name',       key: 'name',          required: true },
                { label: 'Phone',           key: 'phone',         required: true },
                { label: 'Email',           key: 'email' },
                { label: 'License Number',  key: 'licenseNumber', required: true },
                { label: 'License Expiry',  key: 'licenseExpiry', type: 'date', required: true },
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

              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">License Category</label>
                <select
                  value={form.licenseCategory}
                  onChange={(e) => setForm((f) => ({ ...f, licenseCategory: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {LICENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {editing && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {DRIVER_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              )}

              {form.licenseExpiry && isExpired(form.licenseExpiry) && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">License is expired. This driver cannot be assigned to trips.</p>
                </div>
              )}

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

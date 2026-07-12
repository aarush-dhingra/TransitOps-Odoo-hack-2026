import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, X, Fuel as FuelIcon, Receipt, TrendingDown } from 'lucide-react';
import { getFuelLogs, createFuelLog, deleteFuelLog } from '../../api/fuel';
import { getExpenses, createExpense, deleteExpense } from '../../api/expenses';
import { getVehicles } from '../../api/vehicles';
import { getTrips } from '../../api/trips';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { formatDate, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { usePermissions } from '../../hooks/useAuth';
import { useSearch } from '../../context/SearchContext';

const EXPENSE_CATEGORIES = ['FUEL', 'TOLL', 'PARKING', 'DRIVER_ALLOWANCE', 'LOADING', 'OTHER'];

const EMPTY_FUEL = {
  vehicleId:       '',
  tripId:          '',
  date:            new Date().toISOString().slice(0, 10),
  litres:          '',
  pricePerLitre:   '',
  odometerAtFill:  '',
  location:        '',
};

const EMPTY_EXPENSE = {
  vehicleId:   '',
  tripId:      '',
  category:    'TOLL',
  amount:      '',
  date:        new Date().toISOString().slice(0, 10),
  description: '',
};

const CATEGORY_COLORS = {
  FUEL:             'bg-amber-500/15 text-amber-400',
  TOLL:             'bg-blue-500/15 text-blue-400',
  PARKING:          'bg-slate-500/15 text-slate-400',
  DRIVER_ALLOWANCE: 'bg-purple-500/15 text-purple-400',
  LOADING:          'bg-emerald-500/15 text-emerald-400',
  OTHER:            'bg-slate-500/15 text-slate-400',
};

export default function FuelPage() {
  const { canWrite, canRead } = usePermissions();
  const canEditFuel  = canWrite('fuel');
  const canViewTrips = canRead('trips');
  const { query } = useSearch();

  const [fuelLogs,   setFuelLogs]   = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [vehicles,   setVehicles]   = useState([]);
  const [trips,      setTrips]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fuelError,  setFuelError]  = useState('');
  const [expError,   setExpError]   = useState('');

  const [fuelDrawer,    setFuelDrawer]    = useState(false);
  const [expenseDrawer, setExpenseDrawer] = useState(false);
  const [fuelForm,      setFuelForm]      = useState(EMPTY_FUEL);
  const [expForm,       setExpForm]       = useState(EMPTY_EXPENSE);
  const [saving,        setSaving]        = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null); // { type: 'fuel'|'expense', id }
  const todayStr = new Date().toISOString().split('T')[0];

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFuelError('');
    setExpError('');

    const safeGet = async (fn) => {
      try { return await fn(); }
      catch { return null; }
    };

    const [fRes, eRes, vRes, tRes] = await Promise.all([
      safeGet(getFuelLogs),
      safeGet(getExpenses),
      safeGet(() => getVehicles({ limit: 200 })),
      canViewTrips ? safeGet(() => getTrips({ limit: 200 })) : Promise.resolve(null),
    ]);

    setLoading(false);

    if (fRes) setFuelLogs(fRes.data.data ?? []);
    else setFuelError('Could not load fuel logs.');

    if (eRes) setExpenses(eRes.data.data ?? []);
    else setExpError('Could not load expenses.');

    setVehicles(vRes?.data?.data ?? []);
    setTrips(tRes?.data?.data ?? []);
  }, [canViewTrips]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalFuel    = fuelLogs.reduce((s, l) => s + (l.totalCost || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalOps     = totalFuel + totalExpense;

  const handleLogFuel = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...fuelForm,
        litres:         parseFloat(fuelForm.litres),
        pricePerLitre:  parseFloat(fuelForm.pricePerLitre),
        totalCost:      parseFloat(fuelForm.litres) * parseFloat(fuelForm.pricePerLitre),
        odometerAtFill: parseFloat(fuelForm.odometerAtFill),
        date:           new Date(fuelForm.date).toISOString(),
        tripId:         fuelForm.tripId || undefined,
        location:       fuelForm.location || undefined,
      };
      await createFuelLog(payload);
      const vName = vehicles.find(v => v.id === fuelForm.vehicleId)?.registrationNumber ?? 'vehicle';
      toast.success(`Fuel logged for ${vName}.`);
      setFuelDrawer(false);
      setFuelForm(EMPTY_FUEL);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to log fuel.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...expForm,
        amount: parseFloat(expForm.amount),
        date:   new Date(expForm.date).toISOString(),
        tripId: expForm.tripId || undefined,
      };
      await createExpense(payload);
      toast.success('Expense recorded.');
      setExpenseDrawer(false);
      setExpForm(EMPTY_EXPENSE);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to add expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'fuel') {
        await deleteFuelLog(deleteTarget.id);
        toast.success('Fuel log deleted.');
      } else {
        await deleteExpense(deleteTarget.id);
        toast.success('Expense deleted.');
      }
      fetchAll();
    } catch {
      toast.error('Failed to delete.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const vName = (id) => vehicles.find((v) => v.id === id)?.registrationNumber ?? '—';
  const tNum  = (id) => trips.find((t) => t.id === id)?.tripNumber ?? '—';

  const q = query.toLowerCase();
  const filteredFuel = fuelLogs.filter(l =>
    !q || vName(l.vehicleId).toLowerCase().includes(q) || (l.location ?? '').toLowerCase().includes(q)
  );
  const filteredExp = expenses.filter(ex =>
    !q || vName(ex.vehicleId).toLowerCase().includes(q) || (ex.description ?? '').toLowerCase().includes(q) || ex.category.toLowerCase().includes(q)
  );

  const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all';

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Fuel & Expenses" subtitle="Track fuel consumption and operational costs" />

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Fuel Cost', value: formatCurrency(totalFuel), color: 'text-amber-400', icon: FuelIcon, iconBg: 'bg-amber-500/15' },
          { label: 'Other Expenses',  value: formatCurrency(totalExpense), color: 'text-blue-400', icon: Receipt, iconBg: 'bg-blue-500/15' },
          { label: 'Total Ops Cost',  value: formatCurrency(totalOps), color: 'text-red-400', icon: TrendingDown, iconBg: 'bg-red-500/15' },
        ].map(({ label, value, color, icon: Icon, iconBg }) => (
          <div key={label} className="devpulse-panel p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">{label}</p>
              <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Fuel Logs */}
          <div className="devpulse-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Fuel Logs</h2>
              {canEditFuel && (
                <button onClick={() => setFuelDrawer(true)}
                  className="flex items-center gap-1.5 btn-amber py-1.5 px-3 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Log Fuel
                </button>
              )}
            </div>
            {fuelError ? (
              <EmptyState type="error" title="Could not load fuel logs" message={fuelError}
                action={<button onClick={fetchAll} className="text-sm text-amber-400 hover:underline">Retry</button>} />
            ) : filteredFuel.length === 0 ? (
              <EmptyState title="No fuel logs" message={query ? 'No results match your search.' : 'Log the first refuel.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="thead-row">
                      <th className="px-5 py-3 text-left">Vehicle</th>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-right">Litres</th>
                      <th className="px-5 py-3 text-right">Price/L</th>
                      <th className="px-5 py-3 text-right">Total</th>
                      <th className="px-5 py-3 text-right">Odometer</th>
                      <th className="px-5 py-3 text-left">Location</th>
                      {canEditFuel && <th className="px-5 py-3 w-8" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {filteredFuel.map((l) => (
                      <tr key={l.id} className="tbody-row">
                        <td className="px-5 py-3 font-mono text-xs text-slate-300">{vName(l.vehicleId)}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(l.date)}</td>
                        <td className="px-5 py-3 text-right text-slate-300 tabular-nums">{l.litres} L</td>
                        <td className="px-5 py-3 text-right text-slate-400 text-xs tabular-nums">{formatCurrency(l.pricePerLitre)}</td>
                        <td className="px-5 py-3 text-right text-amber-400 font-semibold tabular-nums">{formatCurrency(l.totalCost)}</td>
                        <td className="px-5 py-3 text-right text-slate-400 text-xs tabular-nums">{l.odometerAtFill?.toLocaleString('en-IN')} km</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{l.location ?? '—'}</td>
                        {canEditFuel && (
                          <td className="px-5 py-3">
                            <button onClick={() => setDeleteTarget({ type: 'fuel', id: l.id })}
                              className="text-slate-600 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Other Expenses */}
          <div className="devpulse-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Other Expenses</h2>
              {canEditFuel && (
                <button onClick={() => setExpenseDrawer(true)}
                  className="flex items-center gap-1.5 btn-amber py-1.5 px-3 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Expense
                </button>
              )}
            </div>
            {expError ? (
              <EmptyState type="error" title="Could not load expenses" message={expError}
                action={<button onClick={fetchAll} className="text-sm text-amber-400 hover:underline">Retry</button>} />
            ) : filteredExp.length === 0 ? (
              <EmptyState title="No expenses" message={query ? 'No results match your search.' : 'Add an expense to track operational costs.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="thead-row">
                      <th className="px-5 py-3 text-left">Trip</th>
                      <th className="px-5 py-3 text-left">Vehicle</th>
                      <th className="px-5 py-3 text-left">Category</th>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-left">Description</th>
                      {canEditFuel && <th className="px-5 py-3 w-8" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {filteredExp.map((ex) => (
                      <tr key={ex.id} className="tbody-row">
                        <td className="px-5 py-3 font-mono text-[11px] text-[#888]">{ex.tripId ? tNum(ex.tripId) : '—'}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-300">{vName(ex.vehicleId)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[ex.category] ?? 'bg-slate-500/15 text-slate-400'}`}>
                            {ex.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(ex.date)}</td>
                        <td className="px-5 py-3 text-right text-slate-200 font-semibold tabular-nums">{formatCurrency(ex.amount)}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{ex.description ?? '—'}</td>
                        {canEditFuel && (
                          <td className="px-5 py-3">
                            <button onClick={() => setDeleteTarget({ type: 'expense', id: ex.id })}
                              className="text-slate-600 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.type === 'fuel' ? 'Delete fuel log?' : 'Delete expense?'}
        message="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        destructive
      />

      {/* Fuel Log Drawer */}
      {fuelDrawer && canEditFuel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFuelDrawer(false)} />
          <div className="relative w-full max-w-md glass-panel border-l border-white/5 overflow-y-auto p-6 space-y-4 animate-slide-in-right">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Log Fuel</h2>
              <button onClick={() => setFuelDrawer(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleLogFuel} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Vehicle *</label>
                <select required value={fuelForm.vehicleId} onChange={(e) => setFuelForm((f) => ({ ...f, vehicleId: e.target.value }))} className={inputCls}>
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
                </select>
              </div>
              {canViewTrips && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Trip (optional)</label>
                  <select value={fuelForm.tripId} onChange={(e) => setFuelForm((f) => ({ ...f, tripId: e.target.value }))} className={inputCls}>
                    <option value="">None</option>
                    {trips.map((t) => <option key={t.id} value={t.id}>{t.tripNumber}</option>)}
                  </select>
                </div>
              )}
              {[
                { label: 'Date *',           key: 'date',           type: 'date',   required: true, max: todayStr },
                { label: 'Litres *',         key: 'litres',         type: 'number', required: true, min: 0, step: 'any' },
                { label: 'Price per Litre *',key: 'pricePerLitre',  type: 'number', required: true, min: 0, step: 'any' },
                { label: 'Odometer (km) *',  key: 'odometerAtFill', type: 'number', required: true, min: 0, step: 'any' },
                { label: 'Location',         key: 'location' },
              ].map(({ label, key, type = 'text', required, min, max, step }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
                  <input type={type} required={required} min={min} max={max} step={step}
                    value={fuelForm[key]}
                    onChange={(e) => setFuelForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={inputCls} />
                </div>
              ))}
              {fuelForm.litres && fuelForm.pricePerLitre && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400 font-semibold">
                    Total: {formatCurrency(parseFloat(fuelForm.litres) * parseFloat(fuelForm.pricePerLitre))}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setFuelDrawer(false)}
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

      {/* Expense Drawer */}
      {expenseDrawer && canEditFuel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setExpenseDrawer(false)} />
          <div className="relative w-full max-w-md glass-panel border-l border-white/5 overflow-y-auto p-6 space-y-4 animate-slide-in-right">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Add Expense</h2>
              <button onClick={() => setExpenseDrawer(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Vehicle *</label>
                <select required value={expForm.vehicleId} onChange={(e) => setExpForm((f) => ({ ...f, vehicleId: e.target.value }))} className={inputCls}>
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
                </select>
              </div>
              {canViewTrips && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Trip (optional)</label>
                  <select value={expForm.tripId} onChange={(e) => setExpForm((f) => ({ ...f, tripId: e.target.value }))} className={inputCls}>
                    <option value="">None</option>
                    {trips.map((t) => <option key={t.id} value={t.id}>{t.tripNumber}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Category</label>
                <select value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              {[
                { label: 'Amount (₹) *', key: 'amount',      type: 'number', required: true, min: 0, step: 'any' },
                { label: 'Date *',        key: 'date',        type: 'date',   required: true, max: todayStr },
                { label: 'Description',  key: 'description' },
              ].map(({ label, key, type = 'text', required, min, max, step }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
                  <input type={type} required={required} min={min} max={max} step={step}
                    value={expForm[key]}
                    onChange={(e) => setExpForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={inputCls} />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setExpenseDrawer(false)}
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

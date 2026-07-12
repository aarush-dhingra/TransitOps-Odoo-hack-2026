import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { getFuelLogs, createFuelLog, deleteFuelLog } from '../../api/fuel';
import { getExpenses, createExpense, deleteExpense } from '../../api/expenses';
import { getVehicles } from '../../api/vehicles';
import { getTrips } from '../../api/trips';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import { formatDate, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

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

export default function FuelPage() {
  const [fuelLogs,   setFuelLogs]   = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [vehicles,   setVehicles]   = useState([]);
  const [trips,      setTrips]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const [fuelDrawer,    setFuelDrawer]    = useState(false);
  const [expenseDrawer, setExpenseDrawer] = useState(false);
  const [fuelForm,      setFuelForm]      = useState(EMPTY_FUEL);
  const [expForm,       setExpForm]       = useState(EMPTY_EXPENSE);
  const [saving,        setSaving]        = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fRes, eRes, vRes, tRes] = await Promise.all([
        getFuelLogs(),
        getExpenses(),
        getVehicles(),
        getTrips(),
      ]);
      setFuelLogs(fRes.data.data  ?? []);
      setExpenses(eRes.data.data  ?? []);
      setVehicles(vRes.data.data  ?? []);
      setTrips(tRes.data.data     ?? []);
    } catch {
      setError('Failed to load fuel & expense data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Totals
  const totalFuel    = fuelLogs.reduce((s, l) => s + (l.totalCost || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalOps     = totalFuel + totalExpense;

  const handleLogFuel = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...fuelForm,
        litres:          parseFloat(fuelForm.litres),
        pricePerLitre:   parseFloat(fuelForm.pricePerLitre),
        totalCost:       parseFloat(fuelForm.litres) * parseFloat(fuelForm.pricePerLitre),
        odometerAtFill:  parseFloat(fuelForm.odometerAtFill),
        date:            new Date(fuelForm.date).toISOString(),
        tripId:          fuelForm.tripId || undefined,
        location:        fuelForm.location || undefined,
      };
      await createFuelLog(payload);
      toast.success('Fuel log added.');
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
        amount:  parseFloat(expForm.amount),
        date:    new Date(expForm.date).toISOString(),
        tripId:  expForm.tripId  || undefined,
      };
      await createExpense(payload);
      toast.success('Expense added.');
      setExpenseDrawer(false);
      setExpForm(EMPTY_EXPENSE);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to add expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFuel = async (id) => {
    if (!window.confirm('Delete this fuel log?')) return;
    try {
      await deleteFuelLog(id);
      toast.success('Deleted.');
      fetchAll();
    } catch { toast.error('Failed to delete.'); }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      toast.success('Deleted.');
      fetchAll();
    } catch { toast.error('Failed to delete.'); }
  };

  const vName = (id) => vehicles.find((v) => v.id === id)?.registrationNumber ?? '—';
  const tNum  = (id) => trips.find((t) => t.id === id)?.tripNumber ?? '—';

  return (
    <div className="space-y-6">
      <PageHeader title="Fuel & Expense Management" subtitle="Track fuel consumption and operational expenses" />

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState type="error" title="Could not load data" message={error}
          action={<button onClick={fetchAll} className="text-sm text-amber-400 hover:underline">Retry</button>} />
      ) : (
        <>
          {/* ── Fuel Logs ── */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Fuel Logs</h2>
              <button onClick={() => setFuelDrawer(true)}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-3 py-1.5 rounded-md text-xs transition-colors">
                <Plus className="w-3.5 h-3.5" /> Log Fuel
              </button>
            </div>
            {fuelLogs.length === 0 ? (
              <EmptyState title="No fuel logs" message="Log the first refuel to see data here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left">Vehicle</th>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-right">Litres</th>
                      <th className="px-5 py-3 text-right">Price/L</th>
                      <th className="px-5 py-3 text-right">Fuel Cost</th>
                      <th className="px-5 py-3 text-right">Odometer</th>
                      <th className="px-5 py-3 text-left">Location</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {fuelLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-slate-300">{vName(l.vehicleId)}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(l.date)}</td>
                        <td className="px-5 py-3 text-right text-slate-300">{l.litres} L</td>
                        <td className="px-5 py-3 text-right text-slate-400 text-xs">{formatCurrency(l.pricePerLitre)}</td>
                        <td className="px-5 py-3 text-right text-slate-200 font-medium">{formatCurrency(l.totalCost)}</td>
                        <td className="px-5 py-3 text-right text-slate-400 text-xs">{l.odometerAtFill?.toLocaleString('en-IN')} km</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{l.location ?? '—'}</td>
                        <td className="px-5 py-3">
                          <button onClick={() => handleDeleteFuel(l.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Other Expenses ── */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Other Expenses (Toll / Misc)</h2>
              <button onClick={() => setExpenseDrawer(true)}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-3 py-1.5 rounded-md text-xs transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Expense
              </button>
            </div>
            {expenses.length === 0 ? (
              <EmptyState title="No expenses logged" message="Add an expense to track operational costs." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left">Trip</th>
                      <th className="px-5 py-3 text-left">Vehicle</th>
                      <th className="px-5 py-3 text-left">Category</th>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-left">Description</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {expenses.map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-slate-400">{ex.tripId ? tNum(ex.tripId) : '—'}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-300">{vName(ex.vehicleId)}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{ex.category.replace('_', ' ')}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(ex.date)}</td>
                        <td className="px-5 py-3 text-right text-slate-200 font-medium">{formatCurrency(ex.amount)}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{ex.description ?? '—'}</td>
                        <td className="px-5 py-3">
                          <button onClick={() => handleDeleteExpense(ex.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Total operational cost */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 px-5 py-4 flex items-center justify-between">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Total Operational Cost (Auto) = Fuel + Expenses
            </p>
            <p className="text-xl font-bold text-amber-400">{formatCurrency(totalOps)}</p>
          </div>
        </>
      )}

      {/* ── Fuel Log Drawer ── */}
      {fuelDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFuelDrawer(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Log Fuel</h2>
              <button onClick={() => setFuelDrawer(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleLogFuel} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Vehicle</label>
                <select required value={fuelForm.vehicleId} onChange={(e) => setFuelForm((f) => ({ ...f, vehicleId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Trip (optional)</label>
                <select value={fuelForm.tripId} onChange={(e) => setFuelForm((f) => ({ ...f, tripId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="">None</option>
                  {trips.map((t) => <option key={t.id} value={t.id}>{t.tripNumber}</option>)}
                </select>
              </div>
              {[
                { label: 'Date',           key: 'date',           type: 'date',   required: true },
                { label: 'Litres',         key: 'litres',         type: 'number', required: true },
                { label: 'Price per Litre',key: 'pricePerLitre',  type: 'number', required: true },
                { label: 'Odometer (km)',  key: 'odometerAtFill', type: 'number', required: true },
                { label: 'Location',       key: 'location' },
              ].map(({ label, key, type = 'text', required }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
                  <input type={type} required={required} value={fuelForm[key]}
                    onChange={(e) => setFuelForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
              ))}
              {fuelForm.litres && fuelForm.pricePerLitre && (
                <p className="text-xs text-amber-400">
                  Total: {formatCurrency(parseFloat(fuelForm.litres) * parseFloat(fuelForm.pricePerLitre))}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setFuelDrawer(false)}
                  className="flex-1 py-2 rounded-md text-sm border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-md text-sm bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Expense Drawer ── */}
      {expenseDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setExpenseDrawer(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Add Expense</h2>
              <button onClick={() => setExpenseDrawer(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Vehicle</label>
                <select required value={expForm.vehicleId} onChange={(e) => setExpForm((f) => ({ ...f, vehicleId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Trip (optional)</label>
                <select value={expForm.tripId} onChange={(e) => setExpForm((f) => ({ ...f, tripId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option value="">None</option>
                  {trips.map((t) => <option key={t.id} value={t.id}>{t.tripNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Category</label>
                <select value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </div>
              {[
                { label: 'Amount (₹)', key: 'amount',      type: 'number', required: true },
                { label: 'Date',       key: 'date',        type: 'date',   required: true },
                { label: 'Description',key: 'description' },
              ].map(({ label, key, type = 'text', required }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
                  <input type={type} required={required} value={expForm[key]}
                    onChange={(e) => setExpForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setExpenseDrawer(false)}
                  className="flex-1 py-2 rounded-md text-sm border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
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

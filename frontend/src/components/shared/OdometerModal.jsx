import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Gauge, X } from 'lucide-react';

/**
 * Modal dialog for entering end odometer reading when completing a trip.
 * Props: open, onOpenChange, tripNumber, startOdometer, onConfirm
 */
export default function OdometerModal({ open, onOpenChange, tripNumber, startOdometer, onConfirm }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(value);
    if (!value || isNaN(num)) {
      setError('Please enter a valid odometer reading.');
      return;
    }
    if (startOdometer != null && num < startOdometer) {
      setError(`Must be ≥ start odometer (${startOdometer.toLocaleString()} km).`);
      return;
    }
    onConfirm?.(num);
    onOpenChange?.(false);
    setValue('');
    setError('');
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) { setValue(''); setError(''); }
    onOpenChange?.(isOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 glass-panel rounded-2xl p-6 shadow-2xl animate-fade-in-up focus:outline-none">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Gauge className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <Dialog.Title className="text-base font-semibold text-white">Complete Trip</Dialog.Title>
                {tripNumber && <p className="text-xs text-slate-400 font-mono">{tripNumber}</p>}
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="text-slate-500 hover:text-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                End Odometer Reading (km)
              </label>
              {startOdometer != null && (
                <p className="text-xs text-slate-500 mb-2">
                  Start odometer: <span className="text-slate-300 font-mono">{startOdometer.toLocaleString()} km</span>
                </p>
              )}
              <input
                type="number"
                step="any"
                min={startOdometer ?? 0}
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(''); }}
                placeholder="e.g. 52300"
                className="w-full px-4 py-3 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
                autoFocus
              />
              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
            </div>

            <div className="flex gap-3 pt-1">
              <Dialog.Close asChild>
                <button type="button" className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
              >
                Mark Complete
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

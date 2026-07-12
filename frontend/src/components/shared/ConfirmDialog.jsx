import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Generic confirmation dialog.
 * Props:
 *   open, onOpenChange, title, message, confirmLabel, onConfirm, destructive
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  destructive = false,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 glass-panel rounded-2xl p-6 shadow-2xl animate-fade-in-up focus:outline-none">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${destructive ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
              <AlertTriangle className={`w-5 h-5 ${destructive ? 'text-red-400' : 'text-amber-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-semibold text-white mb-1">{title}</Dialog.Title>
              {message && (
                <Dialog.Description className="text-sm text-slate-400 leading-relaxed">{message}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex gap-3 mt-6 justify-end">
            <Dialog.Close asChild>
              <button className="px-4 py-2 rounded-lg text-sm border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={() => { onConfirm?.(); onOpenChange?.(false); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                destructive
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_4px_14px_rgba(239,68,68,0.3)]'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-[0_4px_14px_rgba(245,158,11,0.3)]'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

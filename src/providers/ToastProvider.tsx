import { ReactNode, useCallback, useMemo, useState } from 'react';
import { ToastContext, ToastType } from './toastContext';

type ToastMessage = {
  id: string;
  type: ToastType;
  message: string;
};

const DEFAULT_DURATION = 5000;

const createId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, type = 'info', durationMs = DEFAULT_DURATION }: { message: string; type?: ToastType; durationMs?: number }) => {
      const id = createId();
      setToasts((current) => [...current, { id, message, type }]);
      window.setTimeout(() => removeToast(id), durationMs);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1000] flex flex-col items-center gap-3 px-4 sm:items-end sm:pr-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              'pointer-events-auto w-full max-w-sm rounded-xl border bg-white px-4 py-3 shadow-lg transition-all ' +
              (toast.type === 'success'
                ? 'border-emerald-200 text-emerald-700'
                : toast.type === 'error'
                  ? 'border-red-200 text-red-700'
                  : 'border-slate-200 text-slate-700')
            }
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

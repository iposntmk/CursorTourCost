import { createContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export type ToastContextValue = {
  showToast: (payload: { message: string; type?: ToastType; durationMs?: number }) => void;
};

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

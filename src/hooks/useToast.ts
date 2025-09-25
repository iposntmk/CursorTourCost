import { useContext } from 'react';
import { ToastContext } from '../providers/toastContext';

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải được sử dụng trong ToastProvider');
  return ctx;
};

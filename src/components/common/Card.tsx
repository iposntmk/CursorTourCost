import { ReactNode } from 'react';
import clsx from 'clsx';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export const Card = ({ children, className }: CardProps) => (
  <div className={clsx('bg-white rounded-2xl border border-slate-200 shadow-sm', className)}>{children}</div>
);

export const CardHeader = ({ children, className }: CardProps) => (
  <div className={clsx('px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4', className)}>
    {children}
  </div>
);

export const CardTitle = ({ children, className }: CardProps) => (
  <div className={clsx('space-y-1', className)}>
    <h2 className="text-lg font-semibold text-slate-900">{children}</h2>
  </div>
);

export const CardContent = ({ children, className }: CardProps) => (
  <div className={clsx('px-6 py-5 space-y-4', className)}>{children}</div>
);

export const CardFooter = ({ children, className }: CardProps) => (
  <div className={clsx('px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3', className)}>
    {children}
  </div>
);

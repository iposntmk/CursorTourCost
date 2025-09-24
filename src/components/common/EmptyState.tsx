import { ReactNode } from 'react';

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
    <h3 className="text-base font-semibold text-slate-800">{title}</h3>
    {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </div>
);

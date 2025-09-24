import clsx from 'clsx';

type Status = 'draft' | 'active' | 'archived' | 'valid' | 'invalid';

const COLORS: Record<Status, string> = {
  draft: 'bg-slate-100 text-slate-600 border border-slate-200',
  active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  archived: 'bg-slate-100 text-slate-500 border border-slate-200',
  valid: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  invalid: 'bg-red-100 text-red-600 border border-red-200',
};

export const StatusBadge = ({ status, children }: { status: Status; children?: string }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide',
      COLORS[status],
    )}
  >
    <span className="h-2 w-2 rounded-full bg-current opacity-80" />
    {children ?? status}
  </span>
);

export const LoadingState = ({ label = 'Đang tải dữ liệu...' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
    <svg className="h-10 w-10 animate-spin text-primary-500" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <p className="text-sm font-medium text-slate-600">{label}</p>
  </div>
);

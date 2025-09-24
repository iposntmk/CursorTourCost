export const ErrorState = ({ message }: { message?: string }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-600">
    {message ?? 'Có lỗi xảy ra. Vui lòng thử lại sau.'}
  </div>
);

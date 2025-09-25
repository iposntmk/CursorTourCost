import { FormEvent, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useApiKey } from '../../hooks/useApiKey';
import { useToast } from '../../hooks/useToast';

export type ApiKeyDialogProps = {
  open: boolean;
  onClose: () => void;
};

const maskApiKey = (value: string) => {
  if (!value) return '';
  if (value.length <= 8) return '••••••';
  const start = value.slice(0, 4);
  const end = value.slice(-4);
  return `${start}••••${end}`;
};

export const ApiKeyDialog = ({ open, onClose }: ApiKeyDialogProps) => {
  const { apiKey, updateApiKey, clearApiKey } = useApiKey();
  const { showToast } = useToast();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue(apiKey);
      setError('');
    }
  }, [apiKey, open]);

  const maskedKey = useMemo(() => maskApiKey(apiKey), [apiKey]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('API key không được để trống.');
      return;
    }
    if (!/^AIza[0-9A-Za-z_-]{30,}$/.test(trimmed)) {
      setError('API key không đúng định dạng chuẩn của Google.');
      return;
    }
    updateApiKey(trimmed);
    showToast({ message: 'Đã lưu API key thành công.', type: 'success' });
    onClose();
  };

  const handleClear = () => {
    clearApiKey();
    showToast({ message: 'Đã xóa API key đã lưu.', type: 'info' });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/50 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Cấu hình API key Gemini</h2>
          <p className="mt-1 text-sm text-slate-500">
            API key sẽ được lưu cục bộ trong trình duyệt và tự động đính kèm khi gọi Cloud Functions.
          </p>
          {maskedKey ? (
            <p className="mt-2 text-xs text-emerald-600">Đang sử dụng: {maskedKey}</p>
          ) : (
            <p className="mt-2 text-xs text-amber-600">Chưa có API key được lưu.</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-medium text-slate-700">
              API key Gemini
            </label>
            <input
              id="apiKey"
              name="apiKey"
              type="text"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError('');
              }}
              placeholder="Nhập API key dạng AIza..."
              className={clsx(
                'w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200',
                error ? 'border-red-300' : 'border-slate-200',
              )}
              autoComplete="off"
              spellCheck={false}
            />
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600"
            >
              Xóa API key
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
            >
              Lưu API key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

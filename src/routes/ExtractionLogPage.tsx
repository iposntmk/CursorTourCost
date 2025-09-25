import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { useExtractionLog } from '../features/extractions/hooks/useExtractionLog';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import dayjs from '../utils/dayjs';
import { ExtractionRecord } from '../types/extraction';

const ExtractionLogPage = () => {
  const { data, isLoading, isError } = useExtractionLog();
  const [filters, setFilters] = useState({ instruction: '', version: '', rule: '', status: '', time: '' });
  const [selectedLog, setSelectedLog] = useState<ExtractionRecord | null>(null);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((item) => {
      const matchesInstruction = item.instructionId
        .toLowerCase()
        .includes(filters.instruction.toLowerCase());
      const matchesVersion = filters.version
        ? String(item.schemaVersion ?? '').toLowerCase().includes(filters.version.toLowerCase())
        : true;
      const matchesRule = filters.rule
        ? (item.ruleIds?.join(', ') ?? '').toLowerCase().includes(filters.rule.toLowerCase())
        : true;
      const matchesStatus = filters.status
        ? filters.status === 'valid'
          ? item.valid
          : !item.valid
        : true;
      const matchesTime = filters.time
        ? (item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : '')
            .toLowerCase()
            .includes(filters.time.toLowerCase())
        : true;
      return matchesInstruction && matchesVersion && matchesRule && matchesStatus && matchesTime;
    });
  }, [data, filters]);

  const clearFilters = () => setFilters({ instruction: '', version: '', rule: '', status: '', time: '' });

  if (isLoading) return <LoadingState label="Đang tải nhật ký trích xuất..." />;
  if (isError) return <ErrorState message="Không thể tải nhật ký trích xuất." />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Gemini</p>
              <h2 className="text-xl font-semibold text-slate-900">Lịch sử trích xuất</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" description="Thực hiện trích xuất để ghi nhận log." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Hướng dẫn</th>
                    <th className="px-4 py-3">Phiên bản schema</th>
                    <th className="px-4 py-3">Quy tắc</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                  <tr className="bg-white text-xs text-slate-500">
                    <th className="px-4 py-2">
                      <input
                        value={filters.instruction}
                        onChange={(event) => setFilters((prev) => ({ ...prev, instruction: event.target.value }))}
                        placeholder="Lọc hướng dẫn"
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={filters.version}
                        onChange={(event) => setFilters((prev) => ({ ...prev, version: event.target.value }))}
                        placeholder="v..."
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={filters.rule}
                        onChange={(event) => setFilters((prev) => ({ ...prev, rule: event.target.value }))}
                        placeholder="rule-..."
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <select
                        value={filters.status}
                        onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      >
                        <option value="">Tất cả</option>
                        <option value="valid">Hợp lệ</option>
                        <option value="invalid">Không hợp lệ</option>
                      </select>
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={filters.time}
                        onChange={(event) => setFilters((prev) => ({ ...prev, time: event.target.value }))}
                        placeholder="DD/MM/YYYY"
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      />
                    </th>
                    <th className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
                      >
                        Xoá lọc
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredData.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-primary-50/70 cursor-pointer"
                      onClick={() => setSelectedLog(item)}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.instructionId}</td>
                      <td className="px-4 py-3 text-slate-600">v{item.schemaVersion}</td>
                      <td className="px-4 py-3 text-slate-500">{item.ruleIds?.join(', ')}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.valid ? 'valid' : 'invalid'}>
                          {item.valid ? 'Hợp lệ' : 'Không hợp lệ'}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : '—'}</td>
                      <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(item)}
                            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                                navigator.clipboard.writeText(JSON.stringify(item, null, 2));
                              }
                            }}
                            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                          >
                            Sao chép
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {selectedLog ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Chi tiết log</p>
                <h2 className="text-xl font-semibold text-slate-900">{selectedLog.instructionId}</h2>
              </div>
            </CardTitle>
            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
            >
              Đóng
            </button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-600">
              <p><span className="font-semibold">Schema:</span> v{selectedLog.schemaVersion}</p>
              <p>
                <span className="font-semibold">Trạng thái:</span> {selectedLog.valid ? 'Hợp lệ' : 'Không hợp lệ'}
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold">Quy tắc:</span> {selectedLog.ruleIds?.join(', ') || '—'}
              </p>
            </div>
            <textarea
              readOnly
              rows={10}
              value={JSON.stringify(selectedLog, null, 2)}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-700"
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default ExtractionLogPage;

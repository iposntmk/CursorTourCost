import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { useExtractionLog } from '../features/extractions/hooks/useExtractionLog';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import dayjs from '../utils/dayjs';

const ExtractionLogPage = () => {
  const { data, isLoading, isError } = useExtractionLog();

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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.instructionId}</td>
                      <td className="px-4 py-3 text-slate-600">v{item.schemaVersion}</td>
                      <td className="px-4 py-3 text-slate-500">{item.ruleIds?.join(', ')}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.valid ? 'valid' : 'invalid'}>
                          {item.valid ? 'Hợp lệ' : 'Không hợp lệ'}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExtractionLogPage;

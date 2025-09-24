import { useMemo } from 'react';
import { useTours } from '../features/tours/hooks/useTours';
import { useInstructions } from '../features/instructions/hooks/useInstructions';
import { useSchemas } from '../features/schemas/hooks/useSchemas';
import { useExtractionLog } from '../features/extractions/hooks/useExtractionLog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import dayjs, { parseVietnamDate } from '../utils/dayjs';

const DashboardPage = () => {
  const { data: tours, isLoading: loadingTours, isError: toursError } = useTours();
  const { data: instructions, isLoading: loadingInstructions } = useInstructions();
  const { data: schemas } = useSchemas();
  const { data: extractions } = useExtractionLog();

  const upcomingTours = useMemo(() => {
    if (!tours) return [];
    return [...tours]
      .filter((tour) => {
        const start = parseVietnamDate(tour.ngay_bat_dau);
        return start.isValid() && start.isAfter(dayjs().subtract(1, 'day'));
      })
      .sort((a, b) => {
        const startA = parseVietnamDate(a.ngay_bat_dau);
        const startB = parseVietnamDate(b.ngay_bat_dau);
        return startA.valueOf() - startB.valueOf();
      })
      .slice(0, 5);
  }, [tours]);

  if (loadingTours || loadingInstructions) {
    return <LoadingState label="Đang tải tổng quan hệ thống..." />;
  }

  if (toursError) {
    return <ErrorState message="Không thể tải danh sách tour." />;
  }

  const activeSchemaCount = schemas?.filter((schema) => schema.status === 'active').length ?? 0;
  const publishedInstructions = instructions?.filter((instruction) => instruction.status === 'active').length ?? 0;
  const totalExtractions = extractions?.length ?? 0;
  const validExtractions = extractions?.filter((item) => item.valid).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Tour nội bộ</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{tours?.length ?? 0}</p>
            <p className="mt-1 text-sm text-slate-500">Tổng số tour đã lưu trong Firestore</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Prompt Active</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{publishedInstructions}</p>
            <p className="mt-1 text-sm text-slate-500">Instruction đang active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Schema Active</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{activeSchemaCount}</p>
            <p className="mt-1 text-sm text-slate-500">Schema kiểm tra JSON đang sử dụng</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Extraction Valid</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{validExtractions}</p>
            <p className="mt-1 text-sm text-slate-500">/{totalExtractions} lần gọi Gemini thành công</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Sắp diễn ra</p>
                <h2 className="text-xl font-semibold text-slate-900">Lịch tour trong tuần</h2>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTours.length === 0 ? (
              <EmptyState title="Chưa có tour sắp tới" description="Tạo tour mới hoặc nhập từ Gemini." />
            ) : (
              <ul className="space-y-3">
                {upcomingTours.map((tour) => (
                  <li key={tour.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{tour.thong_tin_chung.ma_tour || 'Tour nội bộ'}</p>
                        <p className="text-xs text-slate-500">
                          {tour.thong_tin_chung.ten_cong_ty || 'Khách lẻ'} • {tour.thong_tin_chung.ten_guide || 'Chưa có hướng dẫn'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-700">{tour.ngay_bat_dau}</p>
                        <p className="text-xs text-slate-500">{tour.tong_so_ngay_tour} ngày</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Gemini Extraction</p>
                <h2 className="text-xl font-semibold text-slate-900">Lịch sử gần đây</h2>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {extractions && extractions.length > 0 ? (
              <div className="space-y-3">
                {extractions.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.instructionId}</p>
                        <p className="text-xs text-slate-500">Schema v{item.schemaVersion} • Prompt v{item.promptVersion}</p>
                      </div>
                      <StatusBadge status={item.valid ? 'valid' : 'invalid'}>
                        {item.valid ? 'Valid' : 'Invalid'}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : '—'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có lịch sử" description="Chạy thử quy trình AI Extraction để xem log." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

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
import { Accordion } from '../components/common/Accordion';
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
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Prompt đang dùng</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{publishedInstructions}</p>
            <p className="mt-1 text-sm text-slate-500">Hướng dẫn đang hoạt động</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Schema đang dùng</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">{activeSchemaCount}</p>
            <p className="mt-1 text-sm text-slate-500">Schema kiểm tra JSON đang áp dụng</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Trích xuất hợp lệ</p>
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
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Trích xuất Gemini</p>
                <h2 className="text-xl font-semibold text-slate-900">Nhật ký gần đây</h2>
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
                        {item.valid ? 'Hợp lệ' : 'Không hợp lệ'}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : '—'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có lịch sử" description="Chạy thử quy trình trích xuất AI để xem nhật ký." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accordion Demo Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Thông tin chi tiết</p>
              <h2 className="text-xl font-semibold text-slate-900">Tổng quan hệ thống</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion defaultOpenItems={[0]}>
            <Accordion.Item title="📊 Thống kê tổng quan">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Tours trong hệ thống</h4>
                    <p className="text-sm text-blue-700">
                      Tổng cộng có <strong>{tours?.length ?? 0}</strong> tour đã được lưu trữ trong Firestore.
                      Trong đó có <strong>{upcomingTours.length}</strong> tour sắp diễn ra trong tuần tới.
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4">
                    <h4 className="font-semibold text-green-900 mb-2">Tình trạng AI Extraction</h4>
                    <p className="text-sm text-green-700">
                      Tỷ lệ thành công: <strong>{totalExtractions > 0 ? Math.round((validExtractions / totalExtractions) * 100) : 0}%</strong>
                      <br />
                      ({validExtractions}/{totalExtractions} lần gọi API thành công)
                    </p>
                  </div>
                </div>
              </div>
            </Accordion.Item>
            
            <Accordion.Item title="⚙️ Cấu hình hệ thống">
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Prompt và Schema đang sử dụng</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Prompt Templates:</p>
                      <p className="text-lg font-bold text-slate-900">{publishedInstructions}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">JSON Schemas:</p>
                      <p className="text-lg font-bold text-slate-900">{activeSchemaCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Accordion.Item>
            
            <Accordion.Item title="📝 Lịch sử hoạt động gần đây">
              <div className="space-y-3">
                {extractions && extractions.length > 0 ? (
                  <>
                    <p className="text-sm text-slate-600 mb-3">
                      Dưới đây là các hoạt động trích xuất AI gần đây nhất:
                    </p>
                    {extractions.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900">{item.instructionId}</p>
                          <p className="text-xs text-slate-500">
                            Schema v{item.schemaVersion} • Prompt v{item.promptVersion}
                          </p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={item.valid ? 'valid' : 'invalid'}>
                            {item.valid ? 'Hợp lệ' : 'Không hợp lệ'}
                          </StatusBadge>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.createdAt ? dayjs(item.createdAt).format('DD/MM HH:mm') : '—'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-6 text-slate-500">
                    <p>Chưa có hoạt động nào gần đây</p>
                    <p className="text-sm">Hãy thử sử dụng tính năng AI Extraction để xem nhật ký</p>
                  </div>
                )}
              </div>
            </Accordion.Item>
            
            <Accordion.Item title="🔧 Hướng dẫn sử dụng">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <h4 className="font-semibold text-amber-900 mb-2">Tạo tour mới</h4>
                    <p className="text-sm text-amber-800">
                      1. Vào trang "Tour Editor"<br />
                      2. Nhập thông tin tour cơ bản<br />
                      3. Sử dụng AI Extraction để tự động điền dữ liệu<br />
                      4. Lưu tour vào Firestore
                    </p>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">Quản lý Schema</h4>
                    <p className="text-sm text-purple-800">
                      1. Vào trang "Schema Editor"<br />
                      2. Tạo JSON schema mới<br />
                      3. Kích hoạt schema để sử dụng<br />
                      4. Schema sẽ được dùng để validate dữ liệu
                    </p>
                  </div>
                </div>
              </div>
            </Accordion.Item>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;

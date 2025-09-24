import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { useTours } from '../features/tours/hooks/useTours';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { calculateCostTotals } from '../features/tours/utils';
import { EmptyState } from '../components/common/EmptyState';
import { TourData } from '../types/tour';

const buildTourSheet = (sheet: ExcelJS.Worksheet, tour: TourData) => {
  sheet.addRow(['Mã tour', tour.thong_tin_chung.ma_tour]);
  sheet.addRow(['Công ty', tour.thong_tin_chung.ten_cong_ty]);
  sheet.addRow(['Hướng dẫn viên', tour.thong_tin_chung.ten_guide]);
  sheet.addRow(['Ngày', `${tour.ngay_bat_dau} - ${tour.ngay_ket_thuc}`]);
  sheet.addRow(['Số khách', tour.thong_tin_chung.so_luong_khach]);
  sheet.addRow([]);
  sheet.addRow(['Chi phí']);
  sheet.addRow(['Ngày', 'Loại', 'Tên', 'Số lượng', 'Đơn giá', 'Thành tiền']);
  tour.danh_sach_chi_phi.forEach((item: any) =>
    sheet.addRow([item.ngay, item.loai, item.ten, item.so_luong, item.don_gia, item.thanh_tien]),
  );
  const totals = calculateCostTotals(tour);
  sheet.addRow([]);
  sheet.addRow(['Tổng cộng', totals.grandTotal]);
};

const ReportsPage = () => {
  const { data, isLoading, isError } = useTours();

  const exportAllTours = async () => {
    if (!data || data.length === 0) {
      window.alert('Không có tour để xuất');
      return;
    }
    const workbook = new ExcelJS.Workbook();
    data.forEach((tour) => {
      const sheet = workbook.addWorksheet(tour.thong_tin_chung.ma_tour || 'Tour');
      buildTourSheet(sheet, tour);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'tours-report.xlsx');
  };

  if (isLoading) return <LoadingState label="Đang tải tour..." />;
  if (isError) return <ErrorState message="Không thể tải tour" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Báo cáo</p>
              <h2 className="text-xl font-semibold text-slate-900">Xuất Excel tổng hợp</h2>
            </div>
          </CardTitle>
          <button
            type="button"
            onClick={exportAllTours}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
          >
            Xuất toàn bộ tour
          </button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Tính năng này cho phép xuất toàn bộ tour thành file Excel với mỗi tour là một sheet. Bạn cũng có thể vào từng tour để xuất file chi tiết.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Danh sách tour</p>
              <h2 className="text-xl font-semibold text-slate-900">Chọn tour để xuất nhanh</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.length === 0 ? (
            <EmptyState title="Chưa có tour" description="Tạo tour mới hoặc đồng bộ từ Gemini." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.map((tour) => (
                <div key={tour.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{tour.thong_tin_chung.ma_tour || 'Tour'}</p>
                      <p className="text-xs text-slate-500">
                        {tour.thong_tin_chung.ten_cong_ty || 'Khách lẻ'} • {tour.ngay_bat_dau} → {tour.ngay_ket_thuc}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const workbook = new ExcelJS.Workbook();
                        const sheet = workbook.addWorksheet(tour.thong_tin_chung.ma_tour || 'Tour');
                        buildTourSheet(sheet, tour);
                        const buffer = await workbook.xlsx.writeBuffer();
                        saveAs(new Blob([buffer]), `${tour.thong_tin_chung.ma_tour || 'tour'}.xlsx`);
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                    >
                      Xuất Excel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card';
import { EmptyState } from '../../../components/common/EmptyState';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { useTourMutations, useTours } from '../hooks/useTours';
import { calculateCostTotals } from '../utils';
import { formatVietnamDate } from '../../../utils/dayjs';
import { Pencil, Plus, Trash2 } from 'lucide-react';

export const TourList = () => {
  const { data, isLoading, isError } = useTours();
  const { remove } = useTourMutations();

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá tour này?')) return;
    await remove.mutateAsync(id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Tour nội bộ</p>
            <h2 className="text-xl font-semibold text-slate-900">Danh sách tour</h2>
          </div>
        </CardTitle>
        <Link
          to="/tours/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          <Plus className="h-4 w-4" /> Tạo tour mới
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? <LoadingState /> : null}
        {isError ? <ErrorState /> : null}
        {!isLoading && !isError && data && data.length === 0 ? (
          <EmptyState title="Chưa có tour" description="Hãy tạo tour mới hoặc đồng bộ từ Gemini." />
        ) : null}
        {!isLoading && !isError && data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Mã tour</th>
                  <th className="px-4 py-3">Công ty</th>
                  <th className="px-4 py-3">Hướng dẫn viên</th>
                  <th className="px-4 py-3">Ngày</th>
                  <th className="px-4 py-3 text-right">Tổng chi phí</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data?.map((tour) => {
                  const totals = calculateCostTotals(tour);
                  return (
                    <tr key={tour.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-slate-900">{tour.thong_tin_chung.ma_tour || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{tour.thong_tin_chung.ten_cong_ty || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{tour.thong_tin_chung.ten_guide || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatVietnamDate(tour.ngay_bat_dau)} - {formatVietnamDate(tour.ngay_ket_thuc)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {totals.grandTotal.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/tours/${tour.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
                          >
                            <Pencil className="h-4 w-4" /> Sửa
                          </Link>
                          <button
                            type="button"
                            onClick={() => tour.id && handleDelete(tour.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" /> Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

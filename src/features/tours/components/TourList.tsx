import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card';
import { EmptyState } from '../../../components/common/EmptyState';
import { LoadingState } from '../../../components/common/LoadingState';
import { ErrorState } from '../../../components/common/ErrorState';
import { useTourMutations, useTours } from '../hooks/useTours';
import { calculateCostTotals } from '../utils';
import { formatVietnamDate } from '../../../utils/dayjs';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { TourData } from '../../../types/tour';
import { useToast } from '../../../hooks/useToast';

export const TourList = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTours();
  const { create, remove } = useTourMutations();
  const { showToast } = useToast();
  const [filters, setFilters] = useState({
    code: '',
    company: '',
    guide: '',
    date: '',
    total: '',
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá tour này?')) return;
    await remove.mutateAsync(id);
  };

  const handleDuplicate = async (tour: TourData) => {
    const payload: TourData = { ...tour };
    delete (payload as Partial<TourData>).id;
    delete (payload as Partial<TourData>).createdAt;
    delete (payload as Partial<TourData>).updatedAt;
    const duplicate: TourData = {
      ...payload,
      thong_tin_chung: {
        ...payload.thong_tin_chung,
        ma_tour: `${tour.thong_tin_chung.ma_tour || 'TOUR'}-copy`,
      },
    };
    try {
      await create.mutateAsync(duplicate);
      showToast({ message: 'Đã nhân bản tour.', type: 'success' });
    } catch (error) {
      showToast({ message: (error as Error).message || 'Không thể nhân bản tour.', type: 'error' });
    }
  };

  const filteredTours = useMemo(() => {
    if (!data) return [];
    return data.filter((tour) => {
      const totals = calculateCostTotals(tour);
      const matchesCode = (tour.thong_tin_chung.ma_tour || '').toLowerCase().includes(filters.code.toLowerCase());
      const matchesCompany = (tour.thong_tin_chung.ten_cong_ty || '').toLowerCase().includes(filters.company.toLowerCase());
      const matchesGuide = (tour.thong_tin_chung.ten_guide || '').toLowerCase().includes(filters.guide.toLowerCase());
      const rangeText = `${formatVietnamDate(tour.ngay_bat_dau)} - ${formatVietnamDate(tour.ngay_ket_thuc)}`.toLowerCase();
      const matchesDate = rangeText.includes(filters.date.toLowerCase());
      const matchesTotal = filters.total
        ? totals.grandTotal.toString().toLowerCase().includes(filters.total.toLowerCase())
        : true;
      return matchesCode && matchesCompany && matchesGuide && matchesDate && matchesTotal;
    });
  }, [data, filters]);

  const clearFilters = () =>
    setFilters({
      code: '',
      company: '',
      guide: '',
      date: '',
      total: '',
    });

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
          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Mã tour</th>
                  <th className="px-4 py-3">Công ty</th>
                  <th className="px-4 py-3">Hướng dẫn viên</th>
                  <th className="px-4 py-3">Ngày</th>
                  <th className="px-4 py-3 text-right">Tổng chi phí</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
                <tr className="bg-white text-xs text-slate-500">
                  <th className="px-4 py-2">
                    <input
                      value={filters.code}
                      onChange={(event) => setFilters((prev) => ({ ...prev, code: event.target.value }))}
                      placeholder="Lọc mã tour"
                      className="w-full rounded-md border border-slate-200 px-2 py-1"
                    />
                  </th>
                  <th className="px-4 py-2">
                    <input
                      value={filters.company}
                      onChange={(event) => setFilters((prev) => ({ ...prev, company: event.target.value }))}
                      placeholder="Lọc công ty"
                      className="w-full rounded-md border border-slate-200 px-2 py-1"
                    />
                  </th>
                  <th className="px-4 py-2">
                    <input
                      value={filters.guide}
                      onChange={(event) => setFilters((prev) => ({ ...prev, guide: event.target.value }))}
                      placeholder="Lọc hướng dẫn"
                      className="w-full rounded-md border border-slate-200 px-2 py-1"
                    />
                  </th>
                  <th className="px-4 py-2">
                    <input
                      value={filters.date}
                      onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
                      placeholder="Lọc ngày"
                      className="w-full rounded-md border border-slate-200 px-2 py-1"
                    />
                  </th>
                  <th className="px-4 py-2">
                    <input
                      value={filters.total}
                      onChange={(event) => setFilters((prev) => ({ ...prev, total: event.target.value }))}
                      placeholder="Lọc tổng"
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
                {filteredTours.map((tour) => {
                  const totals = calculateCostTotals(tour);
                  return (
                    <tr
                      key={tour.id}
                      className="hover:bg-primary-50/70 cursor-pointer"
                      onClick={() => tour.id && navigate(`/tours/${tour.id}`)}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">{tour.thong_tin_chung.ma_tour || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{tour.thong_tin_chung.ten_cong_ty || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{tour.thong_tin_chung.ten_guide || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatVietnamDate(tour.ngay_bat_dau)} - {formatVietnamDate(tour.ngay_ket_thuc)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {totals.grandTotal.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/tours/${tour.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
                          >
                            Xem
                          </Link>
                          <Link
                            to={`/tours/${tour.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
                          >
                            <Pencil className="h-4 w-4" /> Sửa
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(tour)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
                          >
                            Nhân bản
                          </button>
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

import { ensureArray, normalizeNumber } from '../tours/utils';
import { TourData, createEmptyTour } from '../../types/tour';

const ensureString = (value: unknown) => (typeof value === 'string' ? value : '');

export const normalizeAiTour = (raw: unknown): TourData => {
  const base = createEmptyTour();
  if (!raw || typeof raw !== 'object') return base;
  const source = raw as Record<string, unknown>;

  const thongTinChung = source.thong_tin_chung as Record<string, unknown> | undefined;

  base.thong_tin_chung = {
    ma_tour: ensureString(thongTinChung?.ma_tour || source.tourCode),
    ten_cong_ty: ensureString(thongTinChung?.ten_cong_ty || source.companyName),
    ten_guide: ensureString(thongTinChung?.ten_guide || source.guideName),
    ten_khach: ensureString(thongTinChung?.ten_khach || source.customerName),
    quoc_tich_khach: ensureString(thongTinChung?.quoc_tich_khach || source.customerNationality),
    so_luong_khach: normalizeNumber(thongTinChung?.so_luong_khach || source.customerCount),
    ten_lai_xe: ensureString(thongTinChung?.ten_lai_xe || source.driverName),
    so_dien_thoai_khach: ensureString(thongTinChung?.so_dien_thoai_khach || source.customerPhone),
  };

  base.ngay_bat_dau = ensureString(source.ngay_bat_dau || source.startDate);
  base.ngay_ket_thuc = ensureString(source.ngay_ket_thuc || source.endDate);
  base.tong_so_ngay_tour = normalizeNumber(source.tong_so_ngay_tour || source.totalDays);

  base.danh_sach_ngay_tham_quan = ensureArray(source.danh_sach_ngay_tham_quan || source.itineraryDays).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay || (item as Record<string, unknown>)?.date),
    tinh_thanh: ensureString((item as Record<string, unknown>)?.tinh_thanh || (item as Record<string, unknown>)?.province),
  }));

  base.danh_sach_dia_diem = ensureArray(source.danh_sach_dia_diem || source.attractions).map((item) => ({
    ten_dia_diem: ensureString((item as Record<string, unknown>)?.ten_dia_diem || (item as Record<string, unknown>)?.name),
    gia_ve: normalizeNumber((item as Record<string, unknown>)?.gia_ve || (item as Record<string, unknown>)?.ticketPrice),
    ten_tinh: ensureString((item as Record<string, unknown>)?.ten_tinh || (item as Record<string, unknown>)?.province),
  }));

  base.danh_sach_chi_phi = ensureArray(source.danh_sach_chi_phi || source.expenses).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay || (item as Record<string, unknown>)?.date),
    loai: ensureString((item as Record<string, unknown>)?.loai || (item as Record<string, unknown>)?.type),
    ten: ensureString((item as Record<string, unknown>)?.ten || (item as Record<string, unknown>)?.name),
    so_luong: normalizeNumber((item as Record<string, unknown>)?.so_luong || (item as Record<string, unknown>)?.quantity),
    don_gia: normalizeNumber((item as Record<string, unknown>)?.don_gia || (item as Record<string, unknown>)?.unitPrice),
    thanh_tien: normalizeNumber((item as Record<string, unknown>)?.thanh_tien || (item as Record<string, unknown>)?.totalAmount),
    ghi_chu: ensureString((item as Record<string, unknown>)?.ghi_chu || (item as Record<string, unknown>)?.note),
  }));

  const an = source.an as Record<string, unknown> | undefined;
  const meals = source.meals as Record<string, unknown> | undefined;
  
  base.an.an_trua = ensureArray(an?.an_trua || meals?.lunch).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay || (item as Record<string, unknown>)?.date),
    ten: ensureString((item as Record<string, unknown>)?.ten || (item as Record<string, unknown>)?.name),
    so_luong: normalizeNumber((item as Record<string, unknown>)?.so_luong || (item as Record<string, unknown>)?.quantity),
    don_gia: normalizeNumber((item as Record<string, unknown>)?.don_gia || (item as Record<string, unknown>)?.unitPrice),
    thanh_tien: normalizeNumber((item as Record<string, unknown>)?.thanh_tien || (item as Record<string, unknown>)?.totalAmount),
  }));

  base.an.an_toi = ensureArray(an?.an_toi || meals?.dinner).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay || (item as Record<string, unknown>)?.date),
    ten: ensureString((item as Record<string, unknown>)?.ten || (item as Record<string, unknown>)?.name),
    so_luong: normalizeNumber((item as Record<string, unknown>)?.so_luong || (item as Record<string, unknown>)?.quantity),
    don_gia: normalizeNumber((item as Record<string, unknown>)?.don_gia || (item as Record<string, unknown>)?.unitPrice),
    thanh_tien: normalizeNumber((item as Record<string, unknown>)?.thanh_tien || (item as Record<string, unknown>)?.totalAmount),
  }));

  base.khach_san = ensureArray(source.khach_san || source.hotels).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay || (item as Record<string, unknown>)?.date),
    ten: ensureString((item as Record<string, unknown>)?.ten || (item as Record<string, unknown>)?.name),
    dia_chi: ensureString((item as Record<string, unknown>)?.dia_chi || (item as Record<string, unknown>)?.address),
    so_dien_thoai: ensureString((item as Record<string, unknown>)?.so_dien_thoai || (item as Record<string, unknown>)?.phone),
  }));

  const tip = source.tip as Record<string, unknown> | undefined;
  base.tip = {
    co_tip: Boolean(tip?.co_tip || source.hasTip),
    so_tien_tip: normalizeNumber(tip?.so_tien_tip || source.tipAmount),
  };

  base.ghi_chu = ensureString(source.ghi_chu || source.notes);

  return base;
};

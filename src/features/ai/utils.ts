import { ensureArray, normalizeNumber } from '../tours/utils';
import { TourData, createEmptyTour } from '../../types/tour';

const ensureString = (value: unknown) => (typeof value === 'string' ? value : '');

export const normalizeAiTour = (raw: unknown): TourData => {
  const base = createEmptyTour();
  if (!raw || typeof raw !== 'object') return base;
  const source = raw as Record<string, unknown>;

  const thongTinChung = source.thong_tin_chung as Record<string, unknown> | undefined;

  base.thong_tin_chung = {
    ma_tour: ensureString(thongTinChung?.ma_tour),
    ten_cong_ty: ensureString(thongTinChung?.ten_cong_ty),
    ten_guide: ensureString(thongTinChung?.ten_guide),
    ten_khach: ensureString(thongTinChung?.ten_khach),
    quoc_tich_khach: ensureString(thongTinChung?.quoc_tich_khach),
    so_luong_khach: normalizeNumber(thongTinChung?.so_luong_khach),
    ten_lai_xe: ensureString(thongTinChung?.ten_lai_xe),
    so_dien_thoai_khach: ensureString(thongTinChung?.so_dien_thoai_khach),
  };

  base.ngay_bat_dau = ensureString(source.ngay_bat_dau);
  base.ngay_ket_thuc = ensureString(source.ngay_ket_thuc);
  base.tong_so_ngay_tour = normalizeNumber(source.tong_so_ngay_tour);

  base.danh_sach_ngay_tham_quan = ensureArray(source.danh_sach_ngay_tham_quan).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay),
    tinh_thanh: ensureString((item as Record<string, unknown>)?.tinh_thanh),
  }));

  base.danh_sach_dia_diem = ensureArray(source.danh_sach_dia_diem).map((item) => ({
    ten_dia_diem: ensureString((item as Record<string, unknown>)?.ten_dia_diem),
    gia_ve: normalizeNumber((item as Record<string, unknown>)?.gia_ve),
    ten_tinh: ensureString((item as Record<string, unknown>)?.ten_tinh),
  }));

  base.danh_sach_chi_phi = ensureArray(source.danh_sach_chi_phi).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay),
    loai: ensureString((item as Record<string, unknown>)?.loai),
    ten: ensureString((item as Record<string, unknown>)?.ten),
    so_luong: normalizeNumber((item as Record<string, unknown>)?.so_luong),
    don_gia: normalizeNumber((item as Record<string, unknown>)?.don_gia),
    thanh_tien: normalizeNumber((item as Record<string, unknown>)?.thanh_tien),
    ghi_chu: ensureString((item as Record<string, unknown>)?.ghi_chu),
  }));

  const an = source.an as Record<string, unknown> | undefined;
  base.an.an_trua = ensureArray(an?.an_trua).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay),
    ten: ensureString((item as Record<string, unknown>)?.ten),
    so_luong: normalizeNumber((item as Record<string, unknown>)?.so_luong),
    don_gia: normalizeNumber((item as Record<string, unknown>)?.don_gia),
    thanh_tien: normalizeNumber((item as Record<string, unknown>)?.thanh_tien),
  }));

  base.an.an_toi = ensureArray(an?.an_toi).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay),
    ten: ensureString((item as Record<string, unknown>)?.ten),
    so_luong: normalizeNumber((item as Record<string, unknown>)?.so_luong),
    don_gia: normalizeNumber((item as Record<string, unknown>)?.don_gia),
    thanh_tien: normalizeNumber((item as Record<string, unknown>)?.thanh_tien),
  }));

  base.khach_san = ensureArray(source.khach_san).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay),
    ten: ensureString((item as Record<string, unknown>)?.ten),
    dia_chi: ensureString((item as Record<string, unknown>)?.dia_chi),
    so_dien_thoai: ensureString((item as Record<string, unknown>)?.so_dien_thoai),
  }));

  const tip = source.tip as Record<string, unknown> | undefined;
  base.tip = {
    co_tip: Boolean(tip?.co_tip),
    so_tien_tip: normalizeNumber(tip?.so_tien_tip),
  };

  base.ghi_chu = ensureString(source.ghi_chu);

  return base;
};

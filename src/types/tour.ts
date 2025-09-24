export type NgayThamQuan = {
  ngay: string;
  tinh_thanh: string;
};

export type DiaDiemThamQuan = {
  ten_dia_diem: string;
  gia_ve: number;
  ten_tinh: string;
};

export type ChiPhiItem = {
  ngay: string;
  loai: string;
  ten: string;
  so_luong: number;
  don_gia: number;
  thanh_tien: number;
  ghi_chu: string;
};

export type AnBuaItem = {
  ngay: string;
  ten: string;
  so_luong: number;
  don_gia: number;
  thanh_tien: number;
};

export type KhachSanItem = {
  ngay: string;
  ten: string;
  dia_chi: string;
  so_dien_thoai: string;
};

export type TourThongTinChung = {
  ma_tour: string;
  ten_cong_ty: string;
  ten_guide: string;
  ten_khach: string;
  quoc_tich_khach: string;
  so_luong_khach: number;
  ten_lai_xe: string;
  so_dien_thoai_khach: string;
};

export type TourTip = {
  co_tip: boolean;
  so_tien_tip: number;
};

export type TourAn = {
  an_trua: AnBuaItem[];
  an_toi: AnBuaItem[];
};

export type TourData = {
  id?: string;
  thong_tin_chung: TourThongTinChung;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  tong_so_ngay_tour: number;
  danh_sach_ngay_tham_quan: NgayThamQuan[];
  danh_sach_dia_diem: DiaDiemThamQuan[];
  danh_sach_chi_phi: ChiPhiItem[];
  an: TourAn;
  khach_san: KhachSanItem[];
  tip: TourTip;
  ghi_chu: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  lastEditedBy?: string;
};

export const defaultThongTinChung: TourThongTinChung = {
  ma_tour: '',
  ten_cong_ty: '',
  ten_guide: '',
  ten_khach: '',
  quoc_tich_khach: '',
  so_luong_khach: 0,
  ten_lai_xe: '',
  so_dien_thoai_khach: '',
};

export const createEmptyTour = (): TourData => ({
  thong_tin_chung: { ...defaultThongTinChung },
  ngay_bat_dau: '',
  ngay_ket_thuc: '',
  tong_so_ngay_tour: 0,
  danh_sach_ngay_tham_quan: [],
  danh_sach_dia_diem: [],
  danh_sach_chi_phi: [],
  an: {
    an_trua: [],
    an_toi: [],
  },
  khach_san: [],
  tip: {
    co_tip: false,
    so_tien_tip: 0,
  },
  ghi_chu: '',
});

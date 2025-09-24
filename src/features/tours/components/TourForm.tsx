import { ChangeEvent } from 'react';
import { TourData } from '../../../types/tour';
import { MasterDataRecord, MasterDataType } from '../../../types/masterData';
import { calculateCostTotals } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/common/Card';
import { Plus, Trash2 } from 'lucide-react';

export type TourFormProps = {
  value: TourData;
  onChange: (value: TourData) => void;
  masterData: Partial<Record<MasterDataType, MasterDataRecord[]>>;
};

const numberField = (event: ChangeEvent<HTMLInputElement>) => Number(event.target.value || 0);

export const TourForm = ({ value, onChange, masterData }: TourFormProps) => {
  const totals = calculateCostTotals(value);

  const update = (partial: Partial<TourData>) => onChange({ ...value, ...partial });

  const handleThongTinChange = (field: keyof TourData['thong_tin_chung'], val: string | number) => {
    update({
      thong_tin_chung: {
        ...value.thong_tin_chung,
        [field]: val,
      },
    });
  };

  const handleNgayChange = (index: number, field: 'ngay' | 'tinh_thanh', val: string) => {
    const list = value.danh_sach_ngay_tham_quan.map((item, idx) =>
      idx === index ? { ...item, [field]: val } : item,
    );
    update({ danh_sach_ngay_tham_quan: list });
  };

  const handleDiaDiemChange = (index: number, field: 'ten_dia_diem' | 'gia_ve' | 'ten_tinh', val: string | number) => {
    const list = value.danh_sach_dia_diem.map((item, idx) =>
      idx === index ? { ...item, [field]: val } : item,
    );
    update({ danh_sach_dia_diem: list });
  };

  const handleChiPhiChange = (
    index: number,
    field: 'ngay' | 'loai' | 'ten' | 'so_luong' | 'don_gia' | 'thanh_tien' | 'ghi_chu',
    val: string | number,
  ) => {
    const list = value.danh_sach_chi_phi.map((item, idx) => {
      if (idx !== index) return item;
      const next = { ...item, [field]: val };
      if (field === 'so_luong' || field === 'don_gia') {
        const so_luong = Number(field === 'so_luong' ? val : next.so_luong ?? 0);
        const don_gia = Number(field === 'don_gia' ? val : next.don_gia ?? 0);
        next.thanh_tien = so_luong * don_gia;
      }
      return next;
    });
    update({ danh_sach_chi_phi: list });
  };

  const handleBuaAnChange = (
    type: 'an_trua' | 'an_toi',
    index: number,
    field: 'ngay' | 'ten' | 'so_luong' | 'don_gia' | 'thanh_tien',
    val: string | number,
  ) => {
    const list = value.an[type].map((item, idx) => {
      if (idx !== index) return item;
      const next = { ...item, [field]: val };
      if (field === 'so_luong' || field === 'don_gia') {
        const so_luong = Number(field === 'so_luong' ? val : next.so_luong ?? 0);
        const don_gia = Number(field === 'don_gia' ? val : next.don_gia ?? 0);
        next.thanh_tien = so_luong * don_gia;
      }
      return next;
    });
    update({ an: { ...value.an, [type]: list } });
  };

  const handleKhachSanChange = (index: number, field: 'ngay' | 'ten' | 'dia_chi' | 'so_dien_thoai', val: string) => {
    const list = value.khach_san.map((item, idx) => (idx === index ? { ...item, [field]: val } : item));
    update({ khach_san: list });
  };

  const addNgay = () => update({ danh_sach_ngay_tham_quan: [...value.danh_sach_ngay_tham_quan, { ngay: '', tinh_thanh: '' }] });
  const removeNgay = (index: number) =>
    update({ danh_sach_ngay_tham_quan: value.danh_sach_ngay_tham_quan.filter((_, idx) => idx !== index) });

  const addDiaDiem = () =>
    update({ danh_sach_dia_diem: [...value.danh_sach_dia_diem, { ten_dia_diem: '', gia_ve: 0, ten_tinh: '' }] });
  const removeDiaDiem = (index: number) =>
    update({ danh_sach_dia_diem: value.danh_sach_dia_diem.filter((_, idx) => idx !== index) });

  const addChiPhi = () =>
    update({
      danh_sach_chi_phi: [
        ...value.danh_sach_chi_phi,
        { ngay: '', loai: '', ten: '', so_luong: 0, don_gia: 0, thanh_tien: 0, ghi_chu: '' },
      ],
    });
  const removeChiPhi = (index: number) =>
    update({ danh_sach_chi_phi: value.danh_sach_chi_phi.filter((_, idx) => idx !== index) });

  const addBuaAn = (type: 'an_trua' | 'an_toi') =>
    update({
      an: {
        ...value.an,
        [type]: [...value.an[type], { ngay: '', ten: '', so_luong: 0, don_gia: 0, thanh_tien: 0 }],
      },
    });

  const removeBuaAn = (type: 'an_trua' | 'an_toi', index: number) =>
    update({ an: { ...value.an, [type]: value.an[type].filter((_, idx) => idx !== index) } });

  const addKhachSan = () => update({ khach_san: [...value.khach_san, { ngay: '', ten: '', dia_chi: '', so_dien_thoai: '' }] });
  const removeKhachSan = (index: number) =>
    update({ khach_san: value.khach_san.filter((_, idx) => idx !== index) });

  const datalist = (id: string, values: MasterDataRecord[] = []) => (
    <datalist id={id}>
      {values.map((item) => (
        <option key={item.id ?? item.name} value={String(item.name)}>
          {item.name}
        </option>
      ))}
    </datalist>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Bước 1</p>
              <h2 className="text-xl font-semibold text-slate-900">Thông tin chung</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Mã tour</label>
              <input
                value={value.thong_tin_chung.ma_tour}
                onChange={(event) => handleThongTinChange('ma_tour', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tên công ty</label>
              <input
                value={value.thong_tin_chung.ten_cong_ty}
                list="companies"
                onChange={(event) => handleThongTinChange('ten_cong_ty', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
              {datalist('companies', masterData.companies)}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tên hướng dẫn viên</label>
              <input
                value={value.thong_tin_chung.ten_guide}
                list="guides"
                onChange={(event) => handleThongTinChange('ten_guide', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
              {datalist('guides', masterData.guides)}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tên khách</label>
              <input
                value={value.thong_tin_chung.ten_khach}
                onChange={(event) => handleThongTinChange('ten_khach', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Quốc tịch khách</label>
              <input
                value={value.thong_tin_chung.quoc_tich_khach}
                list="nationalities"
                onChange={(event) => handleThongTinChange('quoc_tich_khach', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
              {datalist('nationalities', masterData.nationalities)}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Số lượng khách</label>
              <input
                type="number"
                value={value.thong_tin_chung.so_luong_khach}
                onChange={(event) => handleThongTinChange('so_luong_khach', numberField(event))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tên lái xe</label>
              <input
                value={value.thong_tin_chung.ten_lai_xe}
                onChange={(event) => handleThongTinChange('ten_lai_xe', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Số điện thoại khách</label>
              <input
                value={value.thong_tin_chung.so_dien_thoai_khach}
                onChange={(event) => handleThongTinChange('so_dien_thoai_khach', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Ngày bắt đầu</label>
              <input
                value={value.ngay_bat_dau}
                onChange={(event) => update({ ngay_bat_dau: event.target.value })}
                placeholder="dd/mm/yyyy"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Ngày kết thúc</label>
              <input
                value={value.ngay_ket_thuc}
                onChange={(event) => update({ ngay_ket_thuc: event.target.value })}
                placeholder="dd/mm/yyyy"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tổng số ngày tour</label>
              <input
                type="number"
                value={value.tong_so_ngay_tour}
                onChange={(event) => update({ tong_so_ngay_tour: numberField(event) })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Bước 2</p>
              <h2 className="text-xl font-semibold text-slate-900">Lịch tham quan</h2>
            </div>
          </CardTitle>
          <button
            type="button"
            onClick={addNgay}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
          >
            <Plus className="h-4 w-4" /> Thêm ngày
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {value.danh_sach_ngay_tham_quan.map((item, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Ngày</label>
                    <input
                      value={item.ngay}
                      onChange={(event) => handleNgayChange(index, 'ngay', event.target.value)}
                      placeholder="dd/mm/yyyy"
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Tỉnh/Thành</label>
                    <input
                      value={item.tinh_thanh}
                      list="provinces"
                      onChange={(event) => handleNgayChange(index, 'tinh_thanh', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                    {datalist('provinces', masterData.provinces)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNgay(index)}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {value.danh_sach_ngay_tham_quan.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có lịch tham quan. Nhấn "Thêm ngày" để tạo.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Bước 3</p>
              <h2 className="text-xl font-semibold text-slate-900">Địa điểm tham quan</h2>
            </div>
          </CardTitle>
          <button
            type="button"
            onClick={addDiaDiem}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
          >
            <Plus className="h-4 w-4" /> Thêm địa điểm
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {value.danh_sach_dia_diem.map((item, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Tên địa điểm</label>
                    <input
                      value={item.ten_dia_diem}
                      list="locations"
                      onChange={(event) => handleDiaDiemChange(index, 'ten_dia_diem', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                    {datalist('locations', masterData.locations)}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Giá vé</label>
                    <input
                      type="number"
                      value={item.gia_ve}
                      onChange={(event) => handleDiaDiemChange(index, 'gia_ve', numberField(event))}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Thuộc tỉnh</label>
                    <input
                      value={item.ten_tinh}
                      list="provinces"
                      onChange={(event) => handleDiaDiemChange(index, 'ten_tinh', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                    {datalist('provinces', masterData.provinces)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDiaDiem(index)}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {value.danh_sach_dia_diem.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có địa điểm. Nhấn "Thêm địa điểm" để bắt đầu.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Bước 4</p>
              <h2 className="text-xl font-semibold text-slate-900">Chi phí</h2>
            </div>
          </CardTitle>
          <button
            type="button"
            onClick={addChiPhi}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
          >
            <Plus className="h-4 w-4" /> Thêm chi phí
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {value.danh_sach_chi_phi.map((item, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] md:items-end">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Ngày</label>
                    <input
                      value={item.ngay}
                      onChange={(event) => handleChiPhiChange(index, 'ngay', event.target.value)}
                      placeholder="dd/mm/yyyy"
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Loại</label>
                    <input
                      value={item.loai}
                      list="cost_types"
                      onChange={(event) => handleChiPhiChange(index, 'loai', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                    {datalist('cost_types', masterData.cost_types)}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Chi phí</label>
                    <input
                      value={item.ten}
                      list="cost_items"
                      onChange={(event) => handleChiPhiChange(index, 'ten', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                    {datalist('cost_items', masterData.cost_items)}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Số lượng</label>
                    <input
                      type="number"
                      value={item.so_luong}
                      onChange={(event) => handleChiPhiChange(index, 'so_luong', numberField(event))}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Đơn giá</label>
                    <input
                      type="number"
                      value={item.don_gia}
                      onChange={(event) => handleChiPhiChange(index, 'don_gia', numberField(event))}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Thành tiền</label>
                    <input
                      type="number"
                      value={item.thanh_tien}
                      onChange={(event) => handleChiPhiChange(index, 'thanh_tien', numberField(event))}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div className="md:col-span-5">
                    <label className="text-xs font-semibold uppercase text-slate-500">Ghi chú</label>
                    <textarea
                      value={item.ghi_chu}
                      onChange={(event) => handleChiPhiChange(index, 'ghi_chu', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div className="md:col-auto">
                    <button
                      type="button"
                      onClick={() => removeChiPhi(index)}
                      className="mt-1 inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {value.danh_sach_chi_phi.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có chi phí. Nhấn "Thêm chi phí" để bắt đầu.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Bước 5</p>
                <h2 className="text-xl font-semibold text-slate-900">Ăn trưa</h2>
              </div>
            </CardTitle>
            <button
              type="button"
              onClick={() => addBuaAn('an_trua')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
            >
              <Plus className="h-4 w-4" /> Thêm suất ăn
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {value.an.an_trua.map((item, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Ngày</label>
                      <input
                        value={item.ngay}
                        onChange={(event) => handleBuaAnChange('an_trua', index, 'ngay', event.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Tên nhà hàng</label>
                      <input
                        value={item.ten}
                        onChange={(event) => handleBuaAnChange('an_trua', index, 'ten', event.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Số lượng</label>
                      <input
                        type="number"
                        value={item.so_luong}
                        onChange={(event) => handleBuaAnChange('an_trua', index, 'so_luong', numberField(event))}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Đơn giá</label>
                      <input
                        type="number"
                        value={item.don_gia}
                        onChange={(event) => handleBuaAnChange('an_trua', index, 'don_gia', numberField(event))}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Thành tiền</label>
                      <input
                        type="number"
                        value={item.thanh_tien}
                        onChange={(event) => handleBuaAnChange('an_trua', index, 'thanh_tien', numberField(event))}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBuaAn('an_trua', index)}
                      className="mt-1 inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {value.an.an_trua.length === 0 ? <p className="text-sm text-slate-500">Chưa có dữ liệu.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Bước 6</p>
                <h2 className="text-xl font-semibold text-slate-900">Ăn tối</h2>
              </div>
            </CardTitle>
            <button
              type="button"
              onClick={() => addBuaAn('an_toi')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
            >
              <Plus className="h-4 w-4" /> Thêm suất ăn
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {value.an.an_toi.map((item, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Ngày</label>
                      <input
                        value={item.ngay}
                        onChange={(event) => handleBuaAnChange('an_toi', index, 'ngay', event.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Tên nhà hàng</label>
                      <input
                        value={item.ten}
                        onChange={(event) => handleBuaAnChange('an_toi', index, 'ten', event.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Số lượng</label>
                      <input
                        type="number"
                        value={item.so_luong}
                        onChange={(event) => handleBuaAnChange('an_toi', index, 'so_luong', numberField(event))}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Đơn giá</label>
                      <input
                        type="number"
                        value={item.don_gia}
                        onChange={(event) => handleBuaAnChange('an_toi', index, 'don_gia', numberField(event))}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-slate-500">Thành tiền</label>
                      <input
                        type="number"
                        value={item.thanh_tien}
                        onChange={(event) => handleBuaAnChange('an_toi', index, 'thanh_tien', numberField(event))}
                        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBuaAn('an_toi', index)}
                      className="mt-1 inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {value.an.an_toi.length === 0 ? <p className="text-sm text-slate-500">Chưa có dữ liệu.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Bước 7</p>
              <h2 className="text-xl font-semibold text-slate-900">Khách sạn & Tip</h2>
            </div>
          </CardTitle>
          <button
            type="button"
            onClick={addKhachSan}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-primary-300 hover:text-primary-600"
          >
            <Plus className="h-4 w-4" /> Thêm khách sạn
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {value.khach_san.map((item, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Ngày</label>
                    <input
                      value={item.ngay}
                      onChange={(event) => handleKhachSanChange(index, 'ngay', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Tên khách sạn</label>
                    <input
                      value={item.ten}
                      onChange={(event) => handleKhachSanChange(index, 'ten', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Địa chỉ</label>
                    <input
                      value={item.dia_chi}
                      onChange={(event) => handleKhachSanChange(index, 'dia_chi', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">SĐT</label>
                    <input
                      value={item.so_dien_thoai}
                      onChange={(event) => handleKhachSanChange(index, 'so_dien_thoai', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeKhachSan(index)}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {value.khach_san.length === 0 ? <p className="text-sm text-slate-500">Chưa có khách sạn.</p> : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Có tip?</label>
              <select
                value={value.tip.co_tip ? 'true' : 'false'}
                onChange={(event) => update({ tip: { ...value.tip, co_tip: event.target.value === 'true' } })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              >
                <option value="false">Không</option>
                <option value="true">Có</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Số tiền tip</label>
              <input
                type="number"
                value={value.tip.so_tien_tip}
                onChange={(event) => update({ tip: { ...value.tip, so_tien_tip: numberField(event) } })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700">Ghi chú</label>
            <textarea
              value={value.ghi_chu}
              onChange={(event) => update({ ghi_chu: event.target.value })}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Tổng hợp</p>
              <h2 className="text-xl font-semibold text-slate-900">Chi phí tổng cộng</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Chi phí khác</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{totals.costSum.toLocaleString('vi-VN')} ₫</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Ăn trưa</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{totals.lunchSum.toLocaleString('vi-VN')} ₫</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Ăn tối</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{totals.dinnerSum.toLocaleString('vi-VN')} ₫</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Tip</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{totals.tip.toLocaleString('vi-VN')} ₫</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-primary-600 px-6 py-4 text-white">
            <p className="text-sm uppercase tracking-wide text-primary-100">Tổng cộng</p>
            <p className="text-3xl font-bold">{totals.grandTotal.toLocaleString('vi-VN')} ₫</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

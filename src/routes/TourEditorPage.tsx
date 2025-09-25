import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TourForm } from '../features/tours/components/TourForm';
import { TourData, createEmptyTour } from '../types/tour';
import { useTour, useTourMutations } from '../features/tours/hooks/useTours';
import { MasterDataRecord, MasterDataType } from '../types/masterData';
import { useTourDraft } from '../hooks/useTourDraft';
import { useActiveSchema } from '../features/schemas/hooks/useSchemas';
import { createAjvInstance, formatAjvErrors } from '../lib/ajv';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { calculateCostTotals } from '../features/tours/utils';
import { ButtonHTMLAttributes } from 'react';
import { useMasterData } from '../features/master-data/hooks/useMasterData';
import { useToast } from '../hooks/useToast';

const PrimaryButton = ({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
  />
);

const SecondaryButton = ({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
  />
);

const TourEditorPage = () => {
  const params = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(params.tourId);
  const { data: existingTour, isLoading: loadingTour, isError } = useTour(params.tourId);
  const { create, update } = useTourMutations();
  const { draft, rawGeminiData, resetDraft } = useTourDraft();
  const { data: schema } = useActiveSchema();
  const { showToast } = useToast();

  const [tour, setTour] = useState<TourData>(createEmptyTour());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [showGeminiData, setShowGeminiData] = useState(false);

  const guidesQuery = useMasterData('guides');
  const companiesQuery = useMasterData('companies');
  const nationalitiesQuery = useMasterData('nationalities');
  const provincesQuery = useMasterData('provinces');
  const locationsQuery = useMasterData('locations');
  const costTypesQuery = useMasterData('cost_types');
  const costItemsQuery = useMasterData('cost_items');

  const masterData: Partial<Record<MasterDataType, MasterDataRecord[]>> = useMemo(
    () => ({
      guides: guidesQuery.data ?? [],
      companies: companiesQuery.data ?? [],
      nationalities: nationalitiesQuery.data ?? [],
      provinces: provincesQuery.data ?? [],
      locations: locationsQuery.data ?? [],
      cost_types: costTypesQuery.data ?? [],
      cost_items: costItemsQuery.data ?? [],
    }),
    [
      guidesQuery.data,
      companiesQuery.data,
      nationalitiesQuery.data,
      provincesQuery.data,
      locationsQuery.data,
      costTypesQuery.data,
      costItemsQuery.data,
    ],
  );

  const loadingMasterData =
    guidesQuery.isLoading ||
    companiesQuery.isLoading ||
    nationalitiesQuery.isLoading ||
    provincesQuery.isLoading ||
    locationsQuery.isLoading ||
    costTypesQuery.isLoading ||
    costItemsQuery.isLoading;

  const masterDataError =
    guidesQuery.isError ||
    companiesQuery.isError ||
    nationalitiesQuery.isError ||
    provincesQuery.isError ||
    locationsQuery.isError ||
    costTypesQuery.isError ||
    costItemsQuery.isError;

  useEffect(() => {
    if (existingTour) {
      setTour(existingTour);
    }
  }, [existingTour]);

  useEffect(() => {
    if (!isEditing && draft) {
      setTour(draft);
    }
  }, [draft, isEditing]);

  const activeSchemaObject = useMemo(() => {
    if (!schema?.json_schema) return null;
    try {
      return typeof schema.json_schema === 'string' ? JSON.parse(schema.json_schema) : schema.json_schema;
    } catch (error) {
      setSchemaError(`Không thể parse schema JSON: ${(error as Error).message}`);
      return null;
    }
  }, [schema]);

  const handleSave = async () => {
    setValidationErrors([]);
    setSchemaError(null);
    setIsSaving(true);
    try {
      if (activeSchemaObject) {
        const ajv = createAjvInstance();
        const validate = ajv.compile(activeSchemaObject);
        const isValid = validate(tour);
        if (!isValid) {
          setValidationErrors(formatAjvErrors(validate.errors || []));
          setIsSaving(false);
          return;
        }
      }

      if (isEditing && params.tourId) {
        await update.mutateAsync({ id: params.tourId, data: tour });
      } else {
        await create.mutateAsync(tour);
        resetDraft();
      }
      showToast({ message: 'Đã lưu tour thành công.', type: 'success' });
      navigate('/tours');
    } catch (error) {
      setSchemaError((error as Error).message);
      showToast({ message: (error as Error).message || 'Không thể lưu tour.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tour');

    sheet.columns = [
      { header: 'Trường', key: 'field', width: 30 },
      { header: 'Giá trị', key: 'value', width: 80 },
    ];

    sheet.addRows([
      ['Mã tour', tour.thong_tin_chung.ma_tour],
      ['Tên công ty', tour.thong_tin_chung.ten_cong_ty],
      ['Tên hướng dẫn viên', tour.thong_tin_chung.ten_guide],
      ['Tên khách', tour.thong_tin_chung.ten_khach],
      ['Quốc tịch khách', tour.thong_tin_chung.quoc_tich_khach],
      ['Số lượng khách', tour.thong_tin_chung.so_luong_khach],
      ['Tên lái xe', tour.thong_tin_chung.ten_lai_xe],
      ['SĐT khách', tour.thong_tin_chung.so_dien_thoai_khach],
      ['Ngày bắt đầu', tour.ngay_bat_dau],
      ['Ngày kết thúc', tour.ngay_ket_thuc],
      ['Tổng số ngày tour', tour.tong_so_ngay_tour],
      ['Ghi chú', tour.ghi_chu],
    ]);

    sheet.addRow([]);
    sheet.addRow(['Lịch tham quan']);
    sheet.addRow(['Ngày', 'Tỉnh/Thành']);
    tour.danh_sach_ngay_tham_quan.forEach((item) => sheet.addRow([item.ngay, item.tinh_thanh]));

    sheet.addRow([]);
    sheet.addRow(['Địa điểm']);
    sheet.addRow(['Tên', 'Giá vé', 'Tỉnh']);
    tour.danh_sach_dia_diem.forEach((item) => sheet.addRow([item.ten_dia_diem, item.gia_ve, item.ten_tinh]));

    sheet.addRow([]);
    sheet.addRow(['Chi phí']);
    sheet.addRow(['Ngày', 'Loại', 'Tên', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Ghi chú']);
    tour.danh_sach_chi_phi.forEach((item) =>
      sheet.addRow([item.ngay, item.loai, item.ten, item.so_luong, item.don_gia, item.thanh_tien, item.ghi_chu]),
    );

    sheet.addRow([]);
    sheet.addRow(['Ăn trưa']);
    sheet.addRow(['Ngày', 'Tên', 'Số lượng', 'Đơn giá', 'Thành tiền']);
    tour.an.an_trua.forEach((item) => sheet.addRow([item.ngay, item.ten, item.so_luong, item.don_gia, item.thanh_tien]));

    sheet.addRow([]);
    sheet.addRow(['Ăn tối']);
    sheet.addRow(['Ngày', 'Tên', 'Số lượng', 'Đơn giá', 'Thành tiền']);
    tour.an.an_toi.forEach((item) => sheet.addRow([item.ngay, item.ten, item.so_luong, item.don_gia, item.thanh_tien]));

    sheet.addRow([]);
    sheet.addRow(['Khách sạn']);
    sheet.addRow(['Ngày', 'Tên', 'Địa chỉ', 'SĐT']);
    tour.khach_san.forEach((item) => sheet.addRow([item.ngay, item.ten, item.dia_chi, item.so_dien_thoai]));

    sheet.addRow([]);
    sheet.addRow(['Tip']);
    sheet.addRow(['Có tip', tour.tip.co_tip ? 'Có' : 'Không']);
    sheet.addRow(['Số tiền tip', tour.tip.so_tien_tip]);

    const totals = calculateCostTotals(tour);
    sheet.addRow([]);
    sheet.addRow(['Tổng hợp']);
    sheet.addRow(['Chi phí khác', totals.costSum]);
    sheet.addRow(['Ăn trưa', totals.lunchSum]);
    sheet.addRow(['Ăn tối', totals.dinnerSum]);
    sheet.addRow(['Tip', totals.tip]);
    sheet.addRow(['Tổng cộng', totals.grandTotal]);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `tour-${tour.thong_tin_chung.ma_tour || 'internal'}.xlsx`);
  };

  const handleResetDraft = () => {
    resetDraft();
    setTour(createEmptyTour());
  };

  if (loadingTour || loadingMasterData) {
    return <LoadingState label="Đang tải dữ liệu tour..." />;
  }

  if (isError) {
    return <ErrorState message="Không tìm thấy tour hoặc có lỗi xảy ra." />;
  }

  if (masterDataError) {
    return <ErrorState message="Không thể tải master data." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
                {isEditing ? 'Chỉnh sửa' : 'Tạo mới'}
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                {tour.thong_tin_chung.ma_tour || 'Tour nội bộ'}
              </h2>
            </div>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            {!isEditing && draft ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  ✓ Dữ liệu AI đã lưu
                </span>
                <SecondaryButton type="button" onClick={() => setShowGeminiData(true)}>
                  Xem dữ liệu AI
                </SecondaryButton>
                <SecondaryButton type="button" onClick={handleResetDraft}>
                  Xoá dữ liệu AI
                </SecondaryButton>
              </div>
            ) : null}
            <SecondaryButton type="button" onClick={handleExportExcel}>
              Xuất Excel
            </SecondaryButton>
            <PrimaryButton type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu tour'}
            </PrimaryButton>
          </div>
        </CardHeader>
        {validationErrors.length > 0 || schemaError ? (
          <CardContent>
            {schemaError ? <ErrorState message={schemaError} /> : null}
            {validationErrors.length > 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
                <p className="font-semibold">Dữ liệu chưa hợp lệ theo schema:</p>
                <ul className="mt-2 list-disc pl-5">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        ) : null}
      </Card>
      <TourForm value={tour} onChange={setTour} masterData={masterData} />

      {/* Gemini Data Modal */}
      {showGeminiData && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Dữ liệu từ Gemini</h3>
              <button
                type="button"
                onClick={() => setShowGeminiData(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Raw Gemini Data */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">📥 Dữ liệu gốc từ Gemini:</h4>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <pre className="text-xs text-slate-700 overflow-x-auto max-h-96">
                      {rawGeminiData ? JSON.stringify(rawGeminiData, null, 2) : 'Không có dữ liệu gốc'}
                    </pre>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(rawGeminiData, null, 2))}
                    className="mt-2 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition"
                  >
                    Copy Raw Data
                  </button>
                </div>

                {/* Converted TourData */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">📤 Dữ liệu đã chuyển đổi:</h4>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <pre className="text-xs text-slate-700 overflow-x-auto max-h-96">
                      {JSON.stringify(draft, null, 2)}
                    </pre>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(draft, null, 2))}
                    className="mt-2 px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-md hover:bg-green-200 transition"
                  >
                    Copy Converted Data
                  </button>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGeminiData(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourEditorPage;

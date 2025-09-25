import { ChangeEvent, FormEvent, MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { MASTER_DATA_CONFIGS, MASTER_DATA_TYPES, MasterDataField, MasterDataRecord, MasterDataType } from '../types/masterData';
import { useMasterData } from '../features/master-data/hooks/useMasterData';
import { useMasterDataMutations } from '../features/master-data/hooks/useMasterData';
import { useToast } from '../hooks/useToast';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import clsx from 'clsx';

const createEmptyRecord = (fields: MasterDataField[]): MasterDataRecord => {
  const base: MasterDataRecord = { name: '' };
  fields.forEach((field) => {
    if (field.key === 'name') return;
    base[field.key] = field.type === 'number' ? 0 : '';
  });
  return base;
};

const createEmptyFilters = (fields: MasterDataField[]) => {
  const filters: Record<string, string> = {};
  fields.forEach((field) => {
    filters[field.key] = '';
  });
  return filters;
};

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const MasterDataForm = ({
  type,
  record,
  onChange,
  showValidation,
  registerFieldRef,
  referenceData,
}: {
  type: MasterDataType;
  record: MasterDataRecord;
  onChange: (key: string, value: string | number) => void;
  showValidation: boolean;
  registerFieldRef: (key: string, element: FieldElement | null) => void;
  referenceData: Partial<Record<MasterDataType, MasterDataRecord[]>>;
}) => {
  const renderField = (field: MasterDataField) => {
    const value = (record as Record<string, unknown>)[field.key] ?? '';
    const hasError = showValidation && !field.optional && String(value ?? '').trim() === '';
    const baseClass = clsx(
      'mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-0',
      hasError
        ? 'border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/40'
        : 'border-slate-200 focus:border-primary-400',
    );
    const registerRef = (element: FieldElement | null) => registerFieldRef(field.key, element);

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            rows={3}
            className={baseClass}
            value={String(value ?? '')}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(field.key, event.target.value)}
            ref={registerRef}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className={baseClass}
            value={value === '' ? '' : Number(value ?? 0)}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field.key, Number(event.target.value || 0))}
            ref={registerRef}
          />
        );
      case 'select':
        {
          const options = field.referenceType ? referenceData[field.referenceType] ?? [] : [];
          const currentValue = value === null || value === undefined ? '' : String(value);
          const hasCurrentValue =
            currentValue !== '' && options.some((option) => String(option.id ?? '') === currentValue);
          return (
            <select
              className={baseClass}
              value={currentValue}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(field.key, event.target.value)}
              ref={registerRef}
            >
              <option value="">Chọn {field.label.toLowerCase()}</option>
              {options.map((option) => (
                <option key={option.id ?? option.name} value={String(option.id ?? '')}>
                  {option.name}
                </option>
              ))}
              {!hasCurrentValue && currentValue ? (
                <option value={currentValue}>{currentValue}</option>
              ) : null}
            </select>
          );
        }
      default:
        return (
          <input
            className={baseClass}
            value={String(value ?? '')}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field.key, event.target.value)}
            ref={registerRef}
          />
        );
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {MASTER_DATA_CONFIGS[type].fields.map((field) => (
        <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
          <label className="text-sm font-medium text-slate-700">
            {field.label}
            {!field.optional ? <span className="text-red-500"> *</span> : null}
          </label>
          {renderField(field)}
          {field.helperText ? <p className="mt-1 text-xs text-slate-500">{field.helperText}</p> : null}
        </div>
      ))}
    </div>
  );
};

const MasterDataPage = () => {
  const [selectedType, setSelectedType] = useState<MasterDataType>('guides');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MasterDataRecord>(() => createEmptyRecord(MASTER_DATA_CONFIGS['guides'].fields));
  const [bulkText, setBulkText] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>(() =>
    createEmptyFilters(MASTER_DATA_CONFIGS['guides'].fields),
  );
  const fieldRefs: MutableRefObject<Record<string, FieldElement | null>> = useRef({});

  const { data, isLoading, isError } = useMasterData(selectedType);
  const { create, update, remove } = useMasterDataMutations(selectedType);
  const { showToast } = useToast();

  const provincesQuery = useMasterData('provinces');
  const costTypesQuery = useMasterData('cost_types');

  const config = MASTER_DATA_CONFIGS[selectedType];

  useEffect(() => {
    setFilters(createEmptyFilters(config.fields));
    fieldRefs.current = {};
  }, [config]);

  const handleSelectType = (type: MasterDataType) => {
    setSelectedType(type);
    setEditingId(null);
    setFormData(createEmptyRecord(MASTER_DATA_CONFIGS[type].fields));
    setBulkText('');
    setIsFormOpen(false);
    setShowValidation(false);
    fieldRefs.current = {};
  };

  const handleFormChange = (key: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (key === 'name' && typeof value === 'string') {
      setFormData((prev) => ({ ...prev, name: value }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { ...formData };
    const missingField = config.fields.find((field) => {
      if (field.optional) return false;
      const value = (payload as Record<string, unknown>)[field.key];
      if (field.type === 'number') {
        if (value === null || value === undefined) return true;
        if (value === '') return true;
        return Number.isNaN(Number(value));
      }
      return String(value ?? '').trim() === '';
    });
    if (missingField) {
      setShowValidation(true);
      showToast({ message: 'Vui lòng điền đầy đủ các trường bắt buộc.', type: 'error' });
      const element = fieldRefs.current[missingField.key];
      if (element) {
        element.focus();
      }
      return;
    }
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, data: payload });
        showToast({ message: 'Đã cập nhật bản ghi thành công.', type: 'success' });
      } else {
        await create.mutateAsync(payload);
        showToast({ message: 'Đã thêm bản ghi mới.', type: 'success' });
      }
      setFormData(createEmptyRecord(config.fields));
      setEditingId(null);
      setIsFormOpen(false);
      setShowValidation(false);
      fieldRefs.current = {};
    } catch (error) {
      showToast({ message: (error as Error).message || 'Không thể lưu bản ghi.', type: 'error' });
    }
  };

  const handleEdit = (record: MasterDataRecord) => {
    setEditingId(record.id ?? null);
    setFormData(record);
    setIsFormOpen(true);
    setShowValidation(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá bản ghi này?')) return;
    await remove.mutateAsync(id);
    showToast({ message: 'Đã xoá bản ghi.', type: 'info' });
  };

  const handleDuplicate = async (record: MasterDataRecord) => {
    const rest: MasterDataRecord = { ...record };
    delete rest.id;
    try {
      await create.mutateAsync({ ...rest, name: `${record.name} (bản sao)` });
      showToast({ message: 'Đã nhân bản bản ghi.', type: 'success' });
    } catch (error) {
      showToast({ message: (error as Error).message || 'Không thể nhân bản bản ghi.', type: 'error' });
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((record) =>
      config.fields.every((field) => {
        const filterValue = filters[field.key]?.toLowerCase() ?? '';
        if (!filterValue) return true;
        const value = String((record as Record<string, unknown>)[field.key] ?? '').toLowerCase();
        return value.includes(filterValue);
      }),
    );
  }, [data, config.fields, filters]);

  const clearFilters = () => setFilters(createEmptyFilters(config.fields));

  const registerFieldRef = (key: string, element: FieldElement | null) => {
    if (element) {
      fieldRefs.current[key] = element;
    } else {
      delete fieldRefs.current[key];
    }
  };

  const referenceData = useMemo(
    () => ({
      provinces: provincesQuery.data ?? [],
      cost_types: costTypesQuery.data ?? [],
    }),
    [provincesQuery.data, costTypesQuery.data],
  );

  const handleBulkImport = async () => {
    const rows = bulkText
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => row.split('|').map((cell) => cell.trim()));

    for (const row of rows) {
      const payload: MasterDataRecord = {} as MasterDataRecord;
      config.fields.forEach((field, index) => {
        const cell = row[index] ?? '';
        payload[field.key] = field.type === 'number' ? Number(cell || 0) : cell;
      });
      await create.mutateAsync(payload);
    }
    setBulkText('');
    showToast({ message: 'Đã nhập dữ liệu hàng loạt.', type: 'success' });
  };

  const handleCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    Papa.parse<MasterDataRecord>(file, {
      header: true,
      complete: async (result: Papa.ParseResult<MasterDataRecord>) => {
        for (const row of result.data) {
          if (!row.name) continue;
          await create.mutateAsync(row);
        }
        showToast({ message: 'Đã nhập CSV thành công.', type: 'success' });
      },
      error: (error) => {
        showToast({ message: error.message ?? 'Không thể đọc file CSV.', type: 'error' });
      },
    });
  };

  const handleCsvExport = () => {
    const csv = Papa.unparse(data ?? [], { columns: config.csvHeaders });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${config.collection}.csv`);
  };

  if (isLoading) return <LoadingState label="Đang tải master data..." />;
  if (isError) return <ErrorState message="Không thể tải master data" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Dữ liệu chuẩn</p>
              <h2 className="text-xl font-semibold text-slate-900">Danh mục dữ liệu chuẩn</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {MASTER_DATA_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSelectType(type)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedType === type
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:text-primary-600'
                }`}
              >
                {MASTER_DATA_CONFIGS[type].label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">{config.label}</p>
              <h2 className="text-xl font-semibold text-slate-900">{editingId ? 'Cập nhật' : 'Thêm mới'}</h2>
            </div>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCsvExport}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
            >
              Xuất CSV
            </button>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600">
              Nhập CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            </label>
            {!isFormOpen ? (
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
              >
                Thêm bản ghi mới
              </button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!isFormOpen ? (
            <p className="text-sm text-slate-600">
              Nhấn nút “Thêm bản ghi mới” để mở biểu mẫu với mô tả chi tiết từng trường dữ liệu chuẩn.
            </p>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <MasterDataForm
                  type={selectedType}
                  record={formData}
                  onChange={handleFormChange}
                  showValidation={showValidation}
                  registerFieldRef={registerFieldRef}
                  referenceData={referenceData}
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingId(null);
                      setFormData(createEmptyRecord(config.fields));
                      setShowValidation(false);
                      fieldRefs.current = {};
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                  >
                    Đóng
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData(createEmptyRecord(config.fields));
                      setShowValidation(false);
                      fieldRefs.current = {};
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                  >
                    Huỷ chỉnh sửa
                  </button>
                  ) : null}
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
                  >
                    {editingId ? 'Cập nhật' : 'Thêm mới'}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <label className="text-sm font-medium text-slate-700">Import nhanh (mỗi dòng: giá trị | giá trị...)</label>
                <p className="mt-1 text-xs text-slate-500">
                  Sử dụng định dạng mẫu để nhập hàng loạt bản ghi, phù hợp cho việc chuẩn hoá dữ liệu nhanh chóng.
                </p>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(event) => setBulkText(event.target.value)}
                  placeholder={config.bulkPlaceholder}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                  >
                    Nhập hàng loạt
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Danh sách</p>
              <h2 className="text-xl font-semibold text-slate-900">{config.label}</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" description="Thêm mới hoặc nhập CSV để bắt đầu." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    {config.fields.map((field) => (
                      <th key={field.key} className="px-4 py-3">
                        {field.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                  <tr className="bg-white text-xs text-slate-500">
                    {config.fields.map((field) => (
                      <th key={field.key} className="px-4 py-2">
                        <input
                          value={filters[field.key] ?? ''}
                          onChange={(event) =>
                            setFilters((prev) => ({
                              ...prev,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder={`Lọc ${field.label.toLowerCase()}`}
                          className="w-full rounded-md border border-slate-200 px-2 py-1"
                        />
                      </th>
                    ))}
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
                  {filteredData.map((record) => (
                    <tr
                      key={record.id ?? record.name}
                      className="hover:bg-primary-50/70 cursor-pointer"
                      onClick={() => handleEdit(record)}
                    >
                      {config.fields.map((field) => (
                        <td key={field.key} className="px-4 py-3 text-slate-600">
                          {String((record as Record<string, unknown>)[field.key] ?? '')}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(record)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                          >
                            Nhân bản
                          </button>
                          {record.id ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(record.id!)}
                              className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterDataPage;

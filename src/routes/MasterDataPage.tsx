import { ChangeEvent, FormEvent, useState } from 'react';
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

const createEmptyRecord = (fields: MasterDataField[]): MasterDataRecord => {
  const base: MasterDataRecord = { name: '' };
  fields.forEach((field) => {
    if (field.key === 'name') return;
    base[field.key] = field.type === 'number' ? 0 : '';
  });
  return base;
};

const MasterDataForm = ({
  type,
  record,
  onChange,
}: {
  type: MasterDataType;
  record: MasterDataRecord;
  onChange: (key: string, value: string | number) => void;
}) => {
  const renderField = (field: MasterDataField) => {
    const value = (record as Record<string, unknown>)[field.key] ?? '';
    const commonProps = {
      className: 'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0',
      value: value as string | number,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        onChange(field.key, field.type === 'number' ? Number(event.target.value || 0) : event.target.value),
    };

    switch (field.type) {
      case 'textarea':
        return <textarea rows={3} {...commonProps} />;
      case 'number':
        return <input type="number" {...commonProps} />;
      case 'select':
        return <input {...commonProps} placeholder={`Nhập ID tham chiếu (${field.referenceType})`} />;
      default:
        return <input {...commonProps} />;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {MASTER_DATA_CONFIGS[type].fields.map((field) => (
        <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
          <label className="text-sm font-medium text-slate-700">{field.label}</label>
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

  const { data, isLoading, isError } = useMasterData(selectedType);
  const { create, update, remove } = useMasterDataMutations(selectedType);
  const { showToast } = useToast();

  const config = MASTER_DATA_CONFIGS[selectedType];

  const handleSelectType = (type: MasterDataType) => {
    setSelectedType(type);
    setEditingId(null);
    setFormData(createEmptyRecord(MASTER_DATA_CONFIGS[type].fields));
    setBulkText('');
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
    } catch (error) {
      showToast({ message: (error as Error).message || 'Không thể lưu bản ghi.', type: 'error' });
    }
  };

  const handleEdit = (record: MasterDataRecord) => {
    setEditingId(record.id ?? null);
    setFormData(record);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá bản ghi này?')) return;
    await remove.mutateAsync(id);
    showToast({ message: 'Đã xoá bản ghi.', type: 'info' });
  };

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
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <MasterDataForm type={selectedType} record={formData} onChange={handleFormChange} />
            <div className="flex justify-end gap-3">
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData(createEmptyRecord(config.fields));
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                >
                  Huỷ
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
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/80">
                      {config.fields.map((field) => (
                        <td key={field.key} className="px-4 py-3 text-slate-600">
                          {String((record as Record<string, unknown>)[field.key] ?? '')}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(record)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                          >
                            Sửa
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

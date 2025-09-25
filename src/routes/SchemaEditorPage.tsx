import { FormEvent, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { useSchemas, useSchemaMutations } from '../features/schemas/hooks/useSchemas';
import { createAjvInstance, formatAjvErrors } from '../lib/ajv';
import { PromptSchema, SchemaStatus } from '../types/schema';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../hooks/useToast';

const SchemaEditorPage = () => {
  const { data, isLoading, isError } = useSchemas();
  const { createSchema, updateSchema } = useSchemaMutations();
  const [editor, setEditor] = useState<PromptSchema | null>(null);
  const [jsonString, setJsonString] = useState('');
  const [sampleJson, setSampleJson] = useState('');
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState({ name: '', version: '', status: '', updatedAt: '' });
  const { showToast } = useToast();

  const statusLabel = useMemo<Record<SchemaStatus, string>>(
    () => ({
      draft: 'Nháp',
      active: 'Đang dùng',
      archived: 'Lưu trữ',
    }),
    [],
  );

  const resetEditor = () => {
    setEditor(null);
    setJsonString('');
    setValidationResult(null);
    setValidationErrors([]);
  };

  const handleSelectSchema = (schema: PromptSchema) => {
    setEditor(schema);
    setJsonString(JSON.stringify(schema.json_schema, null, 2));
    setValidationResult(null);
    setValidationErrors([]);
  };

  const filteredSchemas = useMemo(() => {
    if (!data) return [];
    return data.filter((schema) => {
      const matchesName = schema.name.toLowerCase().includes(filters.name.toLowerCase());
      const matchesVersion = filters.version
        ? String(schema.version).toLowerCase().includes(filters.version.toLowerCase())
        : true;
      const matchesStatus = filters.status ? schema.status === filters.status : true;
      const matchesUpdated = filters.updatedAt
        ? (schema.updatedAt ?? '').toLowerCase().includes(filters.updatedAt.toLowerCase())
        : true;
      return matchesName && matchesVersion && matchesStatus && matchesUpdated;
    });
  }, [data, filters]);

  const handleCreateSchema = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = JSON.parse(jsonString || '{}');
      await createSchema.mutateAsync({
        name: editor?.name ?? 'Schema mới',
        version: editor?.version ?? 1,
        json_schema: payload,
        status: editor?.status ?? 'draft',
      } as PromptSchema);
      resetEditor();
      showToast({ message: 'Đã tạo schema mới.', type: 'success' });
    } catch (error) {
      setValidationResult(`Không thể tạo schema: ${(error as Error).message}`);
      showToast({ message: (error as Error).message || 'Không thể tạo schema.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSchema = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor?.id) return;
    setIsSaving(true);
    try {
      const payload = JSON.parse(jsonString || '{}');
      await updateSchema.mutateAsync({
        id: editor.id,
        data: {
          ...editor,
          json_schema: payload,
        },
      });
      setValidationResult('Cập nhật schema thành công');
      showToast({ message: 'Đã cập nhật schema.', type: 'success' });
    } catch (error) {
      setValidationResult(`Không thể cập nhật schema: ${(error as Error).message}`);
      showToast({ message: (error as Error).message || 'Không thể cập nhật schema.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = () => {
    try {
      const schemaObject = JSON.parse(jsonString || '{}');
      const json = sampleJson ? JSON.parse(sampleJson) : {};
      const ajv = createAjvInstance();
      const validate = ajv.compile(schemaObject);
      const isValid = validate(json);
      if (isValid) {
        setValidationResult('✅ JSON hợp lệ với schema');
        setValidationErrors([]);
      } else {
        setValidationResult('❌ JSON không hợp lệ');
        setValidationErrors(formatAjvErrors(validate.errors || []));
      }
    } catch (error) {
      setValidationResult(`Không thể kiểm tra: ${(error as Error).message}`);
      setValidationErrors([]);
    }
  };

  const handleDuplicate = async (schema: PromptSchema) => {
    const payload: PromptSchema = { ...schema };
    delete payload.id;
    delete payload.updatedAt;
    try {
      await createSchema.mutateAsync({
        ...payload,
        name: `${schema.name} (bản sao)`,
        status: 'draft',
      });
      showToast({ message: `Đã nhân bản ${schema.name}.`, type: 'success' });
    } catch (error) {
      showToast({ message: (error as Error).message || 'Không thể nhân bản schema.', type: 'error' });
    }
  };

  const clearFilters = () => setFilters({ name: '', version: '', status: '', updatedAt: '' });

  if (isLoading) return <LoadingState label="Đang tải danh sách schema..." />;
  if (isError) return <ErrorState message="Không thể tải danh sách schema." />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Schema</p>
              <h2 className="text-xl font-semibold text-slate-900">Danh sách schema</h2>
            </div>
          </CardTitle>
          <button
            type="button"
            onClick={() => {
              setEditor({ id: '', name: 'Schema mới', version: 1, json_schema: {}, status: 'draft' });
              setJsonString('{\n  "type": "object"\n}');
              setSampleJson('{}');
            }}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
          >
            Schema mới
          </button>
        </CardHeader>
        <CardContent>
          {!data || data.length === 0 ? (
            <EmptyState title="Chưa có schema" description="Tạo schema mới để kiểm tra JSON từ Gemini." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Tên</th>
                    <th className="px-4 py-3">Phiên bản</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Cập nhật</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                  <tr className="bg-white text-xs text-slate-500">
                    <th className="px-4 py-2">
                      <input
                        value={filters.name}
                        onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Lọc tên"
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={filters.version}
                        onChange={(event) => setFilters((prev) => ({ ...prev, version: event.target.value }))}
                        placeholder="v..."
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <select
                        value={filters.status}
                        onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                        className="w-full rounded-md border border-slate-200 px-2 py-1"
                      >
                        <option value="">Tất cả</option>
                        <option value="draft">Nháp</option>
                        <option value="active">Đang dùng</option>
                        <option value="archived">Lưu trữ</option>
                      </select>
                    </th>
                    <th className="px-4 py-2">
                      <input
                        value={filters.updatedAt}
                        onChange={(event) => setFilters((prev) => ({ ...prev, updatedAt: event.target.value }))}
                        placeholder="2024-..."
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
                  {filteredSchemas.map((schema) => (
                    <tr
                      key={schema.id}
                      className="hover:bg-primary-50/70 cursor-pointer"
                      onClick={() => handleSelectSchema(schema)}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">{schema.name}</td>
                      <td className="px-4 py-3 text-slate-600">v{schema.version}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                            schema.status === 'active'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {statusLabel[schema.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{schema.updatedAt?.substring(0, 10) ?? '—'}</td>
                      <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectSchema(schema)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectSchema(schema)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(schema)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                          >
                            Nhân bản
                          </button>
                          {schema.status !== 'active' ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await updateSchema.mutateAsync({
                                  id: schema.id!,
                                  data: { ...schema, status: 'active' satisfies SchemaStatus },
                                });
                                showToast({ message: `Đã kích hoạt ${schema.name}.`, type: 'success' });
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
                            >
                              Kích hoạt
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

      {editor ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Chỉnh sửa schema</p>
                <h2 className="text-xl font-semibold text-slate-900">{editor.name}</h2>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={editor.id ? handleUpdateSchema : handleCreateSchema} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Tên schema</label>
                  <input
                    value={editor.name}
                    onChange={(event) => setEditor((prev) => prev && { ...prev, name: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Version</label>
                  <input
                    type="number"
                    value={editor.version}
                    onChange={(event) => setEditor((prev) => prev && { ...prev, version: Number(event.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                  <select
                    value={editor.status}
                    onChange={(event) => setEditor((prev) => prev && { ...prev, status: event.target.value as SchemaStatus })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">JSON Schema</label>
                <textarea
                  rows={12}
                  value={jsonString}
                  onChange={(event) => setJsonString(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Sample JSON</label>
                <textarea
                  rows={8}
                  value={sampleJson}
                  onChange={(event) => setSampleJson(event.target.value)}
                  placeholder={`{\n  "thong_tin_chung": { ... }\n}`}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleValidate}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                >
                  Kiểm tra JSON
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu schema'}
                </button>
                <button
                  type="button"
                  onClick={resetEditor}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
                >
                  Đóng
                </button>
              </div>

              {validationResult ? <p className="text-sm font-medium text-slate-600">{validationResult}</p> : null}
              {validationErrors.length > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <p className="font-semibold">Chi tiết lỗi:</p>
                  <ul className="mt-2 list-disc pl-5">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default SchemaEditorPage;

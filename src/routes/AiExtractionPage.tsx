import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { queryKeys } from '../constants/queryKeys';
import { fetchLatestPrompt, requestAiExtraction } from '../features/ai/api';
import { createAjvInstance, formatAjvErrors } from '../lib/ajv';
import { useActiveSchema } from '../features/schemas/hooks/useSchemas';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { normalizeAiTour } from '../features/ai/utils';
import { useTourDraft } from '../hooks/useTourDraft';
import { TourData } from '../types/tour';
import { useToast } from '../hooks/useToast';

const AiExtractionPage = () => {
  const navigate = useNavigate();
  const { setDraft } = useTourDraft();
  const { showToast } = useToast();
  const { data: schema, isLoading: loadingSchema, isError: schemaError } = useActiveSchema();
  const { data: promptData, isLoading: loadingPrompt, isError: promptError } = useQuery({
    queryKey: queryKeys.aiPrompt,
    queryFn: fetchLatestPrompt,
  });

  const [imageUrl, setImageUrl] = useState('');
  const [overrides, setOverrides] = useState('');
  const [rawOutput, setRawOutput] = useState('');
  const [parsedJson, setParsedJson] = useState<unknown>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const schemaObject = useMemo(() => {
    if (!schema?.json_schema) return null;
    return typeof schema.json_schema === 'string' ? JSON.parse(schema.json_schema) : schema.json_schema;
  }, [schema]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setValidationResult(null);
    setValidationErrors([]);
    try {
      const overridesPayload = overrides ? JSON.parse(overrides) : undefined;
      const response = await requestAiExtraction({ imageUrl, overrides: overridesPayload });
      setRawOutput(JSON.stringify(response.raw_output ?? response, null, 2));
      const parsed = response.parsed ?? response;
      setParsedJson(parsed);
      showToast({ message: 'Đã gọi Gemini thành công.', type: 'success' });

      if (schemaObject) {
        const ajv = createAjvInstance();
        const validate = ajv.compile(schemaObject);
        const isValid = validate(parsed);
        if (isValid) {
          setValidationResult('✅ JSON hợp lệ theo schema');
        } else {
          setValidationResult('❌ JSON không hợp lệ');
          setValidationErrors(formatAjvErrors(validate.errors || []));
        }
      }
    } catch (error) {
      setValidationResult(`Không thể gọi Gemini: ${(error as Error).message}`);
      setParsedJson(null);
      showToast({ message: (error as Error).message || 'Không thể gọi Gemini.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadToTour = () => {
    if (!parsedJson) return;
    const tour: TourData = normalizeAiTour(parsedJson);
    setDraft(tour);
    showToast({ message: 'Đã nạp dữ liệu vào biểu mẫu tour.', type: 'success' });
    navigate('/tours/new');
  };

  if (loadingSchema || loadingPrompt) {
    return <LoadingState label="Đang tải cấu hình AI..." />;
  }

  if (schemaError || promptError) {
    return <ErrorState message="Không thể tải thông tin schema hoặc prompt." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Trích xuất Gemini</p>
              <h2 className="text-xl font-semibold text-slate-900">Nhận diện từ ảnh chương trình tour</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Link ảnh chương trình tour</label>
              <input
                required
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Ghi đè (JSON tuỳ chọn)</label>
              <textarea
                rows={4}
                value={overrides}
                onChange={(event) => setOverrides(event.target.value)}
                placeholder='{ "instructionId": "..." }'
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setImageUrl('');
                  setOverrides('');
                  setRawOutput('');
                  setParsedJson(null);
                  setValidationErrors([]);
                  setValidationResult(null);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-300 hover:text-primary-600"
              >
                Làm mới
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? 'Đang gửi Gemini...' : 'Gọi Gemini'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Prompt hiện tại</p>
              <h2 className="text-xl font-semibold text-slate-900">Hướng dẫn & Schema</h2>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-700">Prompt</p>
              <textarea readOnly rows={12} value={promptData?.prompt ?? ''} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Schema đang dùng</p>
              <textarea
                readOnly
                rows={12}
                value={schemaObject ? JSON.stringify(schemaObject, null, 2) : 'Chưa có schema đang dùng'}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {rawOutput ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Kết quả Gemini</p>
                <h2 className="text-xl font-semibold text-slate-900">JSON trả về</h2>
              </div>
            </CardTitle>
            {parsedJson ? (
              <button
                type="button"
                onClick={handleLoadToTour}
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
              >
                Đưa vào biểu mẫu tour
              </button>
            ) : null}
          </CardHeader>
          <CardContent>
            {validationResult ? <p className="text-sm font-medium text-slate-600">{validationResult}</p> : null}
            {validationErrors.length > 0 ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <p className="font-semibold">Chi tiết lỗi:</p>
                <ul className="mt-2 list-disc pl-5">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <textarea
              readOnly
              rows={16}
              value={rawOutput}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default AiExtractionPage;

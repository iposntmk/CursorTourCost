import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { queryKeys } from '../constants/queryKeys';
import { fetchLatestPrompt, requestAiExtraction } from '../features/ai/api';
import { createAjvInstance, formatAjvErrors } from '../lib/ajv';
import { useActiveSchemas } from '../features/schemas/hooks/useSchemas';
import {
  useActiveInstructions,
  useInstructionRuleSets,
} from '../features/instructions/hooks/useInstructions';
import { composePrompt } from '../features/instructions/utils/composePrompt';
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
  const {
    data: activeSchemas,
    isLoading: loadingSchemas,
    isError: schemaError,
  } = useActiveSchemas();
  const { data: promptData, isLoading: loadingPrompt, isError: promptError } = useQuery({
    queryKey: queryKeys.aiPrompt,
    queryFn: fetchLatestPrompt,
  });
  const {
    data: activeInstructions,
    isLoading: loadingActiveInstructions,
    isError: activeInstructionsError,
  } = useActiveInstructions();
  const activeInstructionIds = useMemo(
    () => (activeInstructions ?? []).map((instruction) => instruction.id).filter(Boolean) as string[],
    [activeInstructions],
  );
  const {
    data: activeRuleSets,
    isLoading: loadingActiveRules,
    isError: activeRulesError,
  } = useInstructionRuleSets(activeInstructionIds);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [overrides, setOverrides] = useState('');
  const [rawOutput, setRawOutput] = useState('');
  const [parsedJson, setParsedJson] = useState<unknown>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadedFile) {
      setFilePreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(uploadedFile);
    setFilePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [uploadedFile]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setUploadedFile(null);
      setFileError(null);
      event.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadedFile(null);
      setFileError('Chỉ hỗ trợ tập tin hình ảnh (PNG, JPG, JPEG, WEBP...).');
      event.target.value = '';
      return;
    }

    setFileError(null);
    setUploadedFile(file);
    event.target.value = '';
  };

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const [, base64] = result.split(',');
          resolve(base64 ?? result);
        } else {
          reject(new Error('Không thể đọc nội dung tập tin.'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Đọc tập tin thất bại.'));
      };
      reader.readAsDataURL(file);
    });

  const { parsedSchemas, schemaParseError } = useMemo(() => {
    const result: {
      parsedSchemas: { id: string; name: string; version: number; data: unknown }[];
      schemaParseError: string | null;
    } = { parsedSchemas: [], schemaParseError: null };

    if (!activeSchemas) return result;

    for (const schema of activeSchemas) {
      if (!schema.json_schema) continue;
      try {
        const data =
          typeof schema.json_schema === 'string'
            ? JSON.parse(schema.json_schema)
            : schema.json_schema;
        result.parsedSchemas.push({
          id: schema.id ?? schema.name,
          name: schema.name,
          version: schema.version,
          data,
        });
      } catch (error) {
        result.schemaParseError = `Không thể parse schema ${schema.name}: ${(error as Error).message}`;
        break;
      }
    }

    return result;
  }, [activeSchemas]);

  const validationSchema = useMemo(() => {
    const schemaEntry = parsedSchemas.find((entry) => entry.data && typeof entry.data === 'object');
    return schemaEntry?.data ?? null;
  }, [parsedSchemas]);

  const schemaDisplayText = useMemo(() => {
    if (!parsedSchemas.length) return 'Chưa có schema đang dùng';
    return parsedSchemas
      .map((entry, index) => {
        const header = `Schema ${index + 1}: ${entry.name} (v${entry.version})`;
        const body =
          entry.data !== undefined
            ? JSON.stringify(entry.data, null, 2)
            : 'Không có nội dung schema';
        return `${header}\n${body}`;
      })
      .join('\n\n---\n\n');
  }, [parsedSchemas]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setValidationResult(null);
    setValidationErrors([]);
    
    if (!uploadedFile) {
      showToast({
        message: 'Vui lòng tải lên ảnh chương trình tour.',
        type: 'error',
      });
      setIsLoading(false);
      return;
    }
    
    try {
      const overridesPayload = overrides ? JSON.parse(overrides) : undefined;
      const base64Data = await readFileAsBase64(uploadedFile);
      const response = await requestAiExtraction({
        imageBase64: base64Data,
        imageMimeType: uploadedFile.type,
        imageName: uploadedFile.name,
        prompt: promptText,
        overrides: overridesPayload,
      });
      setRawOutput(JSON.stringify(response.raw_output ?? response, null, 2));
      const parsed = response.parsed ?? response;
      setParsedJson(parsed);
      showToast({ message: 'Đã gọi Gemini thành công.', type: 'success' });

      if (validationSchema) {
        const ajv = createAjvInstance();
        const validate = ajv.compile(validationSchema as Record<string, unknown>);
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

  const composedPrompt = useMemo(
    () => composePrompt(activeInstructions, activeRuleSets ?? {}),
    [activeInstructions, activeRuleSets],
  );
  const promptText = useMemo(() => {
    const sections = [promptData?.prompt, composedPrompt]
      .map((section) => section?.trim())
      .filter((section): section is string => Boolean(section && section.length > 0));
    return sections.join('\n\n---\n\n');
  }, [composedPrompt, promptData?.prompt]);

  if (loadingSchemas || loadingPrompt || loadingActiveInstructions || loadingActiveRules) {
    return <LoadingState label="Đang tải cấu hình AI..." />;
  }

  if (
    schemaError ||
    schemaParseError ||
    promptError ||
    activeInstructionsError ||
    activeRulesError
  ) {
    return (
      <ErrorState
        message={schemaParseError ?? 'Không thể tải thông tin schema hoặc prompt.'}
      />
    );
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
              <label className="text-sm font-medium text-slate-700">Tải ảnh chương trình tour</label>
              <p className="mt-1 text-xs text-slate-500">
                Chọn tập tin hình ảnh từ máy tính để gửi trực tiếp tới Gemini. Ảnh chỉ dùng tạm thời và không được lưu trữ.
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1 block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:rounded-md file:border file:border-slate-200 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:border-primary-300 hover:file:text-primary-600"
              />
              {fileError ? <p className="mt-2 text-xs text-red-500">{fileError}</p> : null}
              {uploadedFile ? (
                <div className="mt-3 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {filePreviewUrl ? (
                    <img
                      src={filePreviewUrl}
                      alt={uploadedFile.name}
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  ) : null}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{uploadedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(uploadedFile.size / 1024).toFixed(1)} KB · {uploadedFile.type || 'Không rõ định dạng'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setFilePreviewUrl(null);
                      }}
                      className="mt-2 text-xs font-medium text-primary-600 hover:underline"
                    >
                      Xoá ảnh đã chọn
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Ghi đè (JSON tuỳ chọn)</label>
              <p className="mt-1 text-xs text-slate-500">
                Cung cấp JSON để ghi đè thông tin mặc định khi gọi Gemini (ví dụ instructionId, schema...).
              </p>
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
                  setUploadedFile(null);
                  setFilePreviewUrl(null);
                  setOverrides('');
                  setRawOutput('');
                  setParsedJson(null);
                  setValidationErrors([]);
                  setValidationResult(null);
                  setFileError(null);
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
              <textarea
                readOnly
                rows={12}
                value={promptText}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 font-mono overflow-x-auto"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Schema đang dùng</p>
              <textarea
                readOnly
                rows={12}
                value={schemaDisplayText}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 font-mono overflow-x-auto"
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
                <h2 className="text-xl font-semibold text-slate-900">Dữ liệu trích xuất</h2>
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
            {/* Summary Stats */}
            {parsedJson && typeof parsedJson === 'object' ? (
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <div className="text-sm font-medium text-blue-800">Tổng số trường</div>
                  <div className="text-2xl font-bold text-blue-900">{Object.keys(parsedJson).length}</div>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <div className="text-sm font-medium text-green-800">Trường có dữ liệu</div>
                  <div className="text-2xl font-bold text-green-900">
                    {Object.values(parsedJson).filter(v => v && String(v).trim()).length}
                  </div>
                </div>
                <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
                  <div className="text-sm font-medium text-purple-800">Trường trống</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {Object.values(parsedJson).filter(v => !v || !String(v).trim()).length}
                  </div>
                </div>
              </div>
            ) : null}

            {validationResult ? (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-medium text-green-800">{validationResult}</p>
              </div>
            ) : null}
            {validationErrors.length > 0 ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <p className="font-semibold">Chi tiết lỗi:</p>
                <ul className="mt-2 list-disc pl-5">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            
            {/* Structured Data Display */}
            {parsedJson && typeof parsedJson === 'object' ? (
              <div className="mb-6">
                <h3 className="mb-3 text-lg font-semibold text-slate-800">Dữ liệu đã phân tích</h3>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    {Object.entries(parsedJson).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </label>
                        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-800">
                          {typeof value === 'object' && value !== null ? (
                            <pre className="whitespace-pre-wrap font-mono text-xs">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            <span className={value ? 'text-slate-900' : 'text-slate-400 italic'}>
                              {value || 'Không có dữ liệu'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Raw Output */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-slate-800">Kết quả thô từ Gemini</h3>
              <div className="relative">
                <textarea
                  readOnly
                  rows={12}
                  value={rawOutput}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 font-mono overflow-x-auto resize-none"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(rawOutput)}
                  className="absolute top-2 right-2 rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-300 transition"
                >
                  Copy
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default AiExtractionPage;

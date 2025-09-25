import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { queryKeys } from '../constants/queryKeys';
import { fetchLatestPrompt, requestAiExtraction, saveCustomPrompt, fetchSavedPrompts, CustomPrompt } from '../features/ai/api';
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

  // Fetch saved prompts
  const { 
    data: savedPromptsData, 
    isLoading: loadingSavedPrompts,
    refetch: refetchSavedPrompts 
  } = useQuery({
    queryKey: ['saved-prompts'],
    queryFn: fetchSavedPrompts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [overrides, setOverrides] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showSavePromptDialog, setShowSavePromptDialog] = useState(false);
  const [promptToSave, setPromptToSave] = useState('');
  const [promptName, setPromptName] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [desiredJsonFormat, setDesiredJsonFormat] = useState(`{
  "thong_tin_chung": {
    "ma_tour": "(Tour Code)",
    "ten_cong_ty": "",
    "ten_guide": "(Guide Name)",
    "ten_khach": "",
    "quoc_tich_khach": "(Nationality)",
    "so_luong_khach": 0,
    "ten_lai_xe": "",
    "so_dien_thoai_khach": ""
  },
  "ngay_bat_dau": "(Start Date)",
  "ngay_ket_thuc": "(End Date)",
  "tong_so_ngay_tour": 0,
  "danh_sach_ngay_tham_quan": [],
  "danh_sach_dia_diem": [],
  "danh_sach_chi_phi": [],
  "an": {
    "an_trua": [],
    "an_toi": []
  },
  "khach_san": [],
  "tip": {
    "co_tip": false,
    "so_tien_tip": 0
  },
  "ghi_chu": ""
}`);
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
        prompt: finalPromptText,
        overrides: overridesPayload,
      });
      setRawOutput(JSON.stringify(response.raw_output ?? response, null, 2));
      const parsed = response.parsed ?? response;
      setParsedJson(parsed);
      showToast({ message: 'Đã gọi Gemini thành công.', type: 'success' });

      // Show save prompt dialog if custom prompt was used
      if (customPrompt.trim()) {
        setPromptToSave(finalPromptText);
        setPromptName(`Custom Prompt - ${new Date().toLocaleDateString('vi-VN')}`);
        setPromptDescription(`Prompt tùy chỉnh được tạo ngày ${new Date().toLocaleDateString('vi-VN')}`);
        setShowSavePromptDialog(true);
      }

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

  const handleSavePrompt = async () => {
    if (!promptToSave.trim()) return;
    
    setIsSavingPrompt(true);
    try {
      await saveCustomPrompt({
        prompt: promptToSave,
        name: promptName.trim() || 'Custom Prompt',
        description: promptDescription.trim(),
      });
      
      showToast({ 
        message: 'Đã lưu prompt tùy chỉnh thành công!', 
        type: 'success' 
      });
      
      // Refresh saved prompts list
      refetchSavedPrompts();
      
      setShowSavePromptDialog(false);
      setPromptToSave('');
      setPromptName('');
      setPromptDescription('');
    } catch (error) {
      showToast({ 
        message: `Không thể lưu prompt: ${(error as Error).message}`, 
        type: 'error' 
      });
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleLoadSavedPrompt = (prompt: CustomPrompt) => {
    setCustomPrompt(prompt.prompt);
    showToast({ 
      message: `Đã tải prompt "${prompt.name}"`, 
      type: 'success' 
    });
  };

  const handleLoadToTour = () => {
    if (!parsedJson) return;
    const tour: TourData = normalizeAiTour(parsedJson);
    setDraft(tour, parsedJson); // Lưu cả normalized data và raw data
    showToast({ message: 'Đã nạp dữ liệu vào biểu mẫu tour.', type: 'success' });
    navigate('/tours/new');
  };

  const composedPrompt = useMemo(
    () => composePrompt(activeInstructions, activeRuleSets ?? {}),
    [activeInstructions, activeRuleSets],
  );
  
  const finalPromptText = useMemo(() => {
    // Use custom prompt if provided, otherwise use composed prompt
    const basePrompt = customPrompt.trim() || composedPrompt;
    
    // Add desired JSON format instruction
    const jsonFormatInstruction = `\n\nIMPORTANT: Please return the extracted data in the following JSON format:\n\`\`\`json\n${desiredJsonFormat}\n\`\`\`\n\nMake sure to fill in the actual values and replace placeholders like "(Tour Code)", "(Guide Name)", etc. with the real data from the image.`;
    
    const sections = [promptData?.prompt, basePrompt]
      .map((section) => section?.trim())
      .filter((section): section is string => Boolean(section && section.length > 0));
    
    return sections.join('\n\n---\n\n') + jsonFormatInstruction;
  }, [customPrompt, composedPrompt, promptData?.prompt, desiredJsonFormat]);

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
            
            {/* Custom Prompt */}
            <div>
              <label className="text-sm font-medium text-slate-700">Prompt tùy chỉnh</label>
              <p className="mt-1 text-xs text-slate-500">
                Nhập prompt tùy chỉnh để hướng dẫn Gemini trích xuất thông tin. Để trống để sử dụng prompt mặc định từ hệ thống.
              </p>
              <textarea
                rows={6}
                value={customPrompt}
                onChange={(event) => setCustomPrompt(event.target.value)}
                placeholder="Ví dụ: Hãy trích xuất thông tin tour từ hình ảnh này, bao gồm mã tour, tên guide, ngày bắt đầu và kết thúc..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
              />
            </div>

            {/* Desired JSON Format */}
            <div>
              <label className="text-sm font-medium text-slate-700">Định dạng JSON mong muốn</label>
              <p className="mt-1 text-xs text-slate-500">
                Định nghĩa cấu trúc JSON mà bạn muốn Gemini trả về. Sử dụng placeholder như "(Tour Code)", "(Guide Name)" để chỉ định vị trí cần điền.
              </p>
              <textarea
                rows={12}
                value={desiredJsonFormat}
                onChange={(event) => setDesiredJsonFormat(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-primary-400 focus:ring-0"
              />
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
                  setCustomPrompt('');
                  setDesiredJsonFormat(`{
  "thong_tin_chung": {
    "ma_tour": "(Tour Code)",
    "ten_cong_ty": "",
    "ten_guide": "(Guide Name)",
    "ten_khach": "",
    "quoc_tich_khach": "(Nationality)",
    "so_luong_khach": 0,
    "ten_lai_xe": "",
    "so_dien_thoai_khach": ""
  },
  "ngay_bat_dau": "(Start Date)",
  "ngay_ket_thuc": "(End Date)",
  "tong_so_ngay_tour": 0,
  "danh_sach_ngay_tham_quan": [],
  "danh_sach_dia_diem": [],
  "danh_sach_chi_phi": [],
  "an": {
    "an_trua": [],
    "an_toi": []
  },
  "khach_san": [],
  "tip": {
    "co_tip": false,
    "so_tien_tip": 0
  },
  "ghi_chu": ""
}`);
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

      {/* Saved Prompts Section */}
      {savedPromptsData?.prompts && savedPromptsData.prompts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Prompt Đã Lưu</p>
                  <h2 className="text-xl font-semibold text-slate-900">Prompt tùy chỉnh đã lưu</h2>
                </div>
                <button
                  type="button"
                  onClick={() => refetchSavedPrompts()}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Làm mới
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedPromptsData.prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 truncate">
                        {prompt.name}
                      </h3>
                      {prompt.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {prompt.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>Tạo: {new Date(prompt.createdAt).toLocaleDateString('vi-VN')}</span>
                        <span>Sử dụng: {prompt.usageCount} lần</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        type="button"
                        onClick={() => handleLoadSavedPrompt(prompt)}
                        className="px-3 py-1 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
                      >
                        Sử dụng
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <details className="group">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                        Xem nội dung prompt
                      </summary>
                      <div className="mt-2 p-3 bg-slate-50 rounded-md">
                        <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono overflow-x-auto">
                          {prompt.prompt}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              <p className="text-sm font-semibold text-slate-700">Prompt cuối cùng</p>
              <textarea
                readOnly
                rows={12}
                value={finalPromptText}
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
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Dữ liệu đã phân tích</h3>
                  <div className="text-sm text-slate-500">
                    {Object.keys(parsedJson).length} trường dữ liệu
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Trường dữ liệu
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Giá trị
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Trạng thái
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {Object.entries(parsedJson).map(([key, value], index) => {
                          const hasValue = value && String(value).trim();
                          const displayValue = typeof value === 'object' && value !== null 
                            ? JSON.stringify(value, null, 2)
                            : String(value || '');
                          
                          return (
                            <tr key={key} className={index % 2 === 0 ? 'bg-white hover:bg-slate-25' : 'bg-slate-25 hover:bg-slate-50'}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-900">
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono">
                                    ({key})
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 max-w-md">
                                {typeof value === 'object' && value !== null ? (
                                  <div className="relative">
                                    <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 overflow-x-auto">
                                      {displayValue}
                                    </pre>
                                    <button
                                      type="button"
                                      onClick={() => navigator.clipboard.writeText(displayValue)}
                                      className="absolute top-1 right-1 rounded bg-slate-200 px-1 py-0.5 text-xs text-slate-600 hover:bg-slate-300 transition"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`text-sm ${hasValue ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                                    {hasValue ? displayValue : 'Không có dữ liệu'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                  hasValue 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {hasValue ? '✓ Có dữ liệu' : '○ Trống'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(hasValue ? displayValue : '')}
                                  disabled={!hasValue}
                                  className="text-xs text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed"
                                >
                                  Copy
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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

      {/* Save Prompt Dialog */}
      {showSavePromptDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Lưu Prompt Tùy Chỉnh
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tên Prompt
                  </label>
                  <input
                    type="text"
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nhập tên cho prompt..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={promptDescription}
                    onChange={(e) => setPromptDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                    placeholder="Mô tả ngắn về prompt này..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nội dung Prompt
                  </label>
                  <textarea
                    value={promptToSave}
                    onChange={(e) => setPromptToSave(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                    rows={8}
                    readOnly
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSavePromptDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  disabled={isSavingPrompt}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSavePrompt}
                  disabled={isSavingPrompt || !promptToSave.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPrompt ? 'Đang lưu...' : 'Lưu Prompt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiExtractionPage;

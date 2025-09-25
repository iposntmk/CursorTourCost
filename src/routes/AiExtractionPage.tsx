import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { queryKeys } from '../constants/queryKeys';
import { fetchLatestPrompt, requestAiExtraction, saveCustomPrompt, fetchSavedPrompts, CustomPrompt, optimizePrompt } from '../features/ai/api';
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
import { saveImageToStorage, getSavedImages, deleteSavedImage, SavedImage, formatFileSize } from '../utils/imageStorage';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

const CollapsibleSection = ({ title, subtitle, isExpanded, onToggle, children, className = '' }: CollapsibleSectionProps) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle>
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between text-left hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">{title}</p>
            <h2 className="text-xl font-semibold text-slate-900">{subtitle || title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {isExpanded ? 'Thu gọn' : 'Mở rộng'}
            </span>
            {isExpanded ? (
              <ChevronDownIcon className="h-5 w-5 text-slate-500" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-slate-500" />
            )}
          </div>
        </button>
      </CardTitle>
    </CardHeader>
    {isExpanded && <CardContent>{children}</CardContent>}
  </Card>
);

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
  const [saveImageToBrowser, setSaveImageToBrowser] = useState(false);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [sectionStates, setSectionStates] = useState({
    upload: true,        // Upload section - expanded by default
    customPrompt: true,  // Custom prompt section - expanded by default
    jsonFormat: true,    // JSON format section - expanded by default
    overrides: true,    // Overrides section - expanded by default
    savedPrompts: true, // Saved prompts section - expanded by default
    savedImages: true, // Saved images section - expanded by default
    currentPrompt: true, // Current prompt section - expanded by default
    results: true,      // Results section - expanded by default
  });
  const [optimizePromptEnabled, setOptimizePromptEnabled] = useState(false);
  const [optimizationType, setOptimizationType] = useState<'clarity' | 'structure' | 'completeness' | 'all'>('all');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedPrompt, setOptimizedPrompt] = useState<string>('');
  const [optimizationResult, setOptimizationResult] = useState<string>('');

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

  // Load saved images on component mount
  useEffect(() => {
    setSavedImages(getSavedImages());
  }, []);

  // Toggle section function
  const toggleSection = (section: keyof typeof sectionStates) => {
    setSectionStates(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fallback optimization function
  const performFallbackOptimization = (prompt: string, type: string) => {
    let optimized = prompt;
    let explanation = '';

    switch (type) {
      case 'clarity':
        optimized = prompt
          .replace(/\s+/g, ' ')
          .replace(/\.\s*\./g, '.')
          .trim();
        explanation = 'Đã làm sạch khoảng trắng thừa và cải thiện độ rõ ràng của prompt.';
        break;
      
      case 'structure': {
        const structureLines = prompt.split('\n').filter(line => line.trim());
        optimized = structureLines
          .map((line, index) => {
            if (index === 0) return line;
            if (line.includes('IMPORTANT') || line.includes('QUAN TRỌNG')) return `\n${line}`;
            if (line.includes('---')) return `\n${line}`;
            return line;
          })
          .join('\n');
        explanation = 'Đã cải thiện cấu trúc và định dạng của prompt.';
        break;
      }
      
      case 'completeness':
        if (!prompt.includes('JSON format') && !prompt.includes('định dạng JSON')) {
          optimized = prompt + '\n\nIMPORTANT: Please return the extracted data in valid JSON format.';
          explanation = 'Đã thêm yêu cầu về định dạng JSON để đảm bảo tính hoàn chỉnh.';
        } else {
          optimized = prompt;
          explanation = 'Prompt đã đầy đủ thông tin cần thiết.';
        }
        break;
      
      default: { // 'all'
        optimized = prompt
          .replace(/\s+/g, ' ')
          .replace(/\.\s*\./g, '.')
          .trim();
        
        const allLines = optimized.split('\n').filter(line => line.trim());
        optimized = allLines
          .map((line, index) => {
            if (index === 0) return line;
            if (line.includes('IMPORTANT') || line.includes('QUAN TRỌNG')) return `\n${line}`;
            if (line.includes('---')) return `\n${line}`;
            return line;
          })
          .join('\n');
        
        explanation = 'Đã tối ưu prompt về độ rõ ràng, cấu trúc và tính hoàn chỉnh.';
        break;
      }
    }

    return { optimized, explanation };
  };

  // Optimize prompt function
  const handleOptimizePrompt = async () => {
    if (!finalPromptText.trim()) {
      showToast({ message: 'Không có prompt để tối ưu.', type: 'error' });
      return;
    }

    setIsOptimizing(true);
    setOptimizationResult('');
    setOptimizedPrompt('');

    try {
      const response = await optimizePrompt({
        prompt: finalPromptText,
        context: 'Trích xuất thông tin tour từ hình ảnh chương trình du lịch',
        optimizationType,
      });

      setOptimizedPrompt(response.optimizedPrompt || response.prompt || '');
      setOptimizationResult(response.explanation || response.reasoning || '');
      
      showToast({ 
        message: 'Đã tối ưu prompt thành công!', 
        type: 'success' 
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // Show specific error message
      showToast({ 
        message: errorMessage, 
        type: 'error' 
      });

      // Offer fallback optimization
      if (errorMessage.includes('không tồn tại') || errorMessage.includes('chưa được hỗ trợ')) {
        const shouldUseFallback = window.confirm(
          'Tính năng tối ưu prompt bằng AI chưa khả dụng. Bạn có muốn sử dụng tối ưu cơ bản (local) không?'
        );
        
        if (shouldUseFallback) {
          const { optimized, explanation } = performFallbackOptimization(finalPromptText, optimizationType);
          setOptimizedPrompt(optimized);
          setOptimizationResult(`Tối ưu cơ bản: ${explanation}`);
          
          showToast({ 
            message: 'Đã áp dụng tối ưu cơ bản.', 
            type: 'info' 
          });
        }
      }
    } finally {
      setIsOptimizing(false);
    }
  };

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

      // Save image to browser storage if checkbox is checked
      if (saveImageToBrowser && uploadedFile) {
        try {
          const savedImage = await saveImageToStorage(uploadedFile);
          setSavedImages(prev => [savedImage, ...prev.slice(0, 9)]); // Keep only 10 images
          showToast({ 
            message: `Đã lưu ảnh "${uploadedFile.name}" vào trình duyệt.`, 
            type: 'success' 
          });
        } catch (error) {
          showToast({ 
            message: `Không thể lưu ảnh: ${(error as Error).message}`, 
            type: 'error' 
          });
        }
      }

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
    // Use optimized prompt if available and enabled, otherwise use custom/composed prompt
    const basePrompt = optimizedPrompt.trim() || customPrompt.trim() || composedPrompt;
    
    // Add desired JSON format instruction
    const jsonFormatInstruction = `\n\nIMPORTANT: Please return the extracted data in the following JSON format:\n\`\`\`json\n${desiredJsonFormat}\n\`\`\`\n\nMake sure to fill in the actual values and replace placeholders like "(Tour Code)", "(Guide Name)", etc. with the real data from the image.`;
    
    const sections = [promptData?.prompt, basePrompt]
      .map((section) => section?.trim())
      .filter((section): section is string => Boolean(section && section.length > 0));
    
    return sections.join('\n\n---\n\n') + jsonFormatInstruction;
  }, [optimizedPrompt, customPrompt, composedPrompt, promptData?.prompt, desiredJsonFormat]);

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
      <CollapsibleSection
        title="Trích xuất Gemini"
        subtitle="Nhận diện từ ảnh chương trình tour"
        isExpanded={sectionStates.upload}
        onToggle={() => toggleSection('upload')}
      >
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
                <div className="mt-3 space-y-3">
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
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
                  
                  {/* Save to browser checkbox */}
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <input
                      id="saveImageToBrowser"
                      type="checkbox"
                      checked={saveImageToBrowser}
                      onChange={(e) => setSaveImageToBrowser(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="saveImageToBrowser" className="text-sm text-slate-700">
                      <span className="font-medium">Lưu ảnh vào trình duyệt</span>
                      <span className="block text-xs text-slate-500">
                        Ảnh sẽ được lưu trong localStorage để sử dụng lại sau này
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setUploadedFile(null);
                  setFilePreviewUrl(null);
                  setOverrides('');
                  setCustomPrompt('');
                  setSaveImageToBrowser(false);
                  setOptimizePromptEnabled(false);
                  setOptimizedPrompt('');
                  setOptimizationResult('');
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
      </CollapsibleSection>

      {/* Custom Prompt Section */}
      <CollapsibleSection
        title="Prompt Tùy Chỉnh"
        subtitle="Nhập prompt tùy chỉnh để hướng dẫn Gemini"
        isExpanded={sectionStates.customPrompt}
        onToggle={() => toggleSection('customPrompt')}
      >
        <div>
          <p className="text-xs text-slate-500 mb-3">
            Nhập prompt tùy chỉnh để hướng dẫn Gemini trích xuất thông tin. Để trống để sử dụng prompt mặc định từ hệ thống.
          </p>
          <textarea
            rows={6}
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            placeholder="Ví dụ: Hãy trích xuất thông tin tour từ hình ảnh này, bao gồm mã tour, tên guide, ngày bắt đầu và kết thúc..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
          />
        </div>
      </CollapsibleSection>

      {/* JSON Format Section */}
      <CollapsibleSection
        title="Định Dạng JSON"
        subtitle="Cấu trúc JSON mong muốn cho kết quả"
        isExpanded={sectionStates.jsonFormat}
        onToggle={() => toggleSection('jsonFormat')}
      >
        <div>
          <p className="text-xs text-slate-500 mb-3">
            Định nghĩa cấu trúc JSON mà bạn muốn Gemini trả về. Sử dụng placeholder như "(Tour Code)", "(Guide Name)" để chỉ định vị trí cần điền.
          </p>
          <textarea
            rows={12}
            value={desiredJsonFormat}
            onChange={(event) => setDesiredJsonFormat(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-primary-400 focus:ring-0"
          />
        </div>
      </CollapsibleSection>

      {/* Overrides Section */}
      <CollapsibleSection
        title="Ghi Đè Cấu Hình"
        subtitle="JSON để ghi đè thông tin mặc định"
        isExpanded={sectionStates.overrides}
        onToggle={() => toggleSection('overrides')}
      >
        <div>
          <p className="text-xs text-slate-500 mb-3">
            Cung cấp JSON để ghi đè thông tin mặc định khi gọi Gemini (ví dụ instructionId, schema...).
          </p>
          <textarea
            rows={4}
            value={overrides}
            onChange={(event) => setOverrides(event.target.value)}
            placeholder='{ "instructionId": "..." }'
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-0"
          />
        </div>
      </CollapsibleSection>

      {/* Saved Prompts Section */}
      {savedPromptsData?.prompts && savedPromptsData.prompts.length > 0 && (
        <CollapsibleSection
          title="Prompt Đã Lưu"
          subtitle="Prompt tùy chỉnh đã lưu"
          isExpanded={sectionStates.savedPrompts}
          onToggle={() => toggleSection('savedPrompts')}
        >
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => refetchSavedPrompts()}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Làm mới
            </button>
          </div>
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
        </CollapsibleSection>
      )}

      {/* Saved Images Section */}
      {savedImages.length > 0 && (
        <CollapsibleSection
          title="Ảnh Đã Lưu"
          subtitle="Ảnh đã lưu trong trình duyệt"
          isExpanded={sectionStates.savedImages}
          onToggle={() => toggleSection('savedImages')}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-500">
              {savedImages.length} ảnh
            </span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xóa tất cả ảnh đã lưu?')) {
                  localStorage.removeItem('saved_images');
                  setSavedImages([]);
                  showToast({ message: 'Đã xóa tất cả ảnh đã lưu.', type: 'success' });
                }
              }}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Xóa tất cả
            </button>
          </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedImages.map((image) => (
                <div
                  key={image.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={`data:${image.mimeType};base64,${image.base64}`}
                      alt={image.name}
                      className="h-16 w-16 rounded-md object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 truncate">
                        {image.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatFileSize(image.size)} · {image.mimeType}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Lưu: {new Date(image.savedAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        // Convert base64 back to File object
                        const byteCharacters = atob(image.base64);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                          byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const file = new File([byteArray], image.name, { type: image.mimeType });
                        
                        setUploadedFile(file);
                        setFilePreviewUrl(`data:${image.mimeType};base64,${image.base64}`);
                        showToast({ 
                          message: `Đã tải lại ảnh "${image.name}"`, 
                          type: 'success' 
                        });
                      }}
                      className="px-3 py-1 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 transition-colors"
                    >
                      Sử dụng
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Bạn có chắc chắn muốn xóa ảnh "${image.name}"?`)) {
                          deleteSavedImage(image.id);
                          setSavedImages(prev => prev.filter(img => img.id !== image.id));
                          showToast({ message: 'Đã xóa ảnh.', type: 'success' });
                        }
                      }}
                      className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Prompt hiện tại"
        subtitle="Hướng dẫn & Schema"
        isExpanded={sectionStates.currentPrompt}
        onToggle={() => toggleSection('currentPrompt')}
      >
        {/* Prompt Optimization Controls */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Tối ưu Prompt bằng AI</h3>
              <p className="text-xs text-blue-700">
                Sử dụng AI để cải thiện chất lượng prompt trước khi gửi đến Gemini
              </p>
              <p className="text-xs text-blue-600 mt-1">
                💡 Nếu AI không khả dụng, hệ thống sẽ đề xuất tối ưu cơ bản
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="optimizePromptEnabled"
                type="checkbox"
                checked={optimizePromptEnabled}
                onChange={(e) => setOptimizePromptEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="optimizePromptEnabled" className="text-sm text-blue-900">
                Bật tối ưu
              </label>
            </div>
          </div>
          
          {optimizePromptEnabled && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-blue-800">Loại tối ưu:</label>
                <select
                  value={optimizationType}
                  onChange={(e) => setOptimizationType(e.target.value as any)}
                  className="rounded-md border border-blue-300 px-3 py-1 text-sm focus:border-blue-500 focus:ring-0"
                >
                  <option value="all">Tất cả</option>
                  <option value="clarity">Rõ ràng</option>
                  <option value="structure">Cấu trúc</option>
                  <option value="completeness">Hoàn chỉnh</option>
                </select>
                <button
                  type="button"
                  onClick={handleOptimizePrompt}
                  disabled={isOptimizing || !finalPromptText.trim()}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isOptimizing ? 'Đang tối ưu...' : 'Tối ưu Prompt'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await optimizePrompt({
                        prompt: 'Test prompt',
                        context: 'Test',
                        optimizationType: 'all'
                      });
                      showToast({ message: '✅ Kết nối API thành công!', type: 'success' });
                    } catch (error) {
                      showToast({ 
                        message: `❌ ${(error as Error).message}`, 
                        type: 'error' 
                      });
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Test API
                </button>
              </div>
              
              {optimizationResult && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Giải thích tối ưu:</h4>
                  <p className="text-xs text-green-700">{optimizationResult}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-700">Prompt cuối cùng</p>
            {optimizedPrompt && (
              <div className="mb-2 rounded-md border border-green-200 bg-green-50 p-2">
                <p className="text-xs font-medium text-green-800">✓ Đã sử dụng prompt tối ưu</p>
              </div>
            )}
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

        {/* Optimized Prompt Preview */}
        {optimizedPrompt && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-green-900">Prompt đã tối ưu</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOptimizedPrompt('');
                    setOptimizationResult('');
                    showToast({ message: 'Đã xóa prompt tối ưu.', type: 'info' });
                  }}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(optimizedPrompt);
                    showToast({ message: 'Đã sao chép prompt tối ưu.', type: 'success' });
                  }}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  Copy
                </button>
              </div>
            </div>
            <textarea
              readOnly
              rows={8}
              value={optimizedPrompt}
              className="w-full rounded-lg border border-green-300 bg-white px-3 py-2 text-sm text-slate-700 font-mono"
            />
          </div>
        )}
      </CollapsibleSection>

      {rawOutput ? (
        <CollapsibleSection
          title="Kết quả Gemini"
          subtitle="Dữ liệu trích xuất"
          isExpanded={sectionStates.results}
          onToggle={() => toggleSection('results')}
        >
          {parsedJson ? (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={handleLoadToTour}
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
              >
                Đưa vào biểu mẫu tour
              </button>
            </div>
          ) : null}
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
        </CollapsibleSection>
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

import { STORAGE_KEYS } from '../../constants/storageKeys';

const DEFAULT_API_BASE = 'https://api-l6zybqif7q-as.a.run.app';

const resolveApiBaseUrl = () => {
  const candidates = [
    import.meta.env.VITE_API_BASE,
    import.meta.env.VITE_CLOUD_FUNCTIONS_URL,
    DEFAULT_API_BASE,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;

    const trimmed = candidate.trim();
    if (!trimmed) continue;

    const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
    if (!withoutTrailingSlash) continue;

    if (/\/api(\/|$)/.test(withoutTrailingSlash)) {
      return withoutTrailingSlash;
    }

    return `${withoutTrailingSlash}/api`;
  }

  return DEFAULT_API_BASE;
};

const BASE_URL = resolveApiBaseUrl();

const resolveApiKey = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEYS.apiKey) ?? '';
};

const withApiKey = (headers: HeadersInit = {}) => {
  const apiKey = resolveApiKey();
  if (!apiKey) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${apiKey}`,
  } as HeadersInit;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    
    // Handle HTML error responses (like 404 pages)
    if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
      if (response.status === 404) {
        throw new Error('API endpoint không tồn tại. Vui lòng kiểm tra cấu hình server.');
      } else if (response.status === 500) {
        throw new Error('Lỗi server nội bộ. Vui lòng thử lại sau.');
      } else {
        throw new Error(`Lỗi server (${response.status}). Vui lòng kiểm tra kết nối.`);
      }
    }
    
    // Handle JSON error responses
    try {
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || errorData.error || text || response.statusText);
    } catch {
      // If not JSON, use the text or status text
      throw new Error(text || response.statusText);
    }
  }
  return response.json();
};

export const fetchLatestPrompt = async () => {
  const res = await fetch(`${BASE_URL}/prompt/latest`, {
    headers: withApiKey(),
  });
  return handleResponse(res);
};

export const fetchActiveSchemaFromApi = async () => {
  const res = await fetch(`${BASE_URL}/schemas/active`, {
    headers: withApiKey(),
  });
  return handleResponse(res);
};

export const requestAiExtraction = async (body: {
  imageUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  imageName?: string;
  prompt?: string;
  overrides?: Record<string, unknown>;
}) => {
  const res = await fetch(`${BASE_URL}/ai/extract`, {
    method: 'POST',
    headers: withApiKey({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
};

export const exportMasterDataCsv = async (type: string) => {
  const res = await fetch(`${BASE_URL}/master-data/${type}`, {
    headers: withApiKey(),
  });
  return handleResponse(res);
};

export const importMasterDataCsv = async (payload: { type: string; rows: unknown[] }) => {
  const res = await fetch(`${BASE_URL}/master-data/import`, {
    method: 'POST',
    headers: withApiKey({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

// Custom Prompt API functions
export interface CustomPrompt {
  id: string;
  prompt: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export const saveCustomPrompt = async (data: {
  prompt: string;
  name?: string;
  description?: string;
}) => {
  const res = await fetch(`${BASE_URL}/prompt/save`, {
    method: 'POST',
    headers: withApiKey({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return handleResponse(res) as Promise<CustomPrompt>;
};

export const fetchSavedPrompts = async () => {
  const res = await fetch(`${BASE_URL}/prompt/saved`, {
    headers: withApiKey(),
  });
  return handleResponse(res) as Promise<{ prompts: CustomPrompt[] }>;
};

export const incrementPromptUsage = async (promptId: string) => {
  const res = await fetch(`${BASE_URL}/prompt/${promptId}/use`, {
    method: 'POST',
    headers: withApiKey(),
  });
  return handleResponse(res);
};

// Prompt Optimization API functions
export const optimizePrompt = async (body: {
  prompt: string;
  context?: string;
  optimizationType?: 'clarity' | 'structure' | 'completeness' | 'all';
}) => {
  try {
    const res = await fetch(`${BASE_URL}/ai/optimize-prompt`, {
      method: 'POST',
      headers: withApiKey({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  } catch (error) {
    // Provide more specific error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet và cấu hình API.');
    }
    
    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.message.includes('404') || error.message.includes('không tồn tại')) {
        throw new Error('Tính năng tối ưu prompt chưa được hỗ trợ trên server này. Vui lòng liên hệ quản trị viên.');
      }
      
      if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('Không có quyền truy cập tính năng tối ưu prompt. Vui lòng kiểm tra API key.');
      }
      
      if (error.message.includes('500')) {
        throw new Error('Server đang gặp sự cố. Vui lòng thử lại sau.');
      }
      
      // Re-throw the original error if it's already user-friendly
      throw error;
    }
    
    throw new Error('Đã xảy ra lỗi không xác định khi tối ưu prompt.');
  }
};

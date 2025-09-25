import { STORAGE_KEYS } from '../../constants/storageKeys';

const BASE_URL = import.meta.env.VITE_CLOUD_FUNCTIONS_URL ?? 'https://asia-southeast1-quantum-ratio-468010-d4.cloudfunctions.net';

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
    throw new Error(text || response.statusText);
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

export const requestAiExtraction = async (body: { imageUrl: string; overrides?: Record<string, unknown> }) => {
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

const BASE_URL = import.meta.env.VITE_CLOUD_FUNCTIONS_URL ?? 'https://asia-southeast1-quantum-ratio-468010-d4.cloudfunctions.net';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};

export const fetchLatestPrompt = async () => {
  const res = await fetch(`${BASE_URL}/prompt/latest`);
  return handleResponse(res);
};

export const fetchActiveSchemaFromApi = async () => {
  const res = await fetch(`${BASE_URL}/schemas/active`);
  return handleResponse(res);
};

export const requestAiExtraction = async (body: { imageUrl: string; overrides?: Record<string, unknown> }) => {
  const res = await fetch(`${BASE_URL}/ai/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
};

export const exportMasterDataCsv = async (type: string) => {
  const res = await fetch(`${BASE_URL}/master-data/${type}`);
  return handleResponse(res);
};

export const importMasterDataCsv = async (payload: { type: string; rows: unknown[] }) => {
  const res = await fetch(`${BASE_URL}/master-data/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

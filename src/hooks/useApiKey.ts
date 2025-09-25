import { useContext } from 'react';
import { ApiKeyContext } from '../providers/apiKeyContext';

export const useApiKey = () => {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error('useApiKey phải được sử dụng trong ApiKeyProvider');
  return ctx;
};

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { ApiKeyContext } from './apiKeyContext';

const readFromStorage = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEYS.apiKey) ?? '';
};

export const ApiKeyProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKey] = useState<string>(() => readFromStorage());

  useEffect(() => {
    setApiKey(readFromStorage());
  }, []);

  const persist = useCallback((value: string) => {
    if (typeof window === 'undefined') return;
    if (value) {
      window.localStorage.setItem(STORAGE_KEYS.apiKey, value);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.apiKey);
    }
  }, []);

  const updateApiKey = useCallback(
    (value: string) => {
      setApiKey(value);
      persist(value);
    },
    [persist],
  );

  const clearApiKey = useCallback(() => {
    setApiKey('');
    persist('');
  }, [persist]);

  const value = useMemo(() => ({ apiKey, updateApiKey, clearApiKey }), [apiKey, updateApiKey, clearApiKey]);

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
};

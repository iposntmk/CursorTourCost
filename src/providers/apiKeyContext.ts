import { createContext } from 'react';

export type ApiKeyContextValue = {
  apiKey: string;
  updateApiKey: (value: string) => void;
  clearApiKey: () => void;
};

export const ApiKeyContext = createContext<ApiKeyContextValue | undefined>(undefined);

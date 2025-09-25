import { createContext } from 'react';
import { TourData } from '../types/tour';

export type TourDraftContextValue = {
  draft: TourData | null;
  rawGeminiData: unknown;
  setDraft: (value: TourData | null, rawData?: unknown) => void;
  resetDraft: () => void;
};

export const TourDraftContext = createContext<TourDraftContextValue | undefined>(undefined);

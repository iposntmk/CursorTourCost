import { createContext } from 'react';
import { TourData } from '../types/tour';

export type TourDraftContextValue = {
  draft: TourData | null;
  setDraft: (value: TourData | null) => void;
  resetDraft: () => void;
};

export const TourDraftContext = createContext<TourDraftContextValue | undefined>(undefined);

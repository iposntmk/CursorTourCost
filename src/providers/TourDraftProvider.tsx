import { ReactNode, createContext, useContext, useMemo, useState } from 'react';
import { TourData } from '../types/tour';

type TourDraftContextValue = {
  draft: TourData | null;
  setDraft: (value: TourData | null) => void;
  resetDraft: () => void;
};

const TourDraftContext = createContext<TourDraftContextValue | undefined>(undefined);

export const TourDraftProvider = ({ children }: { children: ReactNode }) => {
  const [draft, setDraft] = useState<TourData | null>(null);

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      resetDraft: () => setDraft(null),
    }),
    [draft],
  );

  return <TourDraftContext.Provider value={value}>{children}</TourDraftContext.Provider>;
};

export const useTourDraft = () => {
  const ctx = useContext(TourDraftContext);
  if (!ctx) throw new Error('useTourDraft must be used within TourDraftProvider');
  return ctx;
};

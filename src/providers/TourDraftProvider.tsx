import { ReactNode, useMemo, useState } from 'react';
import { TourDraftContext } from './tourDraftContext';
import { TourData } from '../types/tour';

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

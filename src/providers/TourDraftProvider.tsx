import { ReactNode, useMemo, useState, useEffect } from 'react';
import { TourDraftContext } from './tourDraftContext';
import { TourData } from '../types/tour';

const DRAFT_STORAGE_KEY = 'tour-draft';

export const TourDraftProvider = ({ children }: { children: ReactNode }) => {
  const [draft, setDraft] = useState<TourData | null>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        setDraft(parsedDraft);
      }
    } catch (error) {
      console.error('Failed to load draft from localStorage:', error);
    }
  }, []);

  // Save draft to localStorage whenever it changes
  useEffect(() => {
    if (draft) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (error) {
        console.error('Failed to save draft to localStorage:', error);
      }
    } else {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [draft]);

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

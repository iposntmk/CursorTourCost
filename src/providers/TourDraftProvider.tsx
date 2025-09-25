import { ReactNode, useMemo, useState, useEffect } from 'react';
import { TourDraftContext } from './tourDraftContext';
import { TourData } from '../types/tour';

const DRAFT_STORAGE_KEY = 'tour-draft';
const RAW_DATA_STORAGE_KEY = 'tour-draft-raw';

export const TourDraftProvider = ({ children }: { children: ReactNode }) => {
  const [draft, setDraft] = useState<TourData | null>(null);
  const [rawGeminiData, setRawGeminiData] = useState<unknown>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      const savedRawData = localStorage.getItem(RAW_DATA_STORAGE_KEY);
      
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        setDraft(parsedDraft);
      }
      
      if (savedRawData) {
        const parsedRawData = JSON.parse(savedRawData);
        setRawGeminiData(parsedRawData);
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

  // Save raw data to localStorage whenever it changes
  useEffect(() => {
    if (rawGeminiData) {
      try {
        localStorage.setItem(RAW_DATA_STORAGE_KEY, JSON.stringify(rawGeminiData));
      } catch (error) {
        console.error('Failed to save raw data to localStorage:', error);
      }
    } else {
      localStorage.removeItem(RAW_DATA_STORAGE_KEY);
    }
  }, [rawGeminiData]);

  const handleSetDraft = (value: TourData | null, rawData?: unknown) => {
    setDraft(value);
    if (rawData !== undefined) {
      setRawGeminiData(rawData);
    }
  };

  const handleResetDraft = () => {
    setDraft(null);
    setRawGeminiData(null);
  };

  const value = useMemo(
    () => ({
      draft,
      rawGeminiData,
      setDraft: handleSetDraft,
      resetDraft: handleResetDraft,
    }),
    [draft, rawGeminiData],
  );

  return <TourDraftContext.Provider value={value}>{children}</TourDraftContext.Provider>;
};

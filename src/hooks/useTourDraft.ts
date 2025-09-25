import { useContext } from 'react';
import { TourDraftContext } from '../providers/tourDraftContext';

export const useTourDraft = () => {
  const ctx = useContext(TourDraftContext);
  if (!ctx) throw new Error('useTourDraft phải được sử dụng trong TourDraftProvider');
  return ctx;
};

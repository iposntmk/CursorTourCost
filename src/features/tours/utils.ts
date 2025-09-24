import { TourData } from '../../types/tour';

export const calculateCostTotals = (tour: TourData) => {
  const costSum = tour.danh_sach_chi_phi.reduce((total, item) => total + (Number(item.thanh_tien) || 0), 0);
  const lunchSum = tour.an.an_trua.reduce((total, item) => total + (Number(item.thanh_tien) || 0), 0);
  const dinnerSum = tour.an.an_toi.reduce((total, item) => total + (Number(item.thanh_tien) || 0), 0);
  const tip = Number(tour.tip?.so_tien_tip ?? 0);
  return {
    costSum,
    lunchSum,
    dinnerSum,
    tip,
    grandTotal: costSum + lunchSum + dinnerSum + tip,
  };
};

export const normalizeNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const ensureArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

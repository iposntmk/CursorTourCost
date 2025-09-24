import { Timestamp } from 'firebase/firestore';

export const timestampToDate = (value: unknown) => {
  if (!value) return null;
  if (typeof value === 'string') return new Date(value);
  if (value instanceof Timestamp) return value.toDate();
  return null;
};

export const timestampToISO = (value: unknown) => {
  const date = timestampToDate(value);
  return date ? date.toISOString() : undefined;
};

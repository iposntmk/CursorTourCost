import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

export const DATE_FORMAT = 'DD/MM/YYYY';

export const formatVietnamDate = (value?: string | Date | number | null) => {
  if (!value) return '';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(DATE_FORMAT) : '';
};

export const parseVietnamDate = (value: string) => {
  if (!value) return dayjs('');
  return dayjs(value, [DATE_FORMAT, 'YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY-MM-DDTHH:mm:ssZ'], true);
};

export default dayjs;

import { ensureArray, normalizeNumber } from '../tours/utils';
import { TourData, createEmptyTour } from '../../types/tour';

const ensureString = (value: unknown) => (typeof value === 'string' ? value : '');

const parseTextResponse = (text: string): TourData => {
  const base = createEmptyTour();
  
  // Try to extract JSON from markdown code block first
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1].trim();
      const parsedJson = JSON.parse(jsonStr);
      // If we successfully parsed JSON, use the existing logic for JSON objects
      return normalizeAiTour(parsedJson);
    } catch (error) {
      console.warn('Failed to parse JSON from markdown block:', error);
      // Fall through to text parsing
    }
  }
  
  // Extract data from markdown-like text format
  const extractValue = (pattern: RegExp): string => {
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  };
  
  // Parse various field patterns
  const maTour = extractValue(/\*\*ma_tour:\*\*\s*([^\n*]+)/i) || 
                 extractValue(/ma_tour[:\s]+([^\n*]+)/i) ||
                 extractValue(/LIV[-\s]+NITAY[-\s]*(\d+)/i);
  
  const guideName = extractValue(/\*\*guidename:\*\*\s*([^\n*]+)/i) ||
                   extractValue(/guide[:\s]+([^\n*]+)/i);
  
  const startDate = extractValue(/\*\*ngay_bat_dau:\*\*\s*([^\n*]+)/i) ||
                   extractValue(/start[:\s]+([^\n*]+)/i);
  
  const endDate = extractValue(/\*\*enddate:\*\*\s*([^\n*]+)/i) ||
                 extractValue(/end[:\s]+([^\n*]+)/i);
  
  const nationality = extractValue(/\*\*nationality:\*\*\s*([^\n*]+)/i) ||
                     extractValue(/nationality[:\s]+([^\n*]+)/i);
  
  // Convert date format if needed (DD/MM/YYYY to YYYY-MM-DD)
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    // Handle DD/MM/YYYY format
    const ddmmyyyy = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };
  
  // Populate the base structure
  base.thong_tin_chung.ma_tour = maTour;
  base.thong_tin_chung.ten_guide = guideName;
  base.thong_tin_chung.quoc_tich_khach = nationality;
  base.ngay_bat_dau = formatDate(startDate);
  base.ngay_ket_thuc = formatDate(endDate);
  
  return base;
};

export const normalizeAiTour = (raw: unknown): TourData => {
  const base = createEmptyTour();
  if (!raw) return base;
  
  // Handle case where Gemini returns text instead of structured JSON
  if (typeof raw === 'string') {
    return parseTextResponse(raw);
  }
  
  if (typeof raw !== 'object') return base;
  const source = raw as Record<string, unknown>;
  
  // Handle case where Gemini returns { extractedText: "..." }
  if (source.extractedText && typeof source.extractedText === 'string') {
    return parseTextResponse(source.extractedText);
  }

  const thongTinChung = source.thong_tin_chung as Record<string, unknown> | undefined;

  base.thong_tin_chung = {
    ma_tour: ensureString(thongTinChung?.ma_tour || source.tourCode),
    ten_cong_ty: ensureString(thongTinChung?.ten_cong_ty || source.companyName),
    ten_guide: ensureString(thongTinChung?.ten_guide || source.guideName),
    ten_khach: ensureString(thongTinChung?.ten_khach || source.customerName),
    quoc_tich_khach: ensureString(thongTinChung?.quoc_tich_khach || source.customerNationality),
    so_luong_khach: normalizeNumber(thongTinChung?.so_luong_khach || source.customerCount),
    ten_lai_xe: ensureString(thongTinChung?.ten_lai_xe || source.driverName),
    so_dien_thoai_khach: ensureString(thongTinChung?.so_dien_thoai_khach || source.customerPhone),
  };

  base.ngay_bat_dau = ensureString(source.ngay_bat_dau || source.startDate);
  base.ngay_ket_thuc = ensureString(source.ngay_ket_thuc || source.endDate);
  base.tong_so_ngay_tour = normalizeNumber(source.tong_so_ngay_tour || source.totalDays);

  // Handle danh_sach_ngay_tham_quan - can be array of strings or array of objects
  const ngayThamQuanRaw = source.danh_sach_ngay_tham_quan || source.itineraryDays;
  if (Array.isArray(ngayThamQuanRaw)) {
    base.danh_sach_ngay_tham_quan = ngayThamQuanRaw.map((item) => {
      if (typeof item === 'string') {
        // If it's a string, create object with ngay field
        return {
          ngay: item,
          tinh_thanh: '',
        };
      } else if (typeof item === 'object' && item !== null) {
        // If it's an object, extract fields
        const itemObj = item as Record<string, unknown>;
        return {
          ngay: ensureString(itemObj.ngay || itemObj.date),
          tinh_thanh: ensureString(itemObj.tinh_thanh || itemObj.province),
        };
      }
      return { ngay: '', tinh_thanh: '' };
    });
  }

  // Handle danh_sach_dia_diem - can be nested structure from Gemini
  const diaDiemRaw = source.danh_sach_dia_diem || source.attractions;
  if (Array.isArray(diaDiemRaw)) {
    base.danh_sach_dia_diem = [];
    diaDiemRaw.forEach((item) => {
      if (typeof item === 'object' && item !== null) {
        const itemObj = item as Record<string, unknown>;
        
        // Check if it's the nested structure: { tinh: "...", dia_diem: [...] }
        if (itemObj.tinh && Array.isArray(itemObj.dia_diem)) {
          const tinh = ensureString(itemObj.tinh);
          const diaDiemList = itemObj.dia_diem as string[];
          diaDiemList.forEach((diaDiem) => {
            base.danh_sach_dia_diem.push({
              ten_dia_diem: ensureString(diaDiem),
              gia_ve: 0,
              ten_tinh: tinh,
            });
          });
        } else {
          // Handle flat structure
          base.danh_sach_dia_diem.push({
            ten_dia_diem: ensureString(itemObj.ten_dia_diem || itemObj.name),
            gia_ve: normalizeNumber(itemObj.gia_ve || itemObj.ticketPrice),
            ten_tinh: ensureString(itemObj.ten_tinh || itemObj.province),
          });
        }
      }
    });
  }

  base.danh_sach_chi_phi = ensureArray(source.danh_sach_chi_phi || source.expenses).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay || (item as Record<string, unknown>)?.date),
    loai: ensureString((item as Record<string, unknown>)?.loai || (item as Record<string, unknown>)?.type),
    ten: ensureString((item as Record<string, unknown>)?.ten || (item as Record<string, unknown>)?.name),
    so_luong: normalizeNumber((item as Record<string, unknown>)?.so_luong || (item as Record<string, unknown>)?.quantity),
    don_gia: normalizeNumber((item as Record<string, unknown>)?.don_gia || (item as Record<string, unknown>)?.unitPrice),
    thanh_tien: normalizeNumber((item as Record<string, unknown>)?.thanh_tien || (item as Record<string, unknown>)?.totalAmount),
    ghi_chu: ensureString((item as Record<string, unknown>)?.ghi_chu || (item as Record<string, unknown>)?.note),
  }));

  const an = source.an as Record<string, unknown> | undefined;
  const meals = source.meals as Record<string, unknown> | undefined;
  
  base.an.an_trua = ensureArray(an?.an_trua || meals?.lunch).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay || (item as Record<string, unknown>)?.date),
    ten: ensureString((item as Record<string, unknown>)?.ten || (item as Record<string, unknown>)?.name),
    so_luong: normalizeNumber((item as Record<string, unknown>)?.so_luong || (item as Record<string, unknown>)?.quantity),
    don_gia: normalizeNumber((item as Record<string, unknown>)?.don_gia || (item as Record<string, unknown>)?.unitPrice),
    thanh_tien: normalizeNumber((item as Record<string, unknown>)?.thanh_tien || (item as Record<string, unknown>)?.totalAmount),
  }));

  base.an.an_toi = ensureArray(an?.an_toi || meals?.dinner).map((item) => ({
    ngay: ensureString((item as Record<string, unknown>)?.ngay || (item as Record<string, unknown>)?.date),
    ten: ensureString((item as Record<string, unknown>)?.ten || (item as Record<string, unknown>)?.name),
    so_luong: normalizeNumber((item as Record<string, unknown>)?.so_luong || (item as Record<string, unknown>)?.quantity),
    don_gia: normalizeNumber((item as Record<string, unknown>)?.don_gia || (item as Record<string, unknown>)?.unitPrice),
    thanh_tien: normalizeNumber((item as Record<string, unknown>)?.thanh_tien || (item as Record<string, unknown>)?.totalAmount),
  }));

  // Handle khach_san - can be array of strings or array of objects
  const khachSanRaw = source.khach_san || source.hotels;
  if (Array.isArray(khachSanRaw)) {
    base.khach_san = khachSanRaw.map((item) => {
      if (typeof item === 'string') {
        // If it's a string, create object with ten field
        return {
          ngay: '',
          ten: item,
          dia_chi: '',
          so_dien_thoai: '',
        };
      } else if (typeof item === 'object' && item !== null) {
        // If it's an object, extract fields
        const itemObj = item as Record<string, unknown>;
        return {
          ngay: ensureString(itemObj.ngay || itemObj.date),
          ten: ensureString(itemObj.ten || itemObj.name),
          dia_chi: ensureString(itemObj.dia_chi || itemObj.address),
          so_dien_thoai: ensureString(itemObj.so_dien_thoai || itemObj.dien_thoai || itemObj.phone),
        };
      }
      return { ngay: '', ten: '', dia_chi: '', so_dien_thoai: '' };
    });
  }

  const tip = source.tip as Record<string, unknown> | undefined;
  base.tip = {
    co_tip: Boolean(tip?.co_tip || source.hasTip),
    so_tien_tip: normalizeNumber(tip?.so_tien_tip || source.tipAmount),
  };

  base.ghi_chu = ensureString(source.ghi_chu || source.notes);

  return base;
};

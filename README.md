# Cursor Tour Cost Console

Ứng dụng nội bộ hỗ trợ quản lý tour, master data và quy trình AI Extraction sử dụng Gemini cho đội vận hành du lịch.

## Công nghệ chính

- **Vite + React + TypeScript**
- **Tailwind CSS** cho giao diện responsive (mobile-first)
- **Firebase** (Firestore & Functions) thông qua SDK web
- **React Query** cho data fetching & cache
- **Ajv** để validate JSON output từ AI
- **ExcelJS** + **FileSaver** để xuất báo cáo Excel

## Cấu trúc thư mục nổi bật

```
src/
 ├─ components/         # Card, Layout, trạng thái UI
 ├─ features/
 │   ├─ ai/             # API & utils cho Gemini extraction
 │   ├─ instructions/   # Hooks quản lý instruction/rule/example
 │   ├─ master-data/    # Hooks CRUD master data
 │   ├─ schemas/        # Hooks quản lý JSON schema
 │   └─ tours/          # Form và utils cho dữ liệu tour
 ├─ providers/          # React context (Query, Tour draft)
 ├─ routes/             # Các trang chính trong ứng dụng
 ├─ types/              # Định nghĩa kiểu dữ liệu
 └─ utils/              # Dayjs helper, convert timestamp, ...
```

## Thiết lập & phát triển

```bash
npm install
npm run dev
```

Tạo file `.env.local` (hoặc cập nhật biến môi trường tương ứng) với cấu hình API:

```
VITE_API_BASE=https://api-l6zybqif7q-as.a.run.app
```

Hàm `resolveApiBaseUrl` trong `src/features/ai/api.ts` sẽ tự thêm hậu tố `/api` nếu cần, nên chỉ cần cung cấp domain gốc của dịch vụ Cloud Run. Khi triển khai production, thay giá trị trên bằng domain thực tế của Cloud Run. Nếu cần gọi emulator
local, đặt `VITE_API_BASE=http://127.0.0.1:5001/<project>/<region>/api`.

Ứng dụng đọc cấu hình Firebase trực tiếp từ `src/lib/firebase.ts`. Có thể bật emulator bằng cách set `VITE_USE_FIREBASE_EMULATORS=true` trong `.env.local`.

## Chức năng chính

- **Dashboard**: số liệu tổng quan tour, prompt, schema, log Gemini.
- **Tour**: CRUD tour nội bộ, preview, validate schema, xuất Excel từng tour và toàn bộ.
- **AI Extraction**: gọi Cloud Function `POST /ai/extract`, kiểm tra JSON bằng Ajv, đẩy data vào form tour.
- **Instruction Manager**: tạo/chỉnh sửa instruction, rule, example, xem prompt compose.
- **Schema Editor**: quản lý, kiểm tra JSON schema và sample JSON.
- **Master Data**: CRUD, import nhanh, import/export CSV cho guides, companies, provinces, locations, cost types/items, shopping.
- **Extraction Log**: xem lịch sử gọi Gemini.
- **Reports**: xuất Excel hàng loạt theo chuẩn công ty.

## Lưu ý bảo trì

- Tất cả hook Firestore nằm trong `src/features/*/hooks` sử dụng React Query để cache và invalidate.
- `TourDraftProvider` lưu dữ liệu tạm sau khi gọi AI để đổ vào form `/tours/new`.
- Ajv được cấu hình tại `src/lib/ajv.ts` (coerceTypes + useDefaults) đảm bảo JSON chuẩn.
- Tailwind được cấu hình mobile-first, màu chủ đạo trong `tailwind.config.js`.
- Khi mở rộng master data, chỉ cần thêm cấu hình mới vào `MASTER_DATA_CONFIGS`.

## Kiểm thử

Sử dụng `npm run build` để đảm bảo TypeScript & Vite build thành công. Có thể bổ sung `npm run lint` sau khi cấu hình ESLint theo chuẩn nội bộ.

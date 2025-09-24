export type MasterDataType =
  | 'guides'
  | 'companies'
  | 'nationalities'
  | 'provinces'
  | 'locations'
  | 'cost_types'
  | 'cost_items'
  | 'shopping';

type FieldKind = 'text' | 'number' | 'textarea' | 'select';

export type MasterDataField = {
  key: string;
  label: string;
  type?: FieldKind;
  referenceType?: MasterDataType;
  optional?: boolean;
  helperText?: string;
};

export type MasterDataRecord = {
  id?: string;
  name: string;
  [key: string]: unknown;
};

export type MasterDataConfig = {
  type: MasterDataType;
  label: string;
  collection: string;
  description?: string;
  fields: MasterDataField[];
  csvHeaders: string[];
  bulkPlaceholder?: string;
};

export const MASTER_DATA_CONFIGS: Record<MasterDataType, MasterDataConfig> = {
  guides: {
    type: 'guides',
    label: 'Hướng dẫn viên',
    collection: 'master_guides',
    description: 'Quản lý danh sách hướng dẫn viên nội bộ.',
    fields: [
      { key: 'name', label: 'Tên hướng dẫn viên', type: 'text' },
      { key: 'phone', label: 'Số điện thoại', type: 'text', optional: true },
      { key: 'email', label: 'Email', type: 'text', optional: true },
      { key: 'languages', label: 'Ngôn ngữ', type: 'textarea', optional: true, helperText: 'Nhập danh sách ngôn ngữ, mỗi dòng một ngôn ngữ.' },
    ],
    csvHeaders: ['name', 'phone', 'email', 'languages'],
    bulkPlaceholder: 'Tên hướng dẫn viên | Số điện thoại | Email',
  },
  companies: {
    type: 'companies',
    label: 'Công ty',
    collection: 'master_companies',
    description: 'Đối tác công ty du lịch.',
    fields: [
      { key: 'name', label: 'Tên công ty', type: 'text' },
      { key: 'contact', label: 'Người liên hệ', type: 'text', optional: true },
      { key: 'phone', label: 'Số điện thoại', type: 'text', optional: true },
      { key: 'email', label: 'Email', type: 'text', optional: true },
    ],
    csvHeaders: ['name', 'contact', 'phone', 'email'],
    bulkPlaceholder: 'Tên công ty | Người liên hệ | Điện thoại',
  },
  nationalities: {
    type: 'nationalities',
    label: 'Quốc tịch',
    collection: 'master_nationalities',
    description: 'Danh sách quốc tịch khách.',
    fields: [
      { key: 'name', label: 'Tên quốc tịch', type: 'text' },
      { key: 'code', label: 'Mã (ISO)', type: 'text', optional: true },
    ],
    csvHeaders: ['name', 'code'],
    bulkPlaceholder: 'Việt Nam | VN',
  },
  provinces: {
    type: 'provinces',
    label: 'Tỉnh/Thành',
    collection: 'master_provinces',
    description: 'Danh sách tỉnh thành của Việt Nam.',
    fields: [
      { key: 'name', label: 'Tên tỉnh', type: 'text' },
      { key: 'code', label: 'Mã tỉnh', type: 'text', optional: true },
      { key: 'region', label: 'Vùng', type: 'text', optional: true },
    ],
    csvHeaders: ['name', 'code', 'region'],
    bulkPlaceholder: 'Hà Nội | HN | Miền Bắc',
  },
  locations: {
    type: 'locations',
    label: 'Điểm tham quan',
    collection: 'master_locations',
    description: 'Địa điểm tham quan gắn với tỉnh/thành.',
    fields: [
      { key: 'name', label: 'Tên địa điểm', type: 'text' },
      {
        key: 'provinceId',
        label: 'Thuộc tỉnh',
        type: 'select',
        referenceType: 'provinces',
        helperText: 'Chọn tỉnh/thành tương ứng với địa điểm.',
      },
      { key: 'address', label: 'Địa chỉ', type: 'text', optional: true },
      { key: 'ticket_price', label: 'Giá vé tham khảo', type: 'number', optional: true },
    ],
    csvHeaders: ['name', 'provinceId', 'address', 'ticket_price'],
    bulkPlaceholder: 'Vịnh Hạ Long | <ID tỉnh> | Quảng Ninh',
  },
  cost_types: {
    type: 'cost_types',
    label: 'Loại chi phí',
    collection: 'master_cost_types',
    description: 'Nhóm chi phí sử dụng trong tour.',
    fields: [
      { key: 'name', label: 'Tên loại chi phí', type: 'text' },
      { key: 'description', label: 'Mô tả', type: 'textarea', optional: true },
    ],
    csvHeaders: ['name', 'description'],
    bulkPlaceholder: 'Ăn uống | Chi phí nhà hàng',
  },
  cost_items: {
    type: 'cost_items',
    label: 'Chi phí chi tiết',
    collection: 'master_cost_items',
    description: 'Chi tiết chi phí gắn với loại chi phí.',
    fields: [
      { key: 'name', label: 'Tên chi phí', type: 'text' },
      {
        key: 'costTypeId',
        label: 'Loại chi phí',
        type: 'select',
        referenceType: 'cost_types',
        helperText: 'Chọn loại chi phí tương ứng.',
      },
      { key: 'default_unit', label: 'Đơn vị', type: 'text', optional: true },
      { key: 'default_price', label: 'Đơn giá mặc định', type: 'number', optional: true },
    ],
    csvHeaders: ['name', 'costTypeId', 'default_unit', 'default_price'],
    bulkPlaceholder: 'Vé tham quan | <ID loại> | vé | 200000',
  },
  shopping: {
    type: 'shopping',
    label: 'Điểm mua sắm',
    collection: 'master_shopping',
    description: 'Danh sách điểm mua sắm, quà lưu niệm.',
    fields: [
      { key: 'name', label: 'Tên điểm mua sắm', type: 'text' },
      { key: 'location', label: 'Địa điểm', type: 'text', optional: true },
      { key: 'notes', label: 'Ghi chú', type: 'textarea', optional: true },
    ],
    csvHeaders: ['name', 'location', 'notes'],
    bulkPlaceholder: 'Chợ Bến Thành | TP.HCM',
  },
};

export const MASTER_DATA_TYPES = Object.keys(MASTER_DATA_CONFIGS) as MasterDataType[];

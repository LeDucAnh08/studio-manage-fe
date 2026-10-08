import api from './api';
export const lifecycleLabels: Record<string, string> = {
  intake: 'Mới tiếp nhận',
  quoting: 'Đang báo giá',
  awaiting_deposit: 'Chờ đặt cọc',
  ready_to_confirm: 'Đã đủ tiền cọc',
  confirmed: 'Đã chốt lịch',
  shooting: 'Đang chụp',
  editing: 'Đang hậu kỳ',
  delivered: 'Đã bàn giao',
  revision_requested: 'Đang chỉnh sửa',
  accepted: 'Khách đã nghiệm thu',
  completed: 'Hoàn tất',
  change_pending: 'Đang xử lý thay đổi',
  cancelled: 'Đã hủy',
};
export type ReportService = 'all' | 'photography' | 'rental' | 'unclassified';
export type ReportView = 'cash' | 'agreed' | 'due' | 'refund';
export const serviceLabels: Record<ReportService, string> = {
  all: 'Tất cả dịch vụ',
  photography: 'Chụp ảnh',
  rental: 'Cho thuê',
  unclassified: 'Chưa phân loại',
};
export const reportMoney = (value = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
export const reportDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const currentReportRange = () => {
  const to = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return { from: to.slice(0, 8) + '01', to };
};
export interface ReportMeta {
  range: { from: string; to: string; days: number };
  generatedAt: string;
}
export interface CashSummary {
  _id: ReportService;
  count: number;
  income: number;
  expense: number;
}
export interface FinancialSummary {
  _id: ReportService;
  count: number;
  agreedValue: number;
  due: number;
  refundDue: number;
  depositHeld: number;
  unsettledSurplus: number;
}
export interface AcceptedSummary {
  _id: ReportService;
  count: number;
  serviceValue: number;
  cancellationValue: number;
}
export interface FinancialRow {
  _id: string;
  referenceId?: string;
  service: ReportService;
  status?: string;
  date?: string;
  type?: 'income' | 'expense';
  amount?: number;
  valueAt?: string;
  valueKind?: string;
  fee?: number;
  netReceived?: number;
  due?: number;
  refundDue?: number;
  depositHeld?: number;
}
export interface FinanceReport extends ReportMeta {
  cash: CashSummary[];
  snapshot: FinancialSummary[];
  accepted: AcceptedSummary[];
  rows: FinancialRow[];
  view: ReportView;
  service: ReportService;
}
export interface InventoryRow {
  costumeId: string;
  name: string;
  size: string;
  good: number;
  photographyDays: number;
  rentalDays: number;
  peak: number;
  overCapacityDays: number;
  unknownSchedules: number;
  invalidIntervals: number;
  utilization: number | null;
  missingCostume: boolean;
}
export interface InventoryReport extends ReportMeta {
  summary: {
    good: number;
    photographyDays: number;
    rentalDays: number;
    conflictRows: number;
    unknownSchedules: number;
    missingCostumes: number;
    invalidIntervals: number;
    overdueOrders: number;
  };
  rows: InventoryRow[];
}
export interface ReportResponse<T> {
  data: T;
  pagination: { total: number; page: number; limit: number };
}
export const reportService = {
  finance: async (
    params: { from: string; to: string; view: ReportView; service: ReportService; page: number },
    signal: AbortSignal,
  ) => (await api.get<ReportResponse<FinanceReport>>('/reports/finance', { params, signal })).data,
  inventory: async (
    params: { from: string; to: string; q: string; page: number },
    signal: AbortSignal,
  ) =>
    (await api.get<ReportResponse<InventoryReport>>('/reports/inventory', { params, signal })).data,
};

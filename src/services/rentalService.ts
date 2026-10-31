import api from './api';
import type { ApiResponse } from '../types';

export interface RentalLine {
  costumeId: string;
  name: string;
  size: string;
  quantity: number;
  unitPrice?: number;
}
export interface RentalQuote {
  version: number;
  pricingMode?: 'daily' | 'period';
  rentalDays?: number;
  lines: RentalLine[];
  receiveDate: string;
  returnDate: string;
  fee?: number;
  deposit?: number;
  terms: string[];
  acceptedAt?: string;
}
export interface RentalChange {
  _id: string;
  kind: 'extend' | 'cancel';
  status: string;
  returnDate?: string;
  finalFee?: number;
  note: string;
  terms: string[];
}
export interface RentalSettlement {
  version: number;
  charges: Array<{ label: string; amount: number }>;
  total: number;
  note: string;
  proposedAt?: string;
  acceptedAt?: string;
}
export interface RentalOrder {
  _id: string;
  version: number;
  status: string;
  pricingMode?: 'daily' | 'period';
  reservationIssue?: string | null;
  contactName: string;
  phone?: string;
  note: string;
  requestedLines: RentalLine[];
  requestedReceiveDate: string;
  requestedReturnDate: string;
  quote: RentalQuote | null;
  quoteHistory: RentalQuote[];
  payment?: { netReceived: number; payable: number; due: number; refundDue: number };
  payments?: Array<{
    kind: string;
    amount: number;
    method: string;
    reference?: string;
    at: string;
  }>;
  readyForHandover: boolean;
  checkedOutAt?: string;
  returnedAt?: string;
  returns: Array<{ costumeId: string; size: string; good: number; damaged: number; lost: number }>;
  settlement?: RentalSettlement;
  settlementHistory?: RentalSettlement[];
  change: RentalChange | null;
  changeHistory?: RentalChange[];
  events: Array<{ action: string; message: string; at: string }>;
  feedback?: { rating: number; comment?: string; at?: string };
  createdAt: string;
  updatedAt: string;
}
export interface RentalRequest {
  contactName: string;
  phone: string;
  note: string;
  receiveDate: string;
  returnDate: string;
  lines: Array<{ costumeId: string; size: string; quantity: number }>;
}
export const rentalService = {
  list: (page = 1, view = '') =>
    api
      .get<{
        data: RentalOrder[];
        pagination: { total: number };
      }>('/rentals', { params: { page, ...(view ? { view } : {}) } })
      .then((res) => res.data),
  get: (id: string) =>
    api.get<ApiResponse<RentalOrder>>(`/rentals/${id}`).then((res) => res.data.data),
  create: (data: RentalRequest, key: string) =>
    api
      .post<ApiResponse<RentalOrder>>('/rentals', data, { headers: { 'Idempotency-Key': key } })
      .then((res) => res.data.data),
  act: (
    id: string,
    expectedVersion: number,
    action: string,
    data: Record<string, unknown>,
    key: string,
  ) =>
    api
      .post<
        ApiResponse<RentalOrder>
      >(`/rentals/${id}/actions`, { expectedVersion, action, ...data }, { headers: { 'Idempotency-Key': key } })
      .then((res) => res.data.data),
};
export const rentalLabels: Record<string, string> = {
  requested: 'Chờ studio tư vấn',
  quoting: 'Chờ đồng ý báo giá',
  awaiting_deposit: 'Chờ cọc bảo đảm',
  ready_to_confirm: 'Đủ cọc, chờ giữ hàng',
  confirmed: 'Đã giữ hàng',
  checked_out: 'Đã giao, chờ nhận trả',
  returned: 'Đã nhận trả, chờ đối soát',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  rejected: 'Đã từ chối',
};
export const rentalMoney = (value = 0) => value.toLocaleString('vi-VN') + ' đ';
export const rentalDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const rentalError = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
  'Không thể xử lý. Vui lòng thử lại.';

import api from './api';
import type { ApiResponse } from '../types';
import type { DepositPayment } from './bookingWorkflowService';

export interface RentalPolicy {
  version: string;
  holdMinutes: number;
  maxPending: number;
  leadHours: number;
  turnaroundDays: number;
  openHour: number;
  closeHour: number;
  closedWeekdays: number[];
  terms: string[];
}

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
  orderStage?: RentalStage;
  pricingMode?: 'daily' | 'period';
  autoCheckout?: boolean;
  changesLocked?: boolean;
  reservation?: { status: string; expiresAt: string };
  depositPayment?: DepositPayment | null;
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
  termsAccepted?: boolean;
  policyVersion?: string;
  contactName: string;
  phone: string;
  note: string;
  receiveDate: string;
  returnDate: string;
  lines: Array<{ costumeId: string; size: string; quantity: number }>;
}
export const rentalService = {
  policy: () =>
    api.get<ApiResponse<RentalPolicy>>('/public/rental-policy').then((res) => res.data.data),
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
export const rentalStageLabels = {
  awaiting_confirmation: 'Chờ xác nhận',
  ready_for_pickup: 'Chờ nhận đồ',
  renting: 'Đang thuê',
  settling: 'Chờ đối soát',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};
export type RentalStage = keyof typeof rentalStageLabels;
const statusStages: Record<string, RentalStage> = {
  requested: 'awaiting_confirmation',
  quoting: 'awaiting_confirmation',
  awaiting_deposit: 'awaiting_confirmation',
  ready_to_confirm: 'awaiting_confirmation',
  payment_review: 'awaiting_confirmation',
  confirmed: 'ready_for_pickup',
  checked_out: 'renting',
  returned: 'settling',
  completed: 'completed',
  cancelled: 'cancelled',
  rejected: 'cancelled',
  expired: 'cancelled',
};
export const getRentalStage = (order: Pick<RentalOrder, 'status' | 'orderStage'>): RentalStage =>
  order.orderStage ?? statusStages[order.status] ?? 'awaiting_confirmation';
export const rentalLabels: Record<string, string> = Object.fromEntries(
  Object.entries(statusStages).map(([status, stage]) => [status, rentalStageLabels[stage]]),
);
export const normalizeRentalView = (view: string): string => {
  if (Object.prototype.hasOwnProperty.call(rentalStageLabels, view)) return view;
  if (view === 'expired' || view === 'rejected') return 'cancelled';
  if (view === 'payment_review') return 'awaiting_confirmation';
  return '';
};
export const rentalMoney = (value = 0) => value.toLocaleString('vi-VN') + ' đ';
export const rentalDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const rentalError = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
  'Không thể xử lý. Vui lòng thử lại.';

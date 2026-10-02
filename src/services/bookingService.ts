import api from './api';
import type { ApiResponse, PaginatedApiResponse } from '../types';

export type BookingStatus = 'pending' | 'approved' | 'rejected';
export const bookingLabels: Record<BookingStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt yêu cầu',
  rejected: 'Đã từ chối',
};
export interface Booking {
  _id: string;
  packageName: string;
  className?: string;
  school?: string;
  pricePerMember: number;
  members: number;
  contactName: string;
  phone: string;
  startAt: string;
  endAt: string;
  location: string;
  note: string;
  status: BookingStatus;
  reviewNote?: string;
  createdAt: string;
  events?: { _id?: string; message: string; at: string }[];
}
export interface BookingNotification {
  _id: string;
  bookingId: string;
  message: string;
  at: string;
  unread: boolean;
}
export const bookingService = {
  list: (page: number, status: string, limit = 20) =>
    api
      .get<PaginatedApiResponse<Booking>>('/bookings', {
        params: { page, limit, ...(status ? { status } : {}) },
      })
      .then((r) => r.data),
  get: (id: string) => api.get<ApiResponse<Booking>>(`/bookings/${id}`).then((r) => r.data.data),
  create: (
    data: {
      packageId: string;
      className: string;
      school?: string;
      members: number;
      contactName: string;
      phone: string;
      startAt: string;
      endAt: string;
      location: string;
      note: string;
    },
    idempotencyKey: string,
  ) =>
    api
      .post<ApiResponse<{ _id: string }>>('/bookings', data, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data.data),
  review: (id: string, status: 'approved' | 'rejected', note: string) =>
    api.patch(`/bookings/${id}/review`, { status, note }),
  notifications: () =>
    api.get<ApiResponse<BookingNotification[]>>('/bookings/notifications').then((r) => r.data.data),
  read: (at: string) => api.post('/bookings/notifications/read', { at }),
};

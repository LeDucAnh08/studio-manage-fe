import api from './api';
import type { ApiResponse, PaginatedApiResponse } from '../types';

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface BookingCostumeInput {
  costumeId: string;
  size: string;
  quantity: number;
}
export interface BookingCostumeSelection extends BookingCostumeInput {
  name: string;
  typeId: string;
  typeName: string;
}
export interface BookingCostumeCatalogItem {
  _id: string;
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'unisex';
  typeId: string;
  typeName: string;
  availableBySize: Record<string, number>;
}
export interface BookingCostumeHold {
  status: 'temporary' | 'expired' | 'approved' | 'released' | 'transferred';
  receiveDate: string;
  returnDate: string;
  expiresAt?: string;
  releaseReason?: string;
}
export const bookingLabels: Record<BookingStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt yêu cầu',
  rejected: 'Đã từ chối',
  cancelled: 'Đã hủy',
};
export interface Booking {
  packageAgreement?: {
    total: number;
    depositRequired: number;
    depositPercent: number;
    holdHours: number;
    acceptedAt: string;
    terms: string[];
  };
  assignedPhotographer?: { _id: string; name: string } | null;
  assignedSupportPhotographers?: { _id: string; name: string }[];
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
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  events?: { _id?: string; message: string; at: string }[];
  costumeSelections?: BookingCostumeSelection[];
  costumeHold?: BookingCostumeHold | null;
}
export interface BookingNotification {
  _id: string;
  bookingId: string;
  message: string;
  at: string;
  unread: boolean;
}
export const bookingService = {
  costumes: (packageId: string, startAt: string, endAt: string) =>
    api
      .get<
        ApiResponse<BookingCostumeCatalogItem[]>
      >(`/public/packages/${packageId}/costumes`, { params: { startAt, endAt } })
      .then((r) => r.data.data),
  releaseCostumes: (id: string, note: string) =>
    api.patch(`/bookings/${id}/costume-hold/release`, { note }),
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
      costumeSelections?: BookingCostumeInput[];
      packageAgreement?: {
        accepted: boolean;
        pricePerMember: number;
        depositPercent: number;
        holdHours: number;
        detailsVersion: number;
        updatedAt?: string;
      };
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

import api from './api';
import type { ApiResponse } from '../types';

export interface DeliveryPhoto {
  id: string;
  source?: 'local' | 'drive';
  name: string;
  width: number;
  height: number;
}
const base = (id: string) => `/bookings/${id}/delivery/photos`;
export const bookingDeliveryService = {
  drafts: (id: string, signal?: AbortSignal) =>
    api
      .get<ApiResponse<DeliveryPhoto[]>>(base(id), { signal })
      .then((response) => response.data.data),
  upload: (id: string, file: File, key: string, signal?: AbortSignal) => {
    const body = new FormData();
    body.append('photo', file);
    return api
      .post<
        ApiResponse<DeliveryPhoto>
      >(base(id), body, { headers: { 'Idempotency-Key': key }, signal })
      .then((response) => response.data.data);
  },
  remove: (id: string, photo: string) => api.delete(base(id) + '/' + photo),
  image: (id: string, photo: string, thumbnail: boolean, signal: AbortSignal) =>
    api
      .get<Blob>(base(id) + '/' + photo, {
        params: thumbnail ? { size: 'thumb' } : {},
        responseType: 'blob',
        signal,
      })
      .then((response) => response.data),
};
export const deliveryError = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  'Chưa thể xử lý ảnh. Vui lòng thử lại.';

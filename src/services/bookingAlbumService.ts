import axios from 'axios';
import api from './api';
import type { ApiResponse } from '../types';

export interface AlbumPhoto {
  id: string;
  source: 'drive';
  name: string;
  width: number;
  height: number;
  driveId: string;
  sourceVersion?: string;
  folderId: string;
  deliveryVersion: number;
  available: boolean;
  selected: boolean;
  note: string;
}
export interface BookingAlbum {
  publicId: string;
  title: string;
  version: number;
  status: 'draft' | 'open' | 'closed';
  limit: number;
  coverId?: string;
  finalizedAt?: string;
  folders: Array<{ id: string; name: string; url?: string }>;
  photos: AlbumPhoto[];
  latestDeliveryVersion: number;
  deliveryVersions: number[];
  canCommentDelivery: boolean;
  shared?: boolean;
  skipped?: string[];
  workflowVersion?: number;
  lifecycle?: string;
  token?: string;
  canSelect: boolean;
  selectionHistory?: Array<{
    at: string;
    round: number;
    count: number;
  }>;
}
// Guest failures must never pass through the account client's login/logout interceptor.
const guestApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
export const albumError = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  'Chưa thể xử lý album. Kiểm tra mạng rồi thử lại.';
export function albumClient(staff: boolean, id: string, token = '', account = false) {
  const authenticated = staff || account;
  const client = authenticated ? api : guestApi;
  const base = authenticated ? `/bookings/${id}/album` : `/public/albums/${id}`;
  const headers = authenticated ? {} : { 'X-Album-Token': token };
  return {
    get: (signal?: AbortSignal) =>
      client
        .get<ApiResponse<BookingAlbum | null>>(base, { headers, signal })
        .then((r) => r.data.data),
    command: (operation: string, body: Record<string, unknown>, key: string) =>
      client
        .post<
          ApiResponse<BookingAlbum>
        >(`${base}/${operation}`, body, { headers: { ...headers, 'Idempotency-Key': key } })
        .then((r) => r.data.data),
    image: (photoId: string, thumbnail: boolean, signal: AbortSignal) =>
      client
        .get<Blob>(`${base}/photos/${photoId}`, {
          headers,
          signal,
          responseType: 'blob',
          params: thumbnail ? { size: 'thumb' } : {},
        })
        .then((r) => r.data),
    export: (extension: boolean, round?: number) =>
      client
        .get<
          ApiResponse<{ text: string; names: string[] }>
        >(`${base}/export/names`, { params: { extension, ...(round ? { round } : {}) } })
        .then((r) => r.data.data),
  };
}

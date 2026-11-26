import api from './api';
import type { ApiResponse } from '../types';
import type { QueuedAlbum } from './backgroundJobService';

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
export interface AlbumReplacement extends Pick<
  AlbumPhoto,
  'id' | 'name' | 'width' | 'height' | 'available' | 'deliveryVersion'
> {
  source: 'local';
  originalPhotoId: string;
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
  replacements?: AlbumReplacement[];
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
export const albumError = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  'Chưa thể xử lý album. Kiểm tra mạng rồi thử lại.';

const imageRequestLimit = 2;
let activeImageRequests = 0;
const fullImageQueue: Array<() => Promise<void>> = [];
const thumbnailQueue: Array<() => Promise<void>> = [];

function drainImageQueue() {
  while (activeImageRequests < imageRequestLimit) {
    const start = fullImageQueue.shift() ?? thumbnailQueue.shift();
    if (!start) return;
    void start();
  }
}

function queueAlbumImage(load: () => Promise<Blob>, thumbnail: boolean, signal: AbortSignal) {
  return new Promise<Blob>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const queue = thumbnail ? thumbnailQueue : fullImageQueue;
    const start = async () => {
      signal.removeEventListener('abort', cancel);
      activeImageRequests++;
      try {
        if (signal.aborted) throw signal.reason;
        resolve(await load());
      } catch (error) {
        reject(error);
      } finally {
        activeImageRequests--;
        drainImageQueue();
      }
    };
    const cancel = () => {
      const index = queue.indexOf(start);
      if (index >= 0) queue.splice(index, 1);
      reject(signal.reason);
    };
    queue.push(start);
    signal.addEventListener('abort', cancel, { once: true });
    drainImageQueue();
  });
}

export function albumClient(staff: boolean, id: string, token = '', account = false) {
  const authenticated = staff || account;
  const client = api;
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
          ApiResponse<BookingAlbum | QueuedAlbum>
        >(`${base}/${operation}`, body, { headers: { ...headers, 'Idempotency-Key': key } })
        .then((r) => r.data.data),
    image: (photoId: string, thumbnail: boolean, signal: AbortSignal) =>
      queueAlbumImage(
        () =>
          client
            .get<Blob>(`${base}/photos/${photoId}`, {
              headers,
              signal,
              responseType: 'blob',
              params: thumbnail ? { size: 'thumb' } : {},
            })
            .then((r) => r.data),
        thumbnail,
        signal,
      ),
    export: (extension: boolean, round?: number) =>
      client
        .get<
          ApiResponse<{ text: string; names: string[] }>
        >(`${base}/export/names`, { params: { extension, ...(round ? { round } : {}) } })
        .then((r) => r.data.data),
  };
}

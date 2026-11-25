import api from './api';

export interface BackgroundOperation {
  id: string;
  service: 'yearbook' | 'concept';
  orderId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  message: string;
}
export interface QueuedAlbum {
  backgroundOperation: BackgroundOperation;
}
export const isQueuedAlbum = (value: unknown): value is QueuedAlbum =>
  !!value && typeof value === 'object' && 'backgroundOperation' in value;
export const backgroundJobService = {
  latest: (service: string, orderId: string, signal: AbortSignal) =>
    api
      .get<{
        data: BackgroundOperation | null;
      }>('/background-jobs/operations/latest', { params: { service, orderId }, signal })
      .then((r) => r.data.data),
  get: (id: string, signal: AbortSignal) =>
    api
      .get<{ data: BackgroundOperation }>(`/background-jobs/operations/${id}`, { signal })
      .then((r) => r.data.data),
};

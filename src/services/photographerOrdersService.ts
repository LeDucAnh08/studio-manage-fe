import api from './api';
import type { PaginatedApiResponse } from '../types';
import type { BookingOrderStage, BookingShootWindow } from './bookingWorkflowService';

export interface PhotographerOrder {
  _id: string;
  service: 'concept' | 'yearbook';
  title: string;
  packageName: string;
  stage: BookingOrderStage;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  shootWindow?: BookingShootWindow | null;
  updatedAt: string;
  role: 'lead' | 'support' | 'editor';
}

export const photographerOrdersService = {
  list: (page: number, service: string, stage: string, signal?: AbortSignal) =>
    api
      .get<PaginatedApiResponse<PhotographerOrder>>('/workflows/photographer-orders', {
        params: { page, limit: 20, service, stage },
        signal,
      })
      .then((response) => response.data),
};

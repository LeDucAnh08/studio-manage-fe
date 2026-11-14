import api from './api';
import type { PaginatedApiResponse } from '../types';
import type { WorkflowSummary } from './bookingWorkflowService';

export interface ShootOrderSummary extends WorkflowSummary {
  service: 'concept' | 'yearbook';
  conceptName?: string;
  conceptNetReceived?: number;
  refundDue?: number;
}
export const shootOrdersService = {
  list: (page: number, limit: number, stage: string, service: string, signal?: AbortSignal) =>
    api
      .get<
        PaginatedApiResponse<ShootOrderSummary>
      >('/workflows/shoot-orders', { params: { page, limit, stage, service }, signal })
      .then((response) => response.data),
};

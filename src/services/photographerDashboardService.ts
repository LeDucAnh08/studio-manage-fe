import api from './api';
import type { ApiResponse } from '../types';
import type { PhotographerOrder } from './photographerOrdersService';

export type PhotographerPeriod = 'month' | 'previous' | 'quarter' | 'year';
export const photographerMetricLabels = {
  shoots: 'Buổi chụp trong kỳ',
  upcoming: 'Lịch chụp sắp tới',
  editing: 'Đơn đang hậu kỳ',
  review: 'Chờ khách nghiệm thu',
  completed: 'Đã hoàn thành',
  overdue: 'Quá hạn bàn giao',
};
export type PhotographerMetric = keyof typeof photographerMetricLabels;
export interface DashboardOrderRow extends Omit<PhotographerOrder, 'updatedAt'> {
  deadline: string | null;
  location: string;
}
export interface PhotographerStats {
  from: string;
  to: string;
  now: string;
  nextRefreshAt: string;
  counts: Record<PhotographerMetric, number>;
  breakdown: { concept: number; yearbook: number };
  chart: { key: string; label: string; concept: number; yearbook: number }[];
  priority: DashboardOrderRow[];
  detail?: { rows: DashboardOrderRow[]; total: number; page: number; limit: number };
}
export const photographerDashboardService = {
  get: (
    params: {
      period: PhotographerPeriod;
      service: string;
      season?: string;
      metric?: string;
      group?: number;
      page: number;
    },
    signal?: AbortSignal,
  ) =>
    api
      .get<ApiResponse<PhotographerStats>>('/dashboard/photographer', { params, signal })
      .then((response) => response.data.data),
};

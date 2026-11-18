import api from './api';
import type { ApiResponse } from '../types';

export interface UpcomingSchedule {
  _id: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: string;
  customer?: { _id: string; className: string; school?: string };
  leadPhotographer?: { _id: string; name?: string; username: string };
}

export interface DashboardStats {
  users?: {
    asOf: string;
    total: number;
    current: number;
    previous: number;
    difference: number;
    percent: number | null;
    currentFrom: string;
    previousFrom: string;
    previousTo: string;
    monthly: Array<{ label: string; count: number }>;
  };
  totals: { income: number; expense: number; profit: number };
  daily: Array<{ label: string; income: number; expense: number }>;
  customerCount: number;
  scheduleCount: number;
  showSchedules: boolean;
  upcomingSchedules: UpcomingSchedule[];
}

export const dashboardService = {
  getStats: (params?: { userId?: string; months?: number; season?: string }) =>
    api.get<ApiResponse<DashboardStats>>('/dashboard', { params }).then((r) => r.data.data),
};

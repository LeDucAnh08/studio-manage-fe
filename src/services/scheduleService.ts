import api from './api';
import type {
  ApiResponse,
  PaginatedApiResponse,
  PaginatedResponse,
  PublicScheduleResponse,
  Schedule,
  ScheduleResponse,
} from '../types';

export const scheduleService = {
  getAll: (params?: Record<string, string | number>) =>
    api
      .get<PaginatedApiResponse<ScheduleResponse>>('/schedules', { params })
      .then(
        (r) => ({ data: r.data.data, ...r.data.pagination }) as PaginatedResponse<ScheduleResponse>,
      ),
  getByCustomer: (customer: string) =>
    api
      .get<ApiResponse<ScheduleResponse | null>>(`/schedules/customer/${customer}`)
      .then((r) => r.data.data),
  /** Public (no-auth) endpoint — used by the student self-entry form */
  getPublicByCustomer: (customer: string, access: string) =>
    api
      .get<
        ApiResponse<PublicScheduleResponse | null>
      >(`/public/schedules/customer/${customer}`, { params: { access } })
      .then((r) => r.data.data),
  getOne: (id: string) =>
    api.get<ApiResponse<ScheduleResponse>>(`/schedules/${id}`).then((r) => r.data.data),
  create: (data: Partial<Schedule>) =>
    api.post<ApiResponse<ScheduleResponse>>('/schedules', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Schedule>) =>
    api.put<ApiResponse<ScheduleResponse>>(`/schedules/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/schedules/${id}`).then((r) => r.data),
  downloadContract: async (id: string, filename: string) => {
    const res = await api.get(`/schedules/${id}/contract`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `hop-dong-${filename}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

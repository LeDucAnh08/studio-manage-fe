import api from './api';
import type { ApiResponse, Season } from '../types';

export const seasonService = {
  getAll: () => api.get<ApiResponse<Season[]>>('/seasons').then((r) => r.data.data),
  create: (data: Omit<Season, '_id' | 'createdAt'>) =>
    api.post<ApiResponse<Season>>('/seasons', data).then((r) => r.data.data),
  update: (id: string, data: Omit<Season, '_id' | 'createdAt'>) =>
    api.put<ApiResponse<Season>>(`/seasons/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/seasons/${id}`).then((r) => r.data),
};

import api from './api';
import type { ApiResponse, User } from '../types';

export const userService = {
  getAll: () => api.get<ApiResponse<User[]>>('/users').then((r) => r.data.data),
  getPhotographers: () =>
    api.get<ApiResponse<User[]>>('/users/photographers').then((r) => r.data.data),
  getSales: () => api.get<ApiResponse<User[]>>('/users/sales').then((r) => r.data.data),
  create: (data: Partial<User> & { password?: string }) =>
    api.post<ApiResponse<User>>('/users', data).then((r) => r.data.data),
  update: (id: string, data: Partial<User> & { password?: string }) =>
    api.put<ApiResponse<User>>(`/users/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/users/${id}`).then((r) => r.data),
};

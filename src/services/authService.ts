import api from './api';
import type { ApiResponse, User } from '../types';

interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  login: (username: string, password: string) =>
    api
      .post<ApiResponse<LoginResponse>>('/auth/login', { username, password })
      .then((r) => r.data.data),
  getMe: () => api.get<ApiResponse<{ user: User }>>('/auth/me').then((r) => r.data.data.user),
  refresh: () => api.post<ApiResponse<LoginResponse>>('/auth/refresh').then((r) => r.data.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api
      .patch<ApiResponse<null>>('/auth/change-password', { currentPassword, newPassword })
      .then((r) => r.data),
  updateProfile: (data: { name?: string }) =>
    api.patch<ApiResponse<User>>('/auth/profile', data).then((r) => r.data.data),
};

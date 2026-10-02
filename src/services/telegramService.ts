import api from './api';
import type { ApiResponse } from '../types';

export interface TelegramStatus {
  linked: boolean;
  telegramUsername: string | null;
}

export interface TelegramLinkResponse {
  token: string;
  url: string;
  expiresAt: string;
}

export const telegramService = {
  getStatus: () =>
    api.get<ApiResponse<TelegramStatus>>('/telegram/status').then((r) => r.data.data),
  generateLinkToken: () =>
    api
      .post<ApiResponse<TelegramLinkResponse>>('/telegram/generate-link-token')
      .then((r) => r.data.data),
  unlink: () => api.delete<ApiResponse<null>>('/telegram/unlink').then((r) => r.data),
};

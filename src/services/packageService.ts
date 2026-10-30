import api from './api';
import type { ApiResponse, Package } from '../types';

// costumes is sent as string[] (IDs) when creating/updating
type PackagePayload = Omit<Partial<Package>, 'costumes'> & { costumes?: string[] };

export const packageService = {
  getAll: () => api.get<ApiResponse<Package[]>>('/packages').then((r) => r.data.data),
  getOne: (id: string) => api.get<ApiResponse<Package>>(`/packages/${id}`).then((r) => r.data.data),
  /** Public (no-auth) endpoint — used by the portfolio pricing section */
  listPublic: () => api.get<ApiResponse<Package[]>>('/public/packages').then((r) => r.data.data),
  getPublic: (id: string) =>
    api
      .get<ApiResponse<Package>>(`/public/packages/${encodeURIComponent(id)}`)
      .then((r) => r.data.data),
  saveContent: (id: string, data: FormData) =>
    api
      .put<ApiResponse<Package>>(`/packages/${encodeURIComponent(id)}/content`, data)
      .then((r) => r.data.data),
  create: (data: PackagePayload) =>
    api.post<ApiResponse<Package>>('/packages', data).then((r) => r.data.data),
  update: (id: string, data: PackagePayload) =>
    api.put<ApiResponse<Package>>(`/packages/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/packages/${id}`),
};

export const packageImageUrl = (id: string) =>
  `${(api.defaults.baseURL || '/api').replace(/\/$/, '')}/media/packages/${encodeURIComponent(id)}`;

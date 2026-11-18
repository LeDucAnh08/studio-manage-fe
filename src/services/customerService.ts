import api from './api';
import type { ApiResponse, Customer, PaginatedApiResponse, PaginatedResponse } from '../types';

export const customerService = {
  getAll: (params?: Record<string, string | number>) =>
    api
      .get<PaginatedApiResponse<Customer>>('/customers', { params })
      .then((r) => ({ data: r.data.data, ...r.data.pagination }) as PaginatedResponse<Customer>),
  getOne: (id: string) =>
    api.get<ApiResponse<Customer>>(`/customers/${id}`).then((r) => r.data.data),
  create: (data: Partial<Customer>) =>
    api.post<ApiResponse<Customer>>('/customers', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Customer>) =>
    api.put<ApiResponse<Customer>>(`/customers/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/customers/${id}`).then((r) => r.data),
  getPublicLink: (id: string) =>
    api
      .get<ApiResponse<{ token: string }>>(`/customers/${id}/public-link`)
      .then((r) => r.data.data),
  /** A valid session and class access link are both required. */
  getPublic: (id: string) =>
    api
      .get<ApiResponse<Pick<Customer, '_id' | 'className' | 'school'>>>(`/public/customers/${id}`)
      .then((r) => r.data.data),
  portfolioStats: () =>
    api
      .get<ApiResponse<{ classes: number; schools: number }>>('/public/portfolio-stats')
      .then((r) => r.data.data),
  /** Legacy class lookup, available only after signing in. */
  listPublic: () =>
    api
      .get<ApiResponse<Pick<Customer, '_id' | 'className' | 'school'>[]>>(`/public/customers`)
      .then((r) => r.data.data),
};

import api from './api';
import type { ApiResponse, Category } from '../types';

export const categoryService = {
  getAll: (type?: 'income' | 'expense') =>
    api
      .get<ApiResponse<Category[]>>('/categories', { params: type ? { type } : {} })
      .then((r) => r.data.data),
  create: (data: Partial<Category>) =>
    api.post<ApiResponse<Category>>('/categories', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Category>) =>
    api.put<ApiResponse<Category>>(`/categories/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/categories/${id}`).then((r) => r.data),
};

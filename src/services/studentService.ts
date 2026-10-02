import api from './api';
import type {
  ApiResponse,
  PaginatedApiResponse,
  PaginatedResponse,
  Student,
  StudentResponse,
} from '../types';

export const studentService = {
  getAll: (params?: Record<string, string | number>) =>
    api
      .get<PaginatedApiResponse<StudentResponse>>('/students', { params })
      .then(
        (r) => ({ data: r.data.data, ...r.data.pagination }) as PaginatedResponse<StudentResponse>,
      ),
  getOne: (id: string) =>
    api.get<ApiResponse<StudentResponse>>(`/students/${id}`).then((r) => r.data.data),
  create: (data: Partial<Student>) =>
    api.post<ApiResponse<StudentResponse>>('/students', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Student>) =>
    api.put<ApiResponse<StudentResponse>>(`/students/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/students/${id}`).then((r) => r.data),
  /** Public (no-auth) endpoint — used by the student self-entry form */
  createPublic: (data: Partial<Student> & { access: string }) =>
    api.post<ApiResponse<Student>>('/public/students', data).then((r) => r.data.data),
};

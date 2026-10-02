import api from './api';
import type {
  ApiResponse,
  Costume,
  CostumeResponse,
  CostumeType,
  RentalCatalogFilters,
  RentalCatalogItem,
} from '../types';

export const costumeService = {
  getAll: () => api.get<ApiResponse<CostumeResponse[]>>('/costumes').then((r) => r.data.data),
  getPublicCatalog: (filters: RentalCatalogFilters) =>
    api
      .get<ApiResponse<RentalCatalogItem[]>>('/public/costumes', { params: filters })
      .then((r) => r.data.data),
  getPublicCatalogCategories: () =>
    api.get<ApiResponse<CostumeType[]>>('/public/costume-types').then((r) => r.data.data),
  create: (data: Partial<Costume>) =>
    api.post<ApiResponse<CostumeResponse>>('/costumes', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Costume>) =>
    api.put<ApiResponse<CostumeResponse>>(`/costumes/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/costumes/${id}`),
};

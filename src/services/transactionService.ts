import api from './api';
import type {
  ApiResponse,
  PaginatedApiResponse,
  PaginatedResponse,
  Transaction,
  TransactionResponse,
  TransactionSummaryRow,
} from '../types';

export const transactionService = {
  getAll: (params?: Record<string, string | number>) =>
    api
      .get<PaginatedApiResponse<TransactionResponse>>('/transactions', { params })
      .then(
        (r) =>
          ({ data: r.data.data, ...r.data.pagination }) as PaginatedResponse<TransactionResponse>,
      ),
  getOne: (id: string) =>
    api.get<ApiResponse<TransactionResponse>>(`/transactions/${id}`).then((r) => r.data.data),
  create: (data: Partial<Transaction>) =>
    api.post<ApiResponse<TransactionResponse>>('/transactions', data).then((r) => r.data.data),
  update: (id: string, data: Partial<Transaction>) =>
    api.put<ApiResponse<TransactionResponse>>(`/transactions/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/transactions/${id}`).then((r) => r.data),
  getSummary: (params?: { dateFrom?: string; dateTo?: string }) =>
    api
      .get<ApiResponse<TransactionSummaryRow[]>>('/transactions/summary', { params })
      .then((r) => r.data.data),
};

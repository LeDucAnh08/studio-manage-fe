import api from './api';
import type { ApiResponse, UserRole } from '../types';

export type AccountRequestStatus = 'pending' | 'approved' | 'rejected';
export interface AccountRequest {
  _id: string;
  username: string;
  name: string;
  phone?: string;
  note?: string;
  requestedRole: UserRole;
  status: AccountRequestStatus;
  reviewNote?: string;
  createdAt: string;
}

export const accountRequestService = {
  submit: (data: {
    username: string;
    name: string;
    phone?: string;
    note?: string;
    password: string;
    requestedRole: UserRole;
  }) => api.post<ApiResponse<null>>('/account-requests', data).then((r) => r.data),
  getAll: () =>
    api.get<ApiResponse<AccountRequest[]>>('/account-requests').then((r) => r.data.data),
  review: (id: string, status: 'approved' | 'rejected', note: string, roles?: UserRole[]) =>
    api
      .patch<ApiResponse<null>>(`/account-requests/${id}`, { status, note, roles })
      .then((r) => r.data),
};

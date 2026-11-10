import api from './api';
import type { ApiResponse } from '../types';

export interface EmailContact {
  email?: string;
  emailVerifiedAt?: string | null;
}
interface VerificationRequest extends EmailContact {
  testMode?: boolean;
}
export const emailService = {
  request: (email: string) =>
    api
      .post<ApiResponse<VerificationRequest>>('/auth/email/request', { email })
      .then((response) => response.data.data),
  confirm: (token: string) =>
    api
      .post<ApiResponse<EmailContact>>('/auth/email/confirm', { token })
      .then((response) => response.data.data),
};
export const emailError = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  'Chưa thể xử lý email. Vui lòng thử lại.';

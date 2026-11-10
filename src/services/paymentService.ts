import api from './api';
import type { PaginatedApiResponse } from '../types';
export interface SePayReceipt {
  _id: string;
  mode: 'sandbox' | 'live';
  providerTransactionId: string;
  bankReference?: string;
  accountNumber: string;
  gateway: string;
  content: string;
  amount: number;
  transactionDate: string;
  booking?: string;
  rentalOrder?: string;
  conceptOrder?: string;
  status: 'pending' | 'review' | 'applied' | 'ignored';
  hasConflict?: boolean;
  conflicts?: Array<{
    providerTransactionId?: string;
    bankReference?: string;
    gateway?: string;
    accountNumber?: string;
    content?: string;
    amount?: number;
    transactionDate?: string;
    direction?: string;
  }>;
  reason?: string;
}
export const paymentService = {
  simulateDeposit: (reference: string, key: string) =>
    api
      .post<{
        data: { status: string };
      }>('/payments/sepay/sandbox/simulate', { reference }, { headers: { 'Idempotency-Key': key } })
      .then((res) => res.data.data),
  resolveRental: (id: string, rentalId: string, note: string) =>
    api.post(`/payments/sepay/receipts/${id}/resolve-rental`, { rentalId, note }),
  receipts: (page = 1) =>
    api
      .get<
        PaginatedApiResponse<SePayReceipt>
      >('/payments/sepay/receipts', { params: { page, limit: 20 } })
      .then((response) => response.data),
};

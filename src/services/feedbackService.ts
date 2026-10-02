import api from './api';
import type {
  ApiResponse,
  Feedback,
  FeedbackResponse,
  PaginatedApiResponse,
  PaginatedResponse,
} from '../types';

export interface FeedbackListResponse extends PaginatedResponse<FeedbackResponse> {
  totalRead: number;
  totalUnread: number;
}

export interface FeedbackSubmitPayload {
  customer?: string;
  phone?: string;
  crewFeedback: { rating: number; description?: string };
  albumFeedback: { rating: number; description?: string };
  content?: string;
  suggestion?: string;
}

export const feedbackService = {
  getAll: (params?: Record<string, string | number>) =>
    api
      .get<PaginatedApiResponse<FeedbackResponse>>('/feedbacks', { params })
      .then(
        (r) => ({ data: r.data.data, ...r.data.pagination }) as unknown as FeedbackListResponse,
      ),
  markRead: (id: string, isRead = true) =>
    api.patch<ApiResponse<Feedback>>(`/feedbacks/${id}/read`, { isRead }).then((r) => r.data.data),
  remove: (id: string) => api.delete<ApiResponse<null>>(`/feedbacks/${id}`).then((r) => r.data),
  submit: (data: FeedbackSubmitPayload) =>
    api.post<ApiResponse<{ _id: string }>>('/public/feedback', data).then((r) => r.data.data),
};

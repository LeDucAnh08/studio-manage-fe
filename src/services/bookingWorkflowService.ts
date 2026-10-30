import api from './api';
import type { ApiResponse, PaginatedApiResponse } from '../types';
import type { Booking, BookingStatus } from './bookingService';
import type { AssignedPhotographer } from './photographerService';

export type BookingWorkflowLifecycle =
  | 'intake'
  | 'quoting'
  | 'awaiting_deposit'
  | 'ready_to_confirm'
  | 'confirmed'
  | 'shooting'
  | 'editing'
  | 'delivered'
  | 'revision_requested'
  | 'accepted'
  | 'completed'
  | 'change_pending'
  | 'cancelled';

export type BookingWorkflowAction =
  | 'photographer.assign'
  | 'quote.propose'
  | 'quote.accept'
  | 'payment.record'
  | 'resources.confirm'
  | 'progress.update'
  | 'revision.request'
  | 'delivery.accept'
  | 'feedback.submit'
  | 'change.request'
  | 'change.propose'
  | 'change.accept'
  | 'change.decline'
  | 'change.withdraw'
  | 'member-link.open'
  | 'member-link.close'
  | 'legacy.reconcile';

export const bookingWorkflowLabels: Record<BookingWorkflowLifecycle, string> = {
  intake: 'Mới tiếp nhận',
  quoting: 'Đang báo giá',
  awaiting_deposit: 'Chờ đặt cọc',
  ready_to_confirm: 'Đã đủ tiền cọc',
  confirmed: 'Đã chốt lịch',
  shooting: 'Đang chụp',
  editing: 'Đang hậu kỳ',
  delivered: 'Đã bàn giao',
  revision_requested: 'Đang chỉnh sửa',
  accepted: 'Khách đã nghiệm thu',
  completed: 'Hoàn tất',
  change_pending: 'Đang xử lý yêu cầu thay đổi',
  cancelled: 'Đã hủy',
};
export type CustomerOrderView = '' | 'active' | 'completed' | 'cancelled' | 'rejected';

export interface PaymentInstructions {
  bankName: string;
  accountName: string;
  accountNumber: string;
  transferTemplate: string;
}

export interface WorkflowMember {
  _id: string;
  studentId: string | null;
  name: string;
  gender?: string;
  height?: number;
  weight?: number;
  contact?: string;
  costumeSizes: Array<{ costumeId: string; size: string }>;
}

export interface AllowedWorkflowCostume {
  costumeId: string;
  name: string;
  sizes: string[];
}

export interface BookingWorkflowDto {
  booking: Pick<Booking, 'costumeSelections' | 'costumeHold'> & {
    _id: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    cancelledAt?: string;
    cancellationReason?: string;
    packageName: string;
    pricePerMember?: number;
    members: number;
    className?: string;
    school?: string;
    contactName?: string;
    phone?: string;
    startAt: string;
    endAt: string;
    location: string;
    note?: string;
    reviewNote?: string;
  };
  workflow: {
    bookingId: string;
    version: number;
    lifecycle: BookingWorkflowLifecycle;
    assignedPhotographer?: AssignedPhotographer | null;
    assignedSupportPhotographers?: AssignedPhotographer[];
    proposedSchedule?: {
      shootDate: string;
      startTime: string;
      endTime: string;
      location: string;
    } | null;
    quote: null | {
      version: number;
      currency: string;
      lines: Array<{ label: string; quantity: number; unitPrice: number }>;
      total: number;
      depositRequired: number;
      proposedSchedule: { shootDate: string; startTime: string; endTime: string; location: string };
      delivery: { targetDays: number; targetDate?: string };
      editingTerms: string[];
      terms: string[];
      paymentInstructions: PaymentInstructions;
      acceptedAt?: string;
    };
    payments: null | {
      requiredDeposit: number;
      totalReceived: number;
      totalRefunded: number;
      netReceived: number;
      totalDue: number;
      refundDue?: number;
      entries: Array<{
        _id: string;
        kind: 'deposit' | 'balance' | 'refund';
        amount: number;
        method: string;
        reference?: string;
        receivedAt: string;
      }>;
    };
    resources: null | {
      scheduleId: string | null;
      scheduleDetails?: {
        shootDate: string;
        startTime?: string;
        endTime?: string;
        location?: string;
      } | null;
      photographers: string[];
      costumes: Array<{
        costumeId: string;
        size: string;
        quantity: number;
        receiveDate: string;
        returnDate: string;
      }>;
    };
    allowedCostumes: AllowedWorkflowCostume[];
    members: WorkflowMember[];
    progress: null | {
      status: 'not_started' | 'shooting' | 'editing' | 'delivered';
      deliveryVersion: number;
      deliveryUrl?: string;
      deliveredAt?: string;
      acceptedAt?: string;
      acceptedDeliveryVersion?: number;
      revisionRequests: Array<{
        _id: string;
        note: string;
        at: string;
        deliveryVersion?: number;
        resolvedAt?: string;
      }>;
    };
    changeRequest: null | {
      _id: string;
      kind: 'change' | 'cancel';
      status: 'requested' | 'proposed' | 'accepted' | 'applied' | 'declined';
      requested?: Record<string, unknown>;
      proposed?: Record<string, unknown>;
      priceDelta: number;
      finalPayable?: number;
      refundDue?: number;
      terms: string[];
      note?: string;
      at: string;
    };
    feedback: null | { rating: number; comment?: string; at: string };
    quoteHistory: Array<{
      version: number;
      total: number;
      depositRequired: number;
      acceptedAt?: string;
    }>;
    deliveryHistory: Array<{ version: number; deliveryUrl: string; deliveredAt: string }>;
    paymentInstructions: PaymentInstructions | null;
    paymentReady: boolean;
    events: Array<{ action: string; message: string; at: string }>;
    memberEntry: null | {
      opened: boolean;
      url?: string;
      token?: string;
      expiresAt?: string | null;
    };
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface WorkflowSummary {
  assignedPhotographer?: AssignedPhotographer | null;
  assignedSupportPhotographers?: AssignedPhotographer[];
  bookingId: string;
  version: number;
  lifecycle: BookingWorkflowLifecycle;
  packageName: string;
  className?: string;
  school?: string;
  startTime?: string;
  shootDate: string | null;
  updatedAt: string;
  bookingStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
  progressStatus?: string;
  payment?: { netReceived: number; totalDue: number; refundDue?: number };
}

export interface PublicMemberIntakeDto {
  bookingTitle: string;
  packageName: string;
  requestedMembers: number;
  allowedCostumes: AllowedWorkflowCostume[];
}

export interface PublicMemberSubmission {
  requestId: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
  contact?: string;
  costumeSizes: Array<{ costumeId: string; size: string }>;
}

export interface EditableWorkflowMember {
  _id?: string;
  name: string;
  gender?: string;
  height?: number;
  weight?: number;
  contact?: string;
  costumeSizes: Array<{ costumeId: string; size: string }>;
}

export interface WorkflowPage {
  data: WorkflowSummary[];
  pagination: { total: number; page: number; limit: number };
}

export const bookingWorkflowService = {
  list: (page = 1, limit = 20, view: CustomerOrderView = '', status: BookingStatus | '' = '') =>
    api
      .get<
        PaginatedApiResponse<WorkflowSummary>
      >('/workflows', { params: { page, limit, ...(view ? { view } : {}), ...(status ? { status } : {}) } })
      .then((response) => response.data),
  get: (id: string) =>
    api
      .get<ApiResponse<BookingWorkflowDto>>('/bookings/' + id + '/workflow')
      .then((response) => response.data.data),
  act: (
    id: string,
    expectedVersion: number,
    action: BookingWorkflowAction,
    data: Record<string, unknown> = {},
    key?: string,
  ) =>
    api
      .post<
        ApiResponse<BookingWorkflowDto>
      >('/bookings/' + id + '/workflow/actions', { expectedVersion, action, ...data }, { headers: { 'Idempotency-Key': key || createRequestId() } })
      .then((response) => response.data.data),
  updateMembers: (
    id: string,
    expectedVersion: number,
    members: EditableWorkflowMember[],
    key = createRequestId(),
  ) =>
    api
      .post<
        ApiResponse<BookingWorkflowDto>
      >('/bookings/' + id + '/workflow/members', { expectedVersion, members }, { headers: { 'Idempotency-Key': key } })
      .then((response) => response.data.data),
  getPublicMemberIntake: (token: string) =>
    api
      .get<ApiResponse<PublicMemberIntakeDto>>('/public/member-intake/' + encodeURIComponent(token))
      .then((response) => response.data.data),
  submitPublicMember: (token: string, submission: PublicMemberSubmission) =>
    api
      .post<
        ApiResponse<{ accepted: true }>
      >('/public/member-intake/' + encodeURIComponent(token), submission)
      .then((response) => response.data.data),
};

export const createWorkflowRequestId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'workflow-' + Date.now() + '-' + Math.random().toString(36).slice(2);

const createRequestId = createWorkflowRequestId;

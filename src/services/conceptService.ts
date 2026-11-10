import axios from 'axios';
import api from './api';

export interface Concept {
  _id: string;
  name: string;
  description: string;
  coverUrl: string;
  active: boolean;
}
export interface ConceptPackage {
  _id: string;
  concept: string;
  name: string;
  price: number;
  durationMinutes: number;
  maxPeople: number;
  retouchQuota: number;
  extraPhotoPrice: number;
  costumeTypes: string[];
  costumeCount: number;
  active: boolean;
  version: number;
}
export interface Photographer {
  _id: string;
  name: string;
  bio?: string;
  portfolio?: { url: string; caption?: string }[];
}
export interface StudioSettings {
  openMinutes: number;
  closeMinutes: number;
  stepMinutes: number;
  bufferMinutes: number;
  horizonDays: number;
  closedWeekdays: number[];
  version: number;
}
export interface Catalog {
  concepts: Concept[];
  packages: ConceptPackage[];
  settings: StudioSettings;
}
export interface Slot {
  startAt: string;
  endAt: string;
  photographers: Photographer[];
}
export interface CostumeOption {
  _id: string;
  name: string;
  available: Record<string, number>;
}
export interface CostumeChoice {
  costumeId: string;
  size: string;
  quantity: number;
  name?: string;
}
export interface ConceptPayment {
  id: string;
  kind: string;
  reference: string;
  amount: number;
  total: number;
  received: number;
  status: string;
  expiresAt: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrUrl: string | null;
  demoSimulation: boolean;
}
export interface ConceptOrder {
  _id: string;
  client: string;
  concept: string;
  package: string;
  snapshot: ConceptPackage & { conceptName: string; deposit: number };
  version: number;
  status: string;
  startAt: string;
  endAt: string;
  originalStartAt: string;
  contactName: string;
  phone: string;
  people: number;
  brief: string;
  references: string[];
  photographer: string;
  editor?: string;
  wardrobe: string;
  costumes: CostumeChoice[];
  reservation: { status: string; expiresAt: string };
  paymentRequests: ConceptPayment[];
  payments?: { amount: number; kind: string; at: string; reference?: string }[];
  refundDue: number;
  retained: number;
  netReceived: number;
  rescheduleCount: number;
  events: { action: string; message: string; at: string }[];
  canManage: boolean;
  canEdit: boolean;
  canAccount: boolean;
  isOwner: boolean;
  canCancel: boolean;
  canReschedule: boolean;
}
export interface ConceptPhoto {
  id: string;
  name: string;
  version: number;
  width: number;
  height: number;
  available: boolean;
  selected?: boolean;
  note?: string;
}
export interface FeedbackItem {
  photoId: string;
  note: string;
  resolved: boolean;
}
export interface FeedbackRound {
  id: string;
  round?: number;
  version: number;
  items: FeedbackItem[];
  at: string;
}
export interface PaidRequest extends FeedbackRound {
  status: string;
  amount?: number;
  terms?: string;
  reference?: string;
}
export interface ConceptAlbum {
  id: string;
  title: string;
  version: number;
  status: string;
  selectionRound: number;
  deliveryVersion: number;
  extraAmount: number;
  allowDownload: boolean;
  freeRoundsUsed: number;
  photos: ConceptPhoto[];
  selections: {
    round: number;
    extra: number;
    photos: { photoId: string; name: string; note: string }[];
  }[];
  deliveries: { version: number; at: string }[];
  feedbackRounds: FeedbackRound[];
  paidRequests: PaidRequest[];
  folders?: string[];
  share?: { publicId?: string; expiresAt?: string };
  token?: string;
}
export interface Profile {
  _id: string;
  photographer: string;
  concepts: string[];
  bio: string;
  published: boolean;
  portfolio: { concept: string; url: string; caption: string; permitted: boolean }[];
}
export interface ManagedCatalog extends Catalog {
  profiles: Profile[];
  photographers: Photographer[];
  costumeTypes: { _id: string; name: string }[];
}
let activeImages = 0;
const imageWaiters: (() => void)[] = [];
async function imageRequest(work: () => Promise<Blob>) {
  if (activeImages >= 2) await new Promise<void>((resolve) => imageWaiters.push(resolve));
  activeImages++;
  try {
    return await work();
  } finally {
    activeImages--;
    imageWaiters.shift()?.();
  }
}
const guestApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
export const conceptError = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  'Không thể xử lý. Vui lòng thử lại.';
export const conceptStatus: Record<string, string> = {
  awaiting_deposit: 'Chờ cọc',
  confirmed: 'Đã xác nhận',
  shot: 'Đã chụp',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy',
  completed: 'Hoàn tất',
  draft: 'Chờ mở album',
  selecting: 'Chọn ảnh',
  awaiting_extra: 'Chờ phí ảnh thêm',
  queued: 'Chờ retouch',
  retouching: 'Đang retouch',
  delivered: 'Chờ nghiệm thu',
  revising: 'Đang chỉnh sửa',
};
export const money = (value: number) => `${(value || 0).toLocaleString('vi-VN')} đ`;
export const vnTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  });
export const conceptService = {
  catalog: (signal?: AbortSignal) =>
    guestApi.get<{ data: Catalog }>('/concepts', { signal }).then((r) => r.data.data),
  manage: () => api.get<{ data: ManagedCatalog }>('/concepts/manage').then((r) => r.data.data),
  save: (kind: string, body: unknown, key: string) =>
    api.post(`/concepts/${kind}`, body, { headers: { 'Idempotency-Key': key } }),
  availability: (packageId: string, day: string, signal?: AbortSignal) =>
    guestApi
      .get<{
        data: { day: string; available: boolean; slots: Slot[] };
      }>('/concepts/availability', { params: { packageId, day }, signal })
      .then((r) => r.data.data),
  costumes: (packageId: string, startAt: string, signal?: AbortSignal) =>
    guestApi
      .get<{
        data: CostumeOption[];
      }>('/concepts/costumes', { params: { packageId, startAt }, signal })
      .then((r) => r.data.data),
  checkout: (body: unknown, key: string) =>
    api
      .post<{
        data: ConceptOrder;
      }>('/concept-orders', body, { headers: { 'Idempotency-Key': key } })
      .then((r) => r.data.data),
  list: (status = '', page = 1) =>
    api
      .get<{
        data: ConceptOrder[];
        pagination: { total: number };
      }>('/concept-orders', { params: { status, page } })
      .then((r) => r.data),
  order: (id: string) =>
    api.get<{ data: ConceptOrder }>(`/concept-orders/${id}`).then((r) => r.data.data),
  staff: () => api.get<{ data: Photographer[] }>('/concept-orders/staff').then((r) => r.data.data),
  command: (id: string, operation: string, body: unknown, key: string) =>
    api
      .post<{
        data: ConceptOrder;
      }>(`/concept-orders/${id}/${operation}`, body, { headers: { 'Idempotency-Key': key } })
      .then((r) => r.data.data),
  album: (id: string) =>
    api.get<{ data: ConceptAlbum }>(`/concept-orders/${id}/album`).then((r) => r.data.data),
  albumCommand: (id: string, operation: string, body: unknown, key: string) =>
    api
      .post<{
        data: ConceptAlbum;
      }>(`/concept-orders/${id}/album/${operation}`, body, { headers: { 'Idempotency-Key': key } })
      .then((r) => r.data.data),
  guestAlbum: (id: string, token: string, signal?: AbortSignal) =>
    guestApi
      .get<{
        data: ConceptAlbum;
      }>(`/public/concept-albums/${id}`, { headers: { 'X-Album-Token': token }, signal })
      .then((r) => r.data.data),
  image: (
    id: string,
    photoId: string,
    options: {
      thumb?: boolean;
      download?: boolean;
      guest?: boolean;
      token?: string;
      signal?: AbortSignal;
    },
  ) =>
    imageRequest(() =>
      (options.guest ? guestApi : api)
        .get<Blob>(
          `${options.guest ? '/public/concept-albums' : '/concept-orders'}/${id}${options.guest ? '' : '/album'}/photos/${photoId}`,
          {
            params: {
              size: options.thumb ? 'thumb' : undefined,
              download: options.download ? 'true' : undefined,
            },
            responseType: 'blob',
            signal: options.signal,
            headers: options.guest ? { 'X-Album-Token': options.token } : {},
          },
        )
        .then((r) => r.data),
    ),
  zip: (id: string, version: number) =>
    api
      .get<Blob>(`/concept-orders/${id}/album/zip`, { params: { version }, responseType: 'blob' })
      .then((r) => r.data),
};

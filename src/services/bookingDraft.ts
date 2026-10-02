import type { User } from '../types';

export const BOOKING_DRAFT_KEY = 'yume.booking-draft.v1';

export interface BookingDraft {
  version: 1;
  ownerId: string | null;
  idempotencyKey: string;
  submissionFingerprint?: string;
  step: 1 | 2 | 3;
  source: string;
  concept: string;
  itemId: string;
  itemName: string;
  className: string;
  school: string;
  packageId: string;
  comparedPackageIds: string[];
  contactName: string;
  phone: string;
  members: number;
  startAt: string;
  endAt: string;
  location: string;
  note: string;
}

export const createIdempotencyKey = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createBookingDraft = (ownerId: string | null = null): BookingDraft => ({
  version: 1,
  ownerId,
  idempotencyKey: createIdempotencyKey(),
  step: 1,
  source: '',
  concept: '',
  itemId: '',
  itemName: '',
  className: '',
  school: '',
  packageId: '',
  comparedPackageIds: [],
  contactName: '',
  phone: '',
  members: 1,
  startAt: '',
  endAt: '',
  location: '',
  note: '',
});

const isBookingDraft = (value: unknown): value is BookingDraft => {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<BookingDraft>;
  return (
    draft.version === 1 &&
    (draft.ownerId === null || typeof draft.ownerId === 'string') &&
    typeof draft.idempotencyKey === 'string' &&
    (draft.submissionFingerprint === undefined || typeof draft.submissionFingerprint === 'string') &&
    (draft.step === 1 || draft.step === 2 || draft.step === 3) &&
    typeof draft.source === 'string' &&
    typeof draft.concept === 'string' &&
    typeof draft.itemId === 'string' &&
    typeof draft.itemName === 'string' &&
    (draft.className === undefined || typeof draft.className === 'string') &&
    (draft.school === undefined || typeof draft.school === 'string') &&
    typeof draft.packageId === 'string' &&
    Array.isArray(draft.comparedPackageIds) &&
    draft.comparedPackageIds.every((id) => typeof id === 'string') &&
    typeof draft.contactName === 'string' &&
    typeof draft.phone === 'string' &&
    typeof draft.members === 'number' &&
    Number.isFinite(draft.members) &&
    typeof draft.startAt === 'string' &&
    typeof draft.endAt === 'string' &&
    typeof draft.location === 'string' &&
    typeof draft.note === 'string'
  );
};

export const readBookingDraft = (): BookingDraft | null => {
  try {
    const raw = sessionStorage.getItem(BOOKING_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isBookingDraft(parsed)) return null;
    return {
      ...parsed,
      className: parsed.className ?? '',
      school: parsed.school ?? '',
    };
  } catch {
    return null;
  }
};

export const writeBookingDraft = (draft: BookingDraft) => {
  try {
    sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The current form remains usable if storage is unavailable.
  }
};

export const clearBookingDraft = () => {
  try {
    sessionStorage.removeItem(BOOKING_DRAFT_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
};

/** Claim anonymous intake on sign-in and discard a draft owned by another account. */
export const reconcileBookingDraftAccount = (user: User, previousUser?: User | null) => {
  const draft = readBookingDraft();
  if (!draft) return;
  if ((previousUser && previousUser._id !== user._id) || (draft.ownerId && draft.ownerId !== user._id)) {
    clearBookingDraft();
    return;
  }
  draft.ownerId = user._id;
  writeBookingDraft(draft);
};

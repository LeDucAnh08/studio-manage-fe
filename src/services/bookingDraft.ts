import type { User } from '../types';
import type { BookingWorkflowDto } from './bookingWorkflowService';

export const BOOKING_DRAFT_KEY = 'yume.booking-draft.v4';
const LEGACY_BOOKING_DRAFT_KEYS = [
  'yume.booking-draft.v3',
  'yume.booking-draft.v2',
  'yume.booking-draft.v1',
];

export interface BookingStudentDraft {
  name: string;
  phone: string;
  height: string;
  weight: string;
  pantsSize: string;
  shirtSize: string;
  notes: string;
}

export const createStudentDraft = (): BookingStudentDraft => ({
  name: '',
  phone: '',
  height: '',
  weight: '',
  pantsSize: '',
  shirtSize: '',
  notes: '',
});
export const hasStudentDetails = (student: BookingStudentDraft) =>
  Object.keys(createStudentDraft()).some(
    (key) => key !== 'notes' && student[key as keyof BookingStudentDraft].trim(),
  );

export interface BookingDraft {
  version: 4;
  ownerId: string | null;
  idempotencyKey: string;
  submissionFingerprint?: string;
  packageConsentKey?: string;
  restorationId?: string;
  step: 1 | 2 | 3 | 4;
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
  members: string;
  students: BookingStudentDraft[];
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
  version: 4,
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
  members: '1',
  students: [],
  startAt: '',
  endAt: '',
  location: '',
  note: '',
});

const vietnamDateTime = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};
export const bookingDraftFromOrder = (
  record: BookingWorkflowDto,
  ownerId: string,
): BookingDraft => {
  const draft = createBookingDraft(ownerId);
  return {
    ...draft,
    restorationId: draft.idempotencyKey,
    step: record.booking.packageId ? 4 : 1,
    packageId: record.booking.packageId || '',
    className: record.booking.className || '',
    school: record.booking.school || '',
    contactName: record.booking.contactName || '',
    phone: record.booking.phone || '',
    members: String(record.booking.members),
    students: record.workflow.members.map((member) => ({
      name: member.name,
      phone: member.contact || '',
      height: member.height == null ? '' : String(member.height),
      weight: member.weight == null ? '' : String(member.weight),
      pantsSize: member.pantsSize || '',
      shirtSize: member.shirtSize || '',
      notes: member.notes || '',
    })),
    startAt: vietnamDateTime(record.booking.startAt),
    endAt: vietnamDateTime(record.booking.endAt),
    location: record.booking.location,
    note: record.booking.note || '',
  };
};

type StoredBookingDraft = Omit<BookingDraft, 'version' | 'step' | 'members' | 'students'> & {
  version: 1 | 2 | 3 | 4;
  step: 1 | 2 | 3 | 4;
  members: string | number;
  students?: BookingStudentDraft[];
  costumeSelections?: unknown;
};
const isBookingDraft = (value: unknown): value is StoredBookingDraft => {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<StoredBookingDraft>;
  return (
    (draft.version === 1 || draft.version === 2 || draft.version === 3 || draft.version === 4) &&
    (draft.ownerId === null || typeof draft.ownerId === 'string') &&
    typeof draft.idempotencyKey === 'string' &&
    (draft.submissionFingerprint === undefined ||
      typeof draft.submissionFingerprint === 'string') &&
    (draft.step === 1 ||
      draft.step === 2 ||
      draft.step === 3 ||
      ((draft.version === 2 || draft.version === 4) && draft.step === 4)) &&
    (draft.students === undefined ||
      (Array.isArray(draft.students) &&
        draft.students.length <= 1000 &&
        draft.students.every(
          (student) =>
            student &&
            Object.keys(createStudentDraft()).every(
              (key) =>
                (key === 'notes' && student.notes === undefined) ||
                typeof student[key as keyof BookingStudentDraft] === 'string',
            ),
        ))) &&
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
    (typeof draft.members === 'string' ||
      (typeof draft.members === 'number' && Number.isFinite(draft.members))) &&
    typeof draft.startAt === 'string' &&
    typeof draft.endAt === 'string' &&
    typeof draft.location === 'string' &&
    typeof draft.note === 'string'
  );
};

export const readBookingDraft = (): BookingDraft | null => {
  try {
    const raw = [BOOKING_DRAFT_KEY, ...LEGACY_BOOKING_DRAFT_KEYS]
      .map((key) => sessionStorage.getItem(key))
      .find((value) => value !== null);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isBookingDraft(parsed)) return null;
    // Older costume choices are no longer submitted or used to reserve inventory.
    const { costumeSelections: _selections, ...draft } = parsed;
    return {
      ...draft,
      version: 4,
      step: parsed.version !== 4 && parsed.step >= 3 ? 3 : parsed.step,
      className: parsed.className ?? '',
      school: parsed.school ?? '',
      members: String(parsed.members),
      students: (parsed.students ?? []).map((student) => ({
        ...student,
        notes: student.notes ?? '',
      })),
    };
  } catch {
    return null;
  }
};

export const writeBookingDraft = (draft: BookingDraft) => {
  try {
    sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
    LEGACY_BOOKING_DRAFT_KEYS.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // The current form remains usable if storage is unavailable.
  }
};

export const clearBookingDraft = () => {
  try {
    sessionStorage.removeItem(BOOKING_DRAFT_KEY);
    LEGACY_BOOKING_DRAFT_KEYS.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
};

/** Claim anonymous intake on sign-in and discard a draft owned by another account. */
export const reconcileBookingDraftAccount = (user: User, previousUser?: User | null) => {
  const draft = readBookingDraft();
  if (!draft) return;
  if (
    (previousUser && previousUser._id !== user._id) ||
    (draft.ownerId && draft.ownerId !== user._id)
  ) {
    clearBookingDraft();
    return;
  }
  draft.ownerId = user._id;
  writeBookingDraft(draft);
};

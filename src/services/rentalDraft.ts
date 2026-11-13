import type { User } from '../types';
import type { RentalOrder, RentalRequest } from './rentalService';
import { vietnamCalendarDate } from '../utils/vietnamCalendarDate';
export type RentalDraft = Omit<RentalRequest, 'lines'> & {
  lines: Array<{ costumeId: string; size: string; quantity: string }>;
  preview: boolean;
  ownerId: string | null;
  requestKey?: string;
  signature?: string;
  restorationId?: string;
};
export const RENTAL_DRAFT_KEY = 'yume.rental-draft.v1';
export const writeRentalDraft = (draft: RentalDraft) => {
  try {
    sessionStorage.setItem(RENTAL_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The navigation state still carries the form when storage is unavailable.
  }
};
export const rentalDraftFromOrder = (order: RentalOrder, ownerId: string): RentalDraft => ({
  ownerId,
  restorationId: crypto.randomUUID(),
  contactName: order.contactName,
  phone: order.phone || '',
  note: order.note,
  receiveDate: vietnamCalendarDate(order.quote?.receiveDate || order.requestedReceiveDate),
  returnDate: vietnamCalendarDate(order.quote?.returnDate || order.requestedReturnDate),
  lines: (order.quote?.lines || order.requestedLines).map((line) => ({
    costumeId: line.costumeId,
    size: line.size,
    quantity: String(line.quantity),
  })),
  preview: true,
});
export const clearRentalDraft = () => sessionStorage.removeItem(RENTAL_DRAFT_KEY);
export const reconcileRentalDraft = (user: User) => {
  try {
    const raw = sessionStorage.getItem(RENTAL_DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!user.roles.includes(6) || (draft.ownerId && draft.ownerId !== user._id))
      clearRentalDraft();
    else sessionStorage.setItem(RENTAL_DRAFT_KEY, JSON.stringify({ ...draft, ownerId: user._id }));
  } catch {
    clearRentalDraft();
  }
};

import type { User } from '../types';
export const RENTAL_DRAFT_KEY = 'yume.rental-draft.v1';
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

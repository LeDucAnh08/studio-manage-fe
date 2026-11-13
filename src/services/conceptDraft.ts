import type { ConceptOrder, CostumeChoice, WardrobeMeasurement } from './conceptService';

export const CONCEPT_DRAFT_KEY = 'yume-concept-draft-v1';
export const conceptScreens = ['date', 'photographer', 'costumes', 'review'] as const;
export interface ConceptDraft {
  ownerId: string | null;
  packageId: string;
  startAt: string;
  photographerId: string;
  costumes: CostumeChoice[];
  wardrobeMeasurements: WardrobeMeasurement[];
  contactName: string;
  phone: string;
  people: number;
  brief: string;
  referencesText: string;
  step: number;
  key: string;
  restorationId?: string;
}
export const emptyConceptDraft = (ownerId: string | null): ConceptDraft => ({
  ownerId,
  packageId: '',
  startAt: '',
  photographerId: '',
  costumes: [],
  wardrobeMeasurements: [],
  contactName: '',
  phone: '',
  people: 1,
  brief: '',
  referencesText: '',
  step: 1,
  key: crypto.randomUUID(),
});
export const conceptDraftFromOrder = (order: ConceptOrder, ownerId: string): ConceptDraft => {
  const draft = emptyConceptDraft(ownerId);
  return {
    ...draft,
    restorationId: draft.key,
    packageId: order.package,
    startAt: order.startAt,
    photographerId: order.photographer,
    wardrobeMeasurements: (order.wardrobeMeasurements || []).map((row) => ({ ...row })),
    contactName: order.contactName,
    phone: order.phone,
    people: order.people,
    brief: order.brief,
    referencesText: order.references.join('\n'),
    step: 5,
  };
};
export function readConceptDraft(ownerId: string | null): ConceptDraft {
  try {
    const draft = JSON.parse(sessionStorage.getItem(CONCEPT_DRAFT_KEY) || 'null');
    if (
      draft &&
      (draft.ownerId === ownerId || !draft.ownerId) &&
      typeof draft.packageId === 'string' &&
      Array.isArray(draft.costumes) &&
      Number.isInteger(draft.step) &&
      draft.step >= 1 &&
      draft.step <= 6
    )
      return {
        ...emptyConceptDraft(ownerId),
        ...draft,
        ownerId,
        people:
          Number.isInteger(draft.people) && draft.people > 0 && draft.people <= 100
            ? draft.people
            : 1,
        wardrobeMeasurements: Array.isArray(draft.wardrobeMeasurements)
          ? draft.wardrobeMeasurements
          : [],
      };
  } catch {
    /* Storage may be unavailable. */
  }
  return emptyConceptDraft(ownerId);
}
export const conceptBookingPath = (id: string, screen = 'date') =>
  `/concept-booking/packages/${encodeURIComponent(id)}/book/${screen}`;
export const conceptPhotographerPath = (packageId: string, photographerId: string) =>
  `/concept-booking/packages/${encodeURIComponent(packageId)}/photographers/${encodeURIComponent(photographerId)}`;
export const validWardrobeMeasurements = (
  rows: WardrobeMeasurement[] | undefined,
  people: number,
) =>
  Array.isArray(rows) &&
  rows.length === people &&
  rows.every(
    (row) =>
      typeof row?.size === 'string' &&
      !!row.size.trim() &&
      row.size.length <= 12 &&
      Number.isFinite(row.heightCm) &&
      row.heightCm >= 30 &&
      row.heightCm <= 250 &&
      Number.isFinite(row.weightKg) &&
      row.weightKg >= 1 &&
      row.weightKg <= 350,
  );

export function writeConceptDraft(draft: ConceptDraft) {
  try {
    sessionStorage.setItem(CONCEPT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* Keep navigation available when storage is disabled. */
  }
}

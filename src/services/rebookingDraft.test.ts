import { describe, expect, it } from 'vitest';
import { rentalDraftFromOrder } from './rentalDraft';
import { conceptDraftFromOrder } from './conceptDraft';
import { bookingDraftFromOrder } from './bookingDraft';
import type { RentalOrder } from './rentalService';
import type { ConceptOrder } from './conceptService';
import type { BookingWorkflowDto } from './bookingWorkflowService';

describe('restore expired orders for a fresh booking', () => {
  it('restores agreed rental selections and dates without reusing payments, consent or retry keys', () => {
    const order = {
      contactName: 'Khách thuê',
      phone: '0901234567',
      note: 'Giao đủ bộ',
      requestedReceiveDate: '2026-11-20',
      requestedReturnDate: '2026-11-21',
      requestedLines: [],
      quote: {
        receiveDate: '2026-11-22T17:00:00Z',
        returnDate: '2026-11-24T17:00:00Z',
        lines: [{ costumeId: 'dress', size: 'M', quantity: 3 }],
        fee: 690000,
        deposit: 207000,
      },
      depositPayment: { reference: 'OLD-QR' },
    } as unknown as RentalOrder;
    const draft = rentalDraftFromOrder(order, 'owner');
    expect(draft).toMatchObject({
      ownerId: 'owner',
      contactName: 'Khách thuê',
      phone: '0901234567',
      note: 'Giao đủ bộ',
      receiveDate: '2026-11-23',
      returnDate: '2026-11-25',
      lines: [{ costumeId: 'dress', size: 'M', quantity: '3' }],
      preview: true,
    });
    for (const key of [
      'requestKey',
      'signature',
      'termsAccepted',
      'policyVersion',
      'depositPayment',
      'quote',
    ])
      expect(draft).not.toHaveProperty(key);
    expect(rentalDraftFromOrder(order, 'owner').restorationId).not.toBe(draft.restorationId);
    draft.lines[0].size = 'L';
    expect(order.quote!.lines[0].size).toBe('M');
  });
  it('restores concept preparation and references using a new checkout key', () => {
    const order = {
      package: 'pkg',
      startAt: '2026-11-23T03:00:00Z',
      photographer: 'photo',
      people: 2,
      contactName: 'Khách chụp',
      phone: '0901234567',
      brief: 'Ánh sáng tự nhiên',
      wardrobeMeasurements: [
        { size: 'M', heightCm: 165, weightKg: 50 },
        { size: 'L', heightCm: 175, weightKg: 70 },
      ],
      references: ['https://example.com/one', 'https://example.com/two'],
      paymentRequests: [{ reference: 'OLD-QR' }],
    } as unknown as ConceptOrder;
    const draft = conceptDraftFromOrder(order, 'owner');
    expect(draft).toMatchObject({
      ownerId: 'owner',
      packageId: 'pkg',
      startAt: order.startAt,
      photographerId: 'photo',
      people: 2,
      contactName: 'Khách chụp',
      phone: '0901234567',
      brief: order.brief,
      wardrobeMeasurements: order.wardrobeMeasurements,
      referencesText: order.references.join('\n'),
      step: 5,
    });
    expect(draft).not.toHaveProperty('paymentRequests');
    expect(draft.key).not.toBe(conceptDraftFromOrder(order, 'owner').key);
    draft.wardrobeMeasurements[0].size = 'XL';
    expect(order.wardrobeMeasurements![0].size).toBe('M');
  });
  it('restores yearbook students and Vietnam times without old package consent or submission identity', () => {
    const record = {
      booking: {
        packageId: 'pkg',
        className: '12A1',
        school: 'Trường A',
        members: 2,
        contactName: 'Đại diện lớp',
        phone: '0901234567',
        startAt: '2026-11-23T00:00:00Z',
        endAt: '2026-11-23T06:00:00Z',
        location: 'Sân trường',
        note: 'Chụp cả lớp',
        packageAgreement: { acceptedAt: 'old' },
      },
      workflow: {
        members: [
          {
            name: 'Nguyễn An',
            contact: '0912345678',
            height: 165.5,
            weight: 50,
            pantsSize: '28',
            shirtSize: 'M',
            notes: 'Lưu ý riêng',
          },
        ],
      },
    } as unknown as BookingWorkflowDto;
    const draft = bookingDraftFromOrder(record, 'owner');
    expect(draft).toMatchObject({
      ownerId: 'owner',
      packageId: 'pkg',
      step: 4,
      className: '12A1',
      school: 'Trường A',
      members: '2',
      contactName: 'Đại diện lớp',
      phone: '0901234567',
      startAt: '2026-11-23T07:00',
      endAt: '2026-11-23T13:00',
      location: 'Sân trường',
      note: 'Chụp cả lớp',
      students: [
        {
          name: 'Nguyễn An',
          phone: '0912345678',
          height: '165.5',
          weight: '50',
          pantsSize: '28',
          shirtSize: 'M',
          notes: 'Lưu ý riêng',
        },
      ],
    });
    expect(draft.packageConsentKey).toBeUndefined();
    expect(draft.submissionFingerprint).toBeUndefined();
    expect(draft.idempotencyKey).not.toBe(bookingDraftFromOrder(record, 'owner').idempotencyKey);
  });
});

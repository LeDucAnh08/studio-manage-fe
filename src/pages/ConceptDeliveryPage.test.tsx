import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConceptDeliveryPage from './ConceptDeliveryPage';
import { ConceptDeliveryWorkspace } from '@/components/ConceptDeliveryWorkspace';
import { CustomerAppearanceContext } from '@/components/customer/CustomerAppearance';
import {
  conceptService,
  type ConceptAlbum,
  type ConceptOrder,
} from '@/services/conceptService';

const auth = vi.hoisted(() => ({ user: { _id: 'client-1', roles: [6], name: 'Khách An' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useAlbumOperation', () => ({
  useAlbumOperation: () => ({ pending: false, failed: false, message: '', watch: vi.fn() }),
}));
vi.mock('@/services/conceptService', async (original) => ({
  ...(await original<typeof import('@/services/conceptService')>()),
  conceptService: {
    order: vi.fn(),
    album: vi.fn(),
    albumCommand: vi.fn(),
    image: vi.fn(),
    deliveryDrafts: vi.fn(),
    uploadDeliveryPhoto: vi.fn(),
    deleteDeliveryPhoto: vi.fn(),
    deliveryImage: vi.fn(),
    zip: vi.fn(),
  },
}));

const baseOrder = (): ConceptOrder =>
  ({
    _id: 'order-1',
    package: 'pkg-1',
    version: 2,
    isOwner: true,
    canEdit: false,
    canManage: false,
    status: 'shot',
    orderStage: 'handing_over',
    photographer: 'photo-1',
    snapshot: {
      name: 'Nàng thơ buổi sáng',
      conceptName: 'Nàng thơ',
      price: 1000000,
      deposit: 300000,
      durationMinutes: 60,
      retouchQuota: 10,
      extraPhotoPrice: 50000,
    },
    startAt: '2026-11-14T08:00:00Z',
    endAt: '2026-11-14T09:00:00Z',
    originalStartAt: '2026-11-14T08:00:00Z',
    contactName: 'Khách An',
    phone: '0901234567',
    people: 1,
    references: [],
    costumes: [],
    wardrobe: 'pending',
    paymentRequests: [{ id: 'p2', kind: 'balance', status: 'paid', amount: 700000 }],
    events: [],
    refundDue: 0,
    retained: 0,
    netReceived: 1000000,
    rescheduleCount: 0,
  }) as unknown as ConceptOrder;

const deliveredAlbum = (): ConceptAlbum =>
  ({
    id: 'album-1',
    title: 'Album Nàng thơ',
    version: 3,
    status: 'delivered',
    selectionRound: 0,
    deliveryVersion: 1,
    extraAmount: 0,
    allowDownload: true,
    freeRoundsUsed: 0,
    selections: [],
    deliveries: [{ version: 1, at: '2026-11-15T10:00:00Z', source: 'local' }],
    feedbackRounds: [],
    paidRequests: [],
    photos: [
      {
        id: 'local-1',
        source: 'local',
        name: 'anh-retouch-1.jpg',
        version: 1,
        width: 1200,
        height: 800,
        available: true,
      },
    ],
  }) as unknown as ConceptAlbum;

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
  vi.mocked(conceptService.image).mockResolvedValue(new Blob(['img']));
  vi.mocked(conceptService.deliveryImage).mockResolvedValue(new Blob(['local']));
  vi.mocked(conceptService.deliveryDrafts).mockResolvedValue([]);
});

describe('concept yearbook-style delivery flow', () => {
  it('lets customer view local delivered photos, submit general feedback and accept delivery', async () => {
    auth.user = { _id: 'client-1', roles: [6], name: 'Khách An' };
    vi.mocked(conceptService.order).mockResolvedValue(baseOrder());
    vi.mocked(conceptService.album).mockResolvedValue(deliveredAlbum());
    vi.mocked(conceptService.albumCommand)
      .mockResolvedValueOnce({
        ...deliveredAlbum(),
        freeRoundsUsed: 1,
        feedbackRounds: [
          {
            id: 'r1',
            round: 1,
            version: 1,
            at: '2026-11-15T11:00:00Z',
            items: [{ photoId: 'general', note: 'Chỉnh da mịn hơn một chút nhé.', resolved: false }],
          },
        ],
        version: 4,
      })
      .mockResolvedValueOnce({
        ...deliveredAlbum(),
        status: 'completed',
        version: 5,
      });

    render(
      <MemoryRouter initialEntries={['/account/concept-orders/order-1/delivery']}>
        <CustomerAppearanceContext.Provider value={true}>
          <Routes>
            <Route path="/account/concept-orders/:id/delivery" element={<ConceptDeliveryPage />} />
          </Routes>
        </CustomerAppearanceContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Album bàn giao' })).toBeInTheDocument();
    expect((await screen.findAllByText('anh-retouch-1.jpg')).length).toBeGreaterThanOrEqual(1);
    fireEvent.change(screen.getByLabelText('Nội dung phản hồi'), {
      target: { value: 'Chỉnh da mịn hơn một chút nhé.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));
    await waitFor(() =>
      expect(conceptService.albumCommand).toHaveBeenCalledWith(
        'order-1',
        'feedback',
        {
          deliveryVersion: 1,
          items: [{ photoId: 'general', note: 'Chỉnh da mịn hơn một chút nhé.' }],
          expectedVersion: 3,
        },
        expect.any(String),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' }));
    await waitFor(() =>
      expect(conceptService.albumCommand).toHaveBeenCalledWith(
        'order-1',
        'accept',
        {
          deliveryVersion: 1,
          expectedVersion: 4,
        },
        expect.any(String),
      ),
    );
  });

  it('gives photographer 4-step yearbook workspace with direct photo upload delivery', async () => {
    auth.user = { _id: 'photo-1', roles: [3], name: 'Minh Đức' };
    const order = { ...baseOrder(), isOwner: false, canEdit: true };
    vi.mocked(conceptService.album).mockRejectedValue({ response: { status: 404 } });
    vi.mocked(conceptService.deliveryDrafts).mockResolvedValue([
      {
        id: 'draft-1',
        source: 'local',
        name: 'final-01.jpg',
        version: -1,
        width: 1000,
        height: 1500,
        available: true,
      },
    ]);
    vi.mocked(conceptService.albumCommand).mockResolvedValue(deliveredAlbum());

    render(
      <MemoryRouter>
        <ConceptDeliveryWorkspace order={order} onOrderChange={vi.fn()} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /Album ảnh gốc/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yêu cầu chỉnh ảnh/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ảnh đã chỉnh/ }));
    expect(await screen.findByText('final-01.jpg')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi ảnh tải lên' }));
    await waitFor(() =>
      expect(conceptService.albumCommand).toHaveBeenCalledWith(
        'order-1',
        'deliver',
        { deliveryPhotoIds: ['draft-1'], expectedVersion: 0 },
        expect.any(String),
      ),
    );
  });
});

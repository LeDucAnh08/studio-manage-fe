import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAppearanceContext } from '@/components/customer/CustomerAppearance';
import type { BookingWorkflowDto } from '@/services/bookingWorkflowService';
import BookingDeliveryPage from './BookingDeliveryPage';
import type { BookingAlbum } from '@/services/bookingAlbumService';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  act: vi.fn(),
  key: vi.fn(),
  albumGet: vi.fn(),
  albumCommand: vi.fn(),
  albumImage: vi.fn(),
  albumClient: vi.fn(),
  user: { _id: 'client', roles: [6] },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../services/bookingWorkflowService', () => ({
  bookingWorkflowService: { get: mocks.get, act: mocks.act },
  createWorkflowRequestId: mocks.key,
}));
vi.mock('../services/bookingAlbumService', () => ({
  albumClient: (...args: unknown[]) => {
    mocks.albumClient(...args);
    return { get: mocks.albumGet, command: mocks.albumCommand, image: mocks.albumImage };
  },
  albumError: (e: Error) => e.message,
}));
vi.mock('../components/customer/DeliveryPhotoUpload', () => ({
  DeliveryPhotoUpload: ({ onChange }: { onChange: (ids: string[]) => void }) => (
    <button onClick={() => onChange(['local-photo'])}>Chọn ảnh local mẫu</button>
  ),
}));
vi.mock('../components/customer/DeliveryPhotoGallery', () => ({
  DeliveryPhotoGallery: ({ photos }: { photos: Array<{ id: string; name: string }> }) => (
    <ul aria-label="Ảnh đã hậu kỳ">
      {photos.map((photo) => (
        <li key={photo.id}>{photo.name}</li>
      ))}
    </ul>
  ),
}));
function fixture(
  lifecycle: BookingWorkflowDto['workflow']['lifecycle'] = 'delivered',
): BookingWorkflowDto {
  return {
    booking: {
      _id: 'booking',
      status: 'approved',
      packageName: 'Gói lớp',
      members: 25,
      className: '12A',
      startAt: '2027-01-01T08:00:00+07:00',
      endAt: '2027-01-01T12:00:00+07:00',
      location: 'Studio',
    },
    workflow: {
      bookingId: 'booking',
      version: 7,
      lifecycle,
      quote: null,
      payments: null,
      resources: null,
      allowedCostumes: [],
      members: [],
      progress: {
        status: 'delivered',
        deliveryVersion: 2,
        photos: [{ id: 'p2', name: 'edited-v2.jpg', width: 1200, height: 800 }],
        deliveredAt: '2026-11-06T01:00:00Z',
        revisionRequests: [],
      },
      changeRequest: null,
      feedback: null,
      quoteHistory: [],
      deliveryHistory: [
        {
          version: 1,
          photos: [{ id: 'p1', name: 'edited-v1.jpg', width: 1200, height: 800 }],
          deliveredAt: '2026-11-05T01:00:00Z',
        },
        {
          version: 2,
          photos: [{ id: 'p2', name: 'edited-v2.jpg', width: 1200, height: 800 }],
          deliveredAt: '2026-11-06T01:00:00Z',
        },
      ],
      paymentInstructions: null,
      paymentReady: false,
      events: [],
      memberEntry: null,
    },
  };
}
function open(search = '', customer = true) {
  return render(
    <CustomerAppearanceContext.Provider value={customer}>
      <MemoryRouter initialEntries={['/account/bookings/booking/delivery' + search]}>
        <Routes>
          <Route path="/account/bookings/:id/delivery" element={<BookingDeliveryPage />} />
        </Routes>
      </MemoryRouter>
    </CustomerAppearanceContext.Provider>,
  );
}
describe('Private delivery album and customer feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { _id: 'client', roles: [6] };
    mocks.get.mockResolvedValue(fixture());
    mocks.key.mockReturnValue('delivery-request-key');
    mocks.albumGet.mockResolvedValue(null);
    mocks.albumImage.mockResolvedValue(new Blob(['image'], { type: 'image/jpeg' }));
    URL.createObjectURL = vi.fn(() => 'blob:delivery-album-test');
    URL.revokeObjectURL = vi.fn();
  });
  it('opens the latest photo album with a single feedback form and a profile back link', async () => {
    open();
    await screen.findByText('edited-v2.jpg');
    expect(screen.getByRole('link', { name: 'Quay lại hồ sơ đơn' })).toHaveAttribute(
      'href',
      '/account/bookings/booking',
    );
    expect(screen.getByRole('button', { name: 'Gửi phản hồi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' })).toBeEnabled();
  });
  it('binds feedback to the current version and retries an uncertain response with the same key', async () => {
    const next = fixture('revision_requested');
    next.workflow.version = 8;
    next.workflow.progress!.revisionRequests = [
      {
        _id: 'r1',
        note: 'Tăng sáng edited-v2.jpg',
        deliveryVersion: 2,
        at: '2026-11-06T02:00:00Z',
      },
    ];
    mocks.act.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(next);
    open();
    await screen.findByText('edited-v2.jpg');
    fireEvent.change(screen.getByLabelText('Nội dung phản hồi'), {
      target: { value: ' Tăng sáng edited-v2.jpg ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));
    await screen.findByText('Tăng sáng edited-v2.jpg');
    expect(mocks.act).toHaveBeenNthCalledWith(
      1,
      'booking',
      7,
      'revision.request',
      { note: 'Tăng sáng edited-v2.jpg', deliveryVersion: 2 },
      'delivery-request-key',
    );
    expect(mocks.act.mock.calls[1]).toEqual(mocks.act.mock.calls[0]);
    expect(screen.queryByRole('button', { name: 'Gửi phản hồi' })).not.toBeInTheDocument();
  });
  it('shows previous versions read-only and never offers stale acceptance', async () => {
    open('?version=1');
    await screen.findByText('edited-v1.jpg');
    expect(
      screen.queryByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nội dung phản hồi')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Phiên bản ảnh'), { target: { value: '2' } });
    expect(
      await screen.findByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' }),
    ).toBeEnabled();
  });
  it('accepts only the latest version and preserves feedback draft after a conflict', async () => {
    mocks.act.mockRejectedValue({ response: { status: 409 } });
    open();
    await screen.findByText('edited-v2.jpg');
    fireEvent.change(screen.getByLabelText('Nội dung phản hồi'), {
      target: { value: 'Góp ý đang viết' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('bản bàn giao đã thay đổi');
    expect(mocks.act).toHaveBeenCalledWith(
      'booking',
      7,
      'delivery.accept',
      { deliveryVersion: 2 },
      'delivery-request-key',
    );
    expect(screen.getByLabelText('Nội dung phản hồi')).toHaveValue('Góp ý đang viết');
  });
  it('shows a valid legacy album link without embedding arbitrary URLs', async () => {
    const record = fixture();
    record.workflow.progress!.photos = [];
    record.workflow.progress!.deliveryUrl = 'https://drive.google.com/drive/folders/example';
    mocks.get.mockResolvedValue(record);
    open();
    expect(await screen.findByRole('link', { name: 'Mở album bàn giao cũ' })).toHaveAttribute(
      'href',
      'https://drive.google.com/drive/folders/example',
    );
  });
  it('lets customers submit the existing service feedback once after completion', async () => {
    const record = fixture('completed'),
      next = fixture('completed');
    next.workflow.feedback = { rating: 4, comment: 'Ảnh đẹp', at: '2026-11-06T02:00:00Z' };
    mocks.get.mockResolvedValue(record);
    mocks.act.mockResolvedValue(next);
    open();
    await screen.findByText('edited-v2.jpg');
    fireEvent.change(screen.getByLabelText('Số sao'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Nhận xét'), { target: { value: 'Ảnh đẹp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }));
    await screen.findByRole('heading', { name: 'Đánh giá đã gửi' });
    expect(mocks.act).toHaveBeenCalledWith(
      'booking',
      7,
      'feedback.submit',
      { rating: 4, comment: 'Ảnh đẹp' },
      'delivery-request-key',
    );
  });
  it('keeps the studio viewer read-only for customer actions', async () => {
    mocks.user = { _id: 'admin', roles: [0] };
    open('', false);
    await screen.findByText('edited-v2.jpg');
    expect(screen.queryByLabelText('Nội dung phản hồi')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' }),
    ).not.toBeInTheDocument();
  });
  it('lets the booking owner select and finalize before delivery in the same screen', async () => {
    const workflow = fixture('editing');
    workflow.workflow.progress!.deliveryVersion = 0;
    workflow.workflow.progress!.photos = [];
    workflow.workflow.deliveryHistory = [];
    mocks.get.mockResolvedValue(workflow);
    const album: BookingAlbum = {
      publicId: 'album-public',
      title: 'Album lớp',
      version: 2,
      status: 'open',
      limit: 2,
      canSelect: true,
      canCommentDelivery: false,
      latestDeliveryVersion: 0,
      deliveryVersions: [],
      folders: [],
      photos: [
        {
          id: 'proof',
          driveId: 'drive-proof',
          source: 'drive',
          folderId: 'folder',
          name: 'proof.jpg',
          width: 100,
          height: 80,
          deliveryVersion: 0,
          selected: false,
          note: '',
          available: true,
        },
      ],
    };
    mocks.albumGet.mockResolvedValue(album);
    mocks.albumCommand.mockResolvedValue({
      ...album,
      version: 3,
      photos: [{ ...album.photos[0], selected: true }],
    });
    open();
    await screen.findByRole('button', { name: 'Chọn proof.jpg' });
    expect(screen.getByRole('tab', { name: 'Ảnh chọn' })).toHaveAttribute('aria-selected', 'true');
    expect(mocks.albumClient).toHaveBeenCalledWith(false, 'booking', '', true);
    expect(screen.queryByLabelText('Thư mục Drive · mỗi link một dòng')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chọn proof.jpg' }));
    await waitFor(() =>
      expect(mocks.albumCommand).toHaveBeenCalledWith(
        'photo',
        { photoId: 'proof', selected: true, expectedVersion: 2 },
        'delivery-request-key',
      ),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tất lựa chọn' }));
    mocks.albumCommand.mockResolvedValue({
      ...album,
      version: 4,
      status: 'closed',
      canSelect: false,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gửi lựa chọn' }));
    await waitFor(() =>
      expect(mocks.albumCommand).toHaveBeenLastCalledWith(
        'finalize',
        { expectedVersion: 3 },
        'delivery-request-key',
      ),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Ảnh đã chỉnh' }));
    expect(
      screen.getByText('Studio chưa bàn giao ảnh. Vui lòng quay lại sau.'),
    ).toBeInTheDocument();
  });
  it('keeps Drive setup and delivery tools in their respective tabs for studio staff', async () => {
    const record = fixture('editing');
    record.workflow.progress!.deliveryVersion = 0;
    record.workflow.deliveryHistory = [];
    mocks.user = { _id: 'admin', roles: [0] };
    mocks.get.mockResolvedValue(record);
    open('', false);
    await screen.findByLabelText('Thư mục Drive · mỗi link một dòng');
    expect(screen.getByRole('tab', { name: 'Ảnh chọn' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Ảnh đã chỉnh' }));
    expect(screen.queryByLabelText('Thư mục Drive · mỗi link một dòng')).not.toBeInTheDocument();
    expect(screen.getByText('Tải ảnh trực tiếp lên hệ thống')).toBeInTheDocument();
  });
  it('publishes local uploads from the shared edited-photo tab and selects the latest version', async () => {
    const record = fixture('editing'),
      next = fixture();
    next.workflow.version = 8;
    next.workflow.progress!.deliveryVersion = 3;
    next.workflow.progress!.photos = [
      { id: 'local-photo', name: 'local-v3.jpg', width: 100, height: 80 },
    ];
    mocks.user = { _id: 'admin', roles: [0] };
    mocks.get.mockResolvedValue(record);
    mocks.act.mockResolvedValue(next);
    open('?tab=delivery', false);
    fireEvent.click(await screen.findByText('Tải ảnh trực tiếp lên hệ thống'));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn ảnh local mẫu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi ảnh tải lên' }));
    await screen.findByText('local-v3.jpg');
    expect(mocks.act).toHaveBeenCalledWith(
      'booking',
      7,
      'progress.update',
      { status: 'delivered', deliveryPhotoIds: ['local-photo'] },
      'delivery-request-key',
    );
    expect(screen.getByLabelText('Phiên bản ảnh')).toHaveValue('3');
  });
});

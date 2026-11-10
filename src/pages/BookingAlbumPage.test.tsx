import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookingAlbum } from '@/services/bookingAlbumService';
import BookingAlbumPage from './BookingAlbumPage';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  command: vi.fn(),
  image: vi.fn(),
  export: vi.fn(),
  act: vi.fn(),
  client: vi.fn(),
}));
vi.mock('../services/bookingAlbumService', () => ({
  albumClient: (...args: unknown[]) => {
    mocks.client(...args);
    return mocks;
  },
  albumError: (error: Error) => error.message,
}));
vi.mock('../services/bookingWorkflowService', () => ({
  bookingWorkflowService: { act: mocks.act },
  createWorkflowRequestId: () => 'album-test-request-key',
}));
function fixture(): BookingAlbum {
  return {
    publicId: 'album_public_id',
    title: 'Khoảnh khắc lớp mình',
    version: 3,
    status: 'open',
    limit: 2,
    canSelect: true,
    folders: [{ id: 'folder', name: 'Ngoại cảnh' }],
    photos: [
      {
        id: 'photo',
        source: 'drive',
        driveId: 'drive-photo',
        name: 'IMG_001.jpg',
        width: 100,
        height: 80,
        folderId: 'folder',
        deliveryVersion: 0,
        available: true,
        selected: true,
        note: '',
      },
    ],
    latestDeliveryVersion: 0,
    deliveryVersions: [],
    canCommentDelivery: false,
  };
}
function open(staff = false) {
  return render(
    <MemoryRouter
      initialEntries={[
        staff ? '/workflow-bookings/booking/album' : '/albums/album_public_id#access=guest-secret',
      ]}
    >
      <Routes>
        <Route
          path={staff ? '/workflow-bookings/:id/album' : '/albums/:publicId'}
          element={<BookingAlbumPage staff={staff} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
describe('Drive album UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(fixture());
    mocks.image.mockResolvedValue(new Blob(['image'], { type: 'image/jpeg' }));
    URL.createObjectURL = vi.fn(() => 'blob:album-test');
    URL.revokeObjectURL = vi.fn();
  });
  it('opens guest link without an account and confirms before locking selection', async () => {
    mocks.command.mockResolvedValue({
      ...fixture(),
      version: 4,
      status: 'closed',
      canSelect: false,
    });
    open();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Khoảnh khắc lớp mình',
    );
    expect(mocks.client).toHaveBeenCalledWith(false, 'album_public_id', 'guest-secret');
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tất lựa chọn' }));
    expect(mocks.command).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gửi lựa chọn' }));
    await waitFor(() =>
      expect(mocks.command).toHaveBeenCalledWith(
        'finalize',
        { expectedVersion: 3 },
        'album-test-request-key',
      ),
    );
    await screen.findByText('Lựa chọn đã khóa. Liên hệ studio nếu muốn thay đổi.');
    expect(screen.queryByRole('button', { name: 'Hoàn tất lựa chọn' })).not.toBeInTheDocument();
  });
  it('keeps a note after version conflict and refresh, retrying against the fresh version', async () => {
    mocks.command.mockRejectedValueOnce(new Error('Album đã thay đổi'));
    open();
    await screen.findByRole('button', { name: 'Xem IMG_001.jpg' });
    fireEvent.click(screen.getByRole('button', { name: 'Xem IMG_001.jpg' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Ghi chú cho studio'), {
      target: { value: 'Giữ màu da tự nhiên' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu ghi chú' }));
    await within(dialog).findByRole('alert');
    expect(within(dialog).getByLabelText('Ghi chú cho studio')).toHaveValue('Giữ màu da tự nhiên');
    mocks.get.mockResolvedValue({ ...fixture(), version: 4 });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Tải lại album · giữ ghi chú đang viết' }),
    );
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
    mocks.command.mockResolvedValue({
      ...fixture(),
      version: 5,
      photos: [{ ...fixture().photos[0], note: 'Giữ màu da tự nhiên' }],
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu ghi chú' }));
    await waitFor(() =>
      expect(mocks.command).toHaveBeenLastCalledWith(
        'photo',
        { photoId: 'photo', note: 'Giữ màu da tự nhiên', expectedVersion: 4 },
        'album-test-request-key',
      ),
    );
  });
  it('sets selection explicitly and shows controls read-only on historical deliveries', async () => {
    const value = fixture();
    value.deliveryVersions = [1, 2];
    value.latestDeliveryVersion = 2;
    value.canCommentDelivery = true;
    value.photos.push(
      { ...value.photos[0], id: 'edit1', name: 'old.jpg', deliveryVersion: 1 },
      { ...value.photos[0], id: 'edit2', name: 'new.jpg', deliveryVersion: 2 },
    );
    mocks.get.mockResolvedValue(value);
    open();
    await screen.findByRole('button', { name: 'Ảnh đã chỉnh · Bản 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Ảnh đã chỉnh · Bản 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem old.jpg' }));
    expect(screen.getByLabelText('Ghi chú cho studio')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Lưu ghi chú' })).not.toBeInTheDocument();
  });
  it('staff configures folders and publishes delivery through the workflow action', async () => {
    const value = { ...fixture(), workflowVersion: 7, lifecycle: 'editing' };
    value.photos.push({ ...value.photos[0], id: 'draft', deliveryVersion: -1 });
    mocks.get.mockResolvedValue(value);
    mocks.command.mockResolvedValue(value);
    mocks.act.mockResolvedValue({});
    open(true);
    await screen.findByRole('heading', { level: 1 });
    fireEvent.change(screen.getByLabelText('Thư mục Drive · mỗi link một dòng'), {
      target: { value: 'https://drive.google.com/drive/folders/source_12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và lấy ảnh' }));
    await waitFor(() =>
      expect(mocks.command).toHaveBeenCalledWith(
        'configure',
        expect.objectContaining({
          folders: ['https://drive.google.com/drive/folders/source_12345'],
          expectedVersion: 3,
        }),
        'album-test-request-key',
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Gửi bản bàn giao mới' })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gửi bản bàn giao mới' }));
    await waitFor(() =>
      expect(mocks.act).toHaveBeenCalledWith(
        'booking',
        7,
        'progress.update',
        { status: 'delivered', driveAlbum: true, albumVersion: 3 },
        'album-test-request-key',
      ),
    );
  });
  it('shows an unavailable link without navigating to login', async () => {
    mocks.get.mockRejectedValue(new Error('Link album không còn khả dụng.'));
    open();
    expect(await screen.findByRole('heading', { name: 'Album chưa khả dụng' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /đăng nhập/i })).not.toBeInTheDocument();
  });
  it('keeps text typed while an earlier note is saving and can discard an unsavable draft', async () => {
    let resolve!: (value: BookingAlbum) => void;
    mocks.command.mockImplementation(
      () =>
        new Promise<BookingAlbum>((done) => {
          resolve = done;
        }),
    );
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Xem IMG_001.jpg' }));
    const input = screen.getByLabelText('Ghi chú cho studio');
    fireEvent.change(input, { target: { value: 'Bản đầu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu ghi chú' }));
    fireEvent.change(input, { target: { value: 'Bản bổ sung khi đang lưu' } });
    resolve({ ...fixture(), version: 4, photos: [{ ...fixture().photos[0], note: 'Bản đầu' }] });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Lưu ghi chú' })).not.toBeDisabled(),
    );
    expect(input).toHaveValue('Bản bổ sung khi đang lưu');
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi ghi chú' }));
    expect(input).toHaveValue('Bản đầu');
  });
});

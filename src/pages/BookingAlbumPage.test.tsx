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
  jobGet: vi.fn(),
}));
vi.mock('../services/backgroundJobService', () => ({
  isQueuedAlbum: (value: unknown) =>
    !!value && typeof value === 'object' && 'backgroundOperation' in value,
  backgroundJobService: { latest: async () => null, get: mocks.jobGet },
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
      {
        id: 'photo-2',
        source: 'drive',
        driveId: 'drive-photo-2',
        name: 'IMG_002.jpg',
        width: 80,
        height: 100,
        folderId: 'folder',
        deliveryVersion: 0,
        available: true,
        selected: false,
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
  it('keeps the current album while a queued sync runs and refreshes after completion', async () => {
    mocks.command.mockResolvedValue({
      backgroundOperation: {
        id: 'queued-job',
        orderId: 'booking',
        service: 'yearbook',
        status: 'pending',
        message: '',
      },
    });
    mocks.jobGet.mockResolvedValue({
      id: 'queued-job',
      orderId: 'booking',
      service: 'yearbook',
      status: 'succeeded',
      message: '',
    });
    open(true);
    await screen.findByLabelText('Tên album');
    fireEvent.change(screen.getByLabelText('Tên album'), {
      target: { value: 'Bản nháp đang nhập' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật từ Drive' }));
    await screen.findByText(/Đang chờ đồng bộ ảnh/);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Khoảnh khắc lớp mình');
    expect(screen.getByLabelText('Tên album')).toHaveValue('Bản nháp đang nhập');
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(screen.getByLabelText('Tên album')).toHaveValue('Bản nháp đang nhập');
  });
  it('confirms sending only requested photos and keeps the full original album available', async () => {
    mocks.command.mockResolvedValue({
      ...fixture(),
      version: 4,
      status: 'closed',
      canSelect: false,
      finalizedAt: '2026-11-26T01:00:00Z',
    });
    open();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Khoảnh khắc lớp mình',
    );
    expect(mocks.client).toHaveBeenCalledWith(false, 'album_public_id', 'guest-secret');
    expect(screen.getByText(/toàn bộ ảnh gốc qua Google Drive/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Thư mục' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tải lại album' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Có yêu cầu (1)' }));
    expect(screen.queryByRole('button', { name: 'Xem IMG_002.jpg' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu chỉnh sửa' }));
    expect(mocks.command).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Gửi yêu cầu' }),
    );
    await waitFor(() =>
      expect(mocks.command).toHaveBeenCalledWith(
        'finalize',
        { expectedVersion: 3 },
        'album-test-request-key',
      ),
    );
    await screen.findByText('Đã gửi yêu cầu', { exact: true });
    expect(screen.getByRole('button', { name: 'Xem IMG_001.jpg' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Xem IMG_002.jpg' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Gửi yêu cầu chỉnh sửa' })).not.toBeInTheDocument();
  });
  it('adds the original photo and its note in one operation', async () => {
    const album = fixture();
    album.photos[1] = { ...album.photos[1], selected: true, note: 'Tăng sáng phần mặt' };
    mocks.command.mockResolvedValue({ ...album, version: 4 });
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu chỉnh sửa IMG_002.jpg' }));
    expect(mocks.command).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Ghi chú cho studio'), {
      target: { value: 'Tăng sáng phần mặt' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm yêu cầu' }));
    await screen.findByText('Đã thêm yêu cầu', { exact: true });
    expect(mocks.command).toHaveBeenCalledWith(
      'photo',
      { photoId: 'photo-2', selected: true, note: 'Tăng sáng phần mặt', expectedVersion: 3 },
      'album-test-request-key',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại album' }));
    expect(screen.getByRole('button', { name: 'Có yêu cầu (2)' })).toBeVisible();
  });
  it('keeps a note after version conflict and refresh, retrying against the fresh version', async () => {
    mocks.command.mockRejectedValueOnce(new Error('Album đã thay đổi'));
    open();
    await screen.findByRole('button', { name: 'Xem IMG_001.jpg' });
    fireEvent.click(screen.getByRole('button', { name: 'Xem IMG_001.jpg' }));
    const viewer = screen.getByRole('region', { name: 'Xem ảnh gốc' });
    fireEvent.change(within(viewer).getByLabelText('Ghi chú cho studio'), {
      target: { value: 'Giữ màu da tự nhiên' },
    });
    fireEvent.click(within(viewer).getByRole('button', { name: 'Lưu thay đổi' }));
    await within(viewer).findByRole('alert');
    expect(within(viewer).getByLabelText('Ghi chú cho studio')).toHaveValue('Giữ màu da tự nhiên');
    mocks.get.mockResolvedValue({ ...fixture(), version: 4 });
    fireEvent.click(
      within(viewer).getByRole('button', { name: 'Tải lại album · giữ ghi chú đang viết' }),
    );
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
    mocks.command.mockResolvedValue({
      ...fixture(),
      version: 5,
      photos: [{ ...fixture().photos[0], note: 'Giữ màu da tự nhiên' }],
    });
    fireEvent.click(within(viewer).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() =>
      expect(mocks.command).toHaveBeenLastCalledWith(
        'photo',
        { photoId: 'photo', note: 'Giữ màu da tự nhiên', expectedVersion: 4 },
        'album-test-request-key',
      ),
    );
  });
  it('reuses loaded thumbnails as the request and folder filters regroup the photos', async () => {
    const album = fixture();
    album.folders.push({ id: 'classroom', name: 'Trong lớp' });
    album.photos[0] = { ...album.photos[0], selected: false };
    album.photos[1] = { ...album.photos[1], selected: true, folderId: 'classroom' };
    mocks.get.mockResolvedValue(album);
    open();

    await screen.findByRole('img', { name: 'IMG_001.jpg' });
    await screen.findByRole('img', { name: 'IMG_002.jpg' });
    expect(mocks.image).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Có yêu cầu (1)' }));
    expect(await screen.findByRole('img', { name: 'IMG_002.jpg' })).toBeVisible();
    expect(screen.queryByRole('img', { name: 'IMG_001.jpg' })).not.toBeInTheDocument();
    expect(mocks.image).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Tất cả (2)' }));
    expect(await screen.findByRole('img', { name: 'IMG_001.jpg' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'IMG_002.jpg' })).toBeVisible();

    fireEvent.change(screen.getByRole('combobox', { name: 'Thư mục' }), {
      target: { value: 'classroom' },
    });
    expect(await screen.findByRole('img', { name: 'IMG_002.jpg' })).toBeVisible();
    expect(mocks.image).toHaveBeenCalledTimes(2);
  });
  it('keeps the thumbnails and filter of each visited album tab until the album closes', async () => {
    const album = fixture();
    album.folders.push({ id: 'classroom', name: 'Trong lớp' });
    album.photos[1] = { ...album.photos[1], folderId: 'classroom' };
    album.deliveryVersions = [1];
    album.latestDeliveryVersion = 1;
    album.photos.push({
      ...album.photos[0],
      id: 'edited-1',
      name: 'edited.jpg',
      deliveryVersion: 1,
      note: 'Sáng hơn',
    });
    mocks.get.mockResolvedValue(album);
    const { unmount } = open();

    const edited = await screen.findByRole('img', { name: 'edited.jpg' });
    expect(mocks.image.mock.calls.map(([id]) => id)).toEqual(['edited-1']);
    fireEvent.click(screen.getByRole('button', { name: 'Có góp ý (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ảnh gốc' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Thư mục' }), {
      target: { value: 'classroom' },
    });
    const original = await screen.findByRole('img', { name: 'IMG_002.jpg' });
    const requests = mocks.image.mock.calls.length;
    const releases = vi.mocked(URL.revokeObjectURL).mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Ảnh đã chỉnh' }));
    expect(screen.getByRole('img', { name: 'edited.jpg' })).toBe(edited);
    expect(screen.getByRole('button', { name: 'Có góp ý (1)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ảnh gốc' }));
    expect(screen.getByRole('img', { name: 'IMG_002.jpg' })).toBe(original);
    expect(screen.getByRole('combobox', { name: 'Thư mục' })).toHaveValue('classroom');
    expect(mocks.image).toHaveBeenCalledTimes(requests);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(releases);

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(releases + 2);
  });
  it('only saves edited-photo feedback on the latest version', async () => {
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
    fireEvent.change(await screen.findByLabelText('Phiên bản ảnh đã chỉnh'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xem old.jpg' }));
    expect(screen.getByLabelText('Bạn muốn studio chỉnh gì?')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Lưu góp ý' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại album' }));
    fireEvent.change(screen.getByLabelText('Phiên bản ảnh đã chỉnh'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem new.jpg' }));
    fireEvent.change(screen.getByLabelText('Bạn muốn studio chỉnh gì?'), {
      target: { value: 'Giữ tông da tự nhiên' },
    });
    mocks.command.mockResolvedValue({
      ...value,
      version: 4,
      photos: value.photos.map((photo) =>
        photo.id === 'edit2' ? { ...photo, note: 'Giữ tông da tự nhiên' } : photo,
      ),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu góp ý' }));
    await screen.findByText('Đã lưu', { exact: true });
    expect(mocks.command).toHaveBeenCalledWith(
      'photo',
      { photoId: 'edit2', note: 'Giữ tông da tự nhiên', expectedVersion: 3 },
      'album-test-request-key',
    );
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
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    fireEvent.change(input, { target: { value: 'Bản bổ sung khi đang lưu' } });
    resolve({ ...fixture(), version: 4, photos: [{ ...fixture().photos[0], note: 'Bản đầu' }] });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).not.toBeDisabled(),
    );
    expect(input).toHaveValue('Bản bổ sung khi đang lưu');
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi ghi chú' }));
    expect(input).toHaveValue('Bản đầu');
  });
});

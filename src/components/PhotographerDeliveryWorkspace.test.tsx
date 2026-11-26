import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlbumPhoto, BookingAlbum } from '@/services/bookingAlbumService';
import type { BookingWorkflowDto } from '@/services/bookingWorkflowService';
import { PhotographerDeliveryWorkspace } from './PhotographerDeliveryWorkspace';

const mocked = vi.hoisted(() => ({
  get: vi.fn(),
  command: vi.fn(),
  image: vi.fn(),
  export: vi.fn(),
  job: vi.fn(),
  act: vi.fn(),
  upload: vi.fn(),
}));
vi.mock('../services/bookingAlbumService', () => ({
  albumClient: () => mocked,
  albumError: (error: Error) => error.message,
}));
vi.mock('../services/bookingWorkflowService', () => ({
  bookingWorkflowService: { act: mocked.act },
  createWorkflowRequestId: () => 'album-request-id',
}));
vi.mock('../services/bookingDeliveryService', () => ({
  bookingDeliveryService: { upload: mocked.upload },
  deliveryError: (error: Error) => error.message,
}));
vi.mock('../services/backgroundJobService', () => ({
  backgroundJobService: { latest: async () => null, get: mocked.job },
  isQueuedAlbum: (data: object) => 'backgroundOperation' in data,
}));
vi.mock('../components/customer/DeliveryPhotoGallery', () => ({
  DeliveryThumbnail: () => null,
  DeliveryPhotoGallery: () => <p>Ảnh tải lên</p>,
}));
vi.mock('../components/customer/DeliveryPhotoUpload', () => ({
  DeliveryPhotoUpload: ({ onChange }: { onChange: (ids: string[]) => void }) => (
    <button onClick={() => onChange(['local-photo'])}>Chọn ảnh đã chỉnh</button>
  ),
}));

const date = '2026-11-26T07:20:00Z';
const sourceUrl = 'https://drive.google.com/drive/folders/yearbook-12a1';
const original: AlbumPhoto = {
  id: 'original',
  source: 'drive',
  name: 'DSC_0418.jpg',
  driveId: 'drive-original',
  width: 1200,
  height: 800,
  folderId: 'folder',
  deliveryVersion: 0,
  available: true,
  selected: false,
  note: '',
};
const edited: AlbumPhoto = {
  ...original,
  id: 'edited',
  name: 'DSC_0418_final.jpg',
  deliveryVersion: -1,
};
const draft: BookingAlbum = {
  publicId: 'public-album',
  title: 'Ảnh kỉ yếu',
  status: 'draft',
  version: 1,
  limit: 30,
  canSelect: false,
  canCommentDelivery: false,
  coverId: original.driveId,
  photos: [original],
  folders: [{ id: 'folder', name: 'Ảnh chọn', url: sourceUrl }],
  latestDeliveryVersion: 0,
  deliveryVersions: [],
  workflowVersion: 7,
};
const record = (): BookingWorkflowDto => ({
  booking: {
    _id: 'booking',
    status: 'approved',
    packageName: 'Kỉ yếu',
    className: '12A1',
    members: 30,
    startAt: date,
    endAt: date,
    location: 'Sân trường',
  },
  workflow: {
    bookingId: 'booking',
    version: 7,
    lifecycle: 'editing',
    quote: null,
    payments: null,
    resources: null,
    allowedCostumes: [],
    members: [],
    progress: { status: 'editing', deliveryVersion: 0, revisionRequests: [] },
    changeRequest: null,
    feedback: null,
    quoteHistory: [],
    deliveryHistory: [],
    paymentInstructions: null,
    paymentReady: false,
    events: [],
    memberEntry: null,
  },
});
function sent() {
  const next = record();
  next.workflow.version = 8;
  next.workflow.lifecycle = 'delivered';
  next.workflow.progress = {
    status: 'delivered',
    deliveryVersion: 1,
    revisionRequests: [],
    deliveredAt: date,
    photos: [{ id: 'drive-edited', name: edited.name, source: 'drive', width: 1200, height: 800 }],
  };
  return next;
}
function open(initial = record(), requestedVersion = 0) {
  function TestWorkspace() {
    const [value, setValue] = useState(initial);
    const [reloadCount, setReloadCount] = useState(0);
    return (
      <>
        <button type="button" onClick={() => setReloadCount((count) => count + 1)}>
          Tải lại hồ sơ
        </button>
        <PhotographerDeliveryWorkspace
          record={value}
          requestedTab={null}
          requestedVersion={requestedVersion}
          reloadCount={reloadCount}
          onWorkflowChange={setValue}
        />
      </>
    );
  }
  return render(<TestWorkspace />);
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('Photographer yearbook delivery steps', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocked.get.mockResolvedValue(null);
    mocked.image.mockResolvedValue(new Blob(['image'], { type: 'image/jpeg' }));
    URL.createObjectURL = vi.fn(() => 'blob:test-image');
    URL.revokeObjectURL = vi.fn();
  });

  it('waits for Drive sync and uses actual album and workflow versions to deliver a previewed draft', async () => {
    const queued = { id: 'sync-job', orderId: 'booking', service: 'yearbook', status: 'pending' };
    const published = { ...draft, version: 2, status: 'open' };
    const closed = {
      ...published,
      status: 'closed',
      version: 4,
      shared: true,
      finalizedAt: date,
      photos: [{ ...original, selected: true, note: 'Giữ màu tự nhiên.' }],
    };
    const preview = { ...closed, version: 5, photos: [...closed.photos, edited] };
    mocked.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(closed)
      .mockResolvedValueOnce({
        ...closed,
        version: 6,
        latestDeliveryVersion: 1,
        deliveryVersions: [1],
        workflowVersion: 8,
        photos: [...closed.photos, { ...edited, deliveryVersion: 1 }],
      });
    mocked.command
      .mockResolvedValueOnce({ backgroundOperation: queued })
      .mockResolvedValueOnce(published)
      .mockResolvedValueOnce(preview);
    mocked.job.mockResolvedValue({ ...queued, status: 'succeeded' });
    mocked.export.mockResolvedValue({ text: original.name });
    mocked.act.mockResolvedValue(sent());

    open();
    const source = await screen.findByLabelText('Thư mục Google Drive');
    fireEvent.change(source, { target: { value: sourceUrl } });
    fireEvent.change(screen.getByLabelText('Giới hạn yêu cầu chỉnh sửa'), {
      target: { value: '30' },
    });
    click('Lưu và lấy ảnh');
    expect(await screen.findByText(/Đang chờ đồng bộ ảnh/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Xuất bản album' })).toBeNull();
    expect(source).toHaveValue(sourceUrl);
    expect(await screen.findByRole('heading', { name: 'Kiểm tra và mở album' })).toBeVisible();
    click('Xuất bản album');
    expect(await screen.findByRole('heading', { name: 'Yêu cầu chỉnh ảnh' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Link cho khách' })).not.toBeInTheDocument();
    expect(screen.queryByText('Quản lý chia sẻ và yêu cầu')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tải lại album' })).not.toBeInTheDocument();
    click('Tải lại hồ sơ');
    expect(await screen.findByText('Khách đã gửi yêu cầu')).toBeVisible();
    expect(screen.getByText('Giữ màu tự nhiên.')).toBeVisible();
    click('Lấy tên file cần chỉnh');
    expect(await screen.findByLabelText('Tên file cần chỉnh')).toHaveValue(original.name);

    click('Ảnh đã chỉnh');
    fireEvent.change(screen.getByLabelText('Thư mục Google Drive'), {
      target: { value: sourceUrl + '-v1' },
    });
    click('Lấy ảnh đã chỉnh');
    expect(await screen.findByRole('heading', { name: 'Xem trước bản bàn giao' })).toBeVisible();
    expect(screen.getByText(edited.name)).toBeVisible();
    expect(mocked.act).not.toHaveBeenCalled();
    click('Gửi bản bàn giao mới');
    expect(await screen.findByText('Chờ khách nghiệm thu')).toBeVisible();
    expect(mocked.act).toHaveBeenCalledTimes(1);
    expect(mocked.act).toHaveBeenCalledWith(
      'booking',
      7,
      'progress.update',
      {
        status: 'delivered',
        driveAlbum: true,
        albumVersion: 5,
      },
      'album-request-id',
    );
    expect(screen.queryByRole('button', { name: 'Xác nhận ảnh đã đạt yêu cầu' })).toBeNull();
    click('Xem bản đã gửi');
    expect(screen.getByRole('button', { name: 'Thu gọn ảnh' })).toBeVisible();
  });

  it('shows the current revision and returns to editing without marking it as accepted', async () => {
    const needsRevision = sent();
    needsRevision.workflow.lifecycle = 'revision_requested';
    needsRevision.workflow.progress!.revisionRequests = [
      { _id: 'revision-1', note: 'Làm sáng ảnh tập thể.', at: date, deliveryVersion: 1 },
    ];
    const restarted = structuredClone(needsRevision);
    restarted.workflow.version++;
    restarted.workflow.lifecycle = 'editing';
    restarted.workflow.progress!.status = 'editing';
    mocked.get.mockResolvedValue({ ...draft, status: 'closed' });
    mocked.act.mockResolvedValue(restarted);
    open(needsRevision);
    expect(await screen.findByText('Làm sáng ảnh tập thể.')).toBeVisible();
    click('Chuyển sang hậu kỳ');
    expect(await screen.findByText('Bản 2 · Bản nháp')).toBeVisible();
    expect(mocked.act).toHaveBeenCalledWith(
      'booking',
      8,
      'progress.update',
      { status: 'editing' },
      'album-request-id',
    );
  });

  it('opens a historical delivery read only and keeps the legacy album link', async () => {
    const delivered = sent();
    delivered.workflow.progress!.deliveryVersion = 2;
    delivered.workflow.deliveryHistory = [
      {
        version: 1,
        deliveredAt: date,
        deliveryUrl: 'https://drive.google.com/legacy-v1',
      },
    ];
    open(delivered, 1);
    expect(await screen.findByText('Bạn đang xem bản cũ · chỉ xem.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Mở album bàn giao cũ' })).toHaveAttribute(
      'href',
      'https://drive.google.com/legacy-v1',
    );
    expect(screen.queryByRole('button', { name: 'Chuyển sang hậu kỳ' })).toBeNull();
  });

  it('restores existing album state after a failed initial load', async () => {
    mocked.get
      .mockRejectedValueOnce(new Error('Mạng tạm thời gián đoạn'))
      .mockResolvedValueOnce(draft);
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Mạng tạm thời gián đoạn');
    expect(screen.queryByRole('button', { name: 'Lưu và lấy ảnh' })).toBeNull();
    click('Tải lại album');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Xuất bản album' })).toBeEnabled(),
    );
  });

  it('can send directly uploaded photos without an existing Drive album', async () => {
    const delivered = sent();
    delivered.workflow.progress!.photos = [
      {
        id: 'local-photo',
        name: 'anh-da-chinh.jpg',
        width: 1200,
        height: 800,
      },
    ];
    mocked.act.mockResolvedValue(delivered);
    open();
    await screen.findByRole('heading', { name: 'Chuẩn bị album ảnh gốc' });
    click('Ảnh đã chỉnh');
    fireEvent.click(screen.getByText('Tải ảnh trực tiếp', { exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Chọn ảnh đã chỉnh' }));
    click('Gửi ảnh tải lên');
    expect(await screen.findByText('Chờ khách nghiệm thu')).toBeVisible();
    expect(mocked.act).toHaveBeenCalledWith(
      'booking',
      7,
      'progress.update',
      { status: 'delivered', deliveryPhotoIds: ['local-photo'] },
      'album-request-id',
    );
  });

  it('uploads from the specific request and publishes its linked draft after preview', async () => {
    const requested = { ...original, selected: true, note: 'Giữ màu da tự nhiên.' };
    const album: BookingAlbum = {
      ...draft,
      status: 'closed',
      finalizedAt: date,
      photos: [requested],
    };
    const replacement = {
      id: 'photo-edit',
      source: 'local' as const,
      originalPhotoId: requested.id,
      name: 'file-moi.png',
      width: 800,
      height: 1200,
      available: true,
      deliveryVersion: -1,
    };
    mocked.get
      .mockResolvedValueOnce(album)
      .mockResolvedValueOnce({ ...album, replacements: [replacement] })
      .mockResolvedValueOnce({
        ...album,
        latestDeliveryVersion: 1,
        replacements: [{ ...replacement, deliveryVersion: 1 }],
      });
    mocked.upload.mockResolvedValue(replacement);
    mocked.act.mockResolvedValue(sent());
    open();

    await screen.findByText(requested.note);
    click('Tải bản chỉnh cho ' + requested.name);
    const file = new File(['fixture'], replacement.name, { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Tệp ảnh đã chỉnh'), { target: { files: [file] } });
    click('Lưu bản chỉnh');
    expect(await screen.findByText('Đã tải bản nháp')).toBeVisible();
    expect(mocked.upload).toHaveBeenCalledWith(
      'booking',
      file,
      'album-request-id',
      expect.any(AbortSignal),
      requested.id,
    );
    expect(mocked.act).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Xem bản chỉnh trước khi gửi' })).toBeEnabled(),
    );
    click('Xem bản chỉnh trước khi gửi');
    expect(screen.getByText(replacement.name, { exact: false, selector: 'p' })).toBeVisible();
    expect(screen.getByText(requested.name, { exact: false, selector: 'p' })).toBeVisible();
    click('Gửi bản bàn giao mới');
    expect(await screen.findByText('Chờ khách nghiệm thu')).toBeVisible();
    expect(mocked.act).toHaveBeenCalledWith(
      'booking',
      7,
      'progress.update',
      {
        status: 'delivered',
        deliveryPhotoIds: [replacement.id],
      },
      'album-request-id',
    );
  });
});

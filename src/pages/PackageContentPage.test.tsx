import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PackageContentPage from './PackageContentPage';

const mocks = vi.hoisted(() => ({ getOne: vi.fn(), saveContent: vi.fn() }));
vi.mock('../services/packageService', () => ({
  packageService: mocks,
  packageImageUrl: (id: string) => `/api/media/packages/${id}`,
}));
const pkg = { _id: 'package-1', name: 'Gói thử', pricePerMember: 500000, detailsVersion: 0 };
function open() {
  return render(
    <MemoryRouter initialEntries={['/settings/packages/package-1/content']}>
      <Routes>
        <Route path="/settings/packages/:id/content" element={<PackageContentPage />} />
        <Route path="/settings/packages" element={<h1>Danh sách gói</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
async function ready() {
  await screen.findByLabelText('Đối tượng phù hợp');
}

describe('Package content editing', () => {
  beforeEach(() => {
    mocks.getOne.mockReset();
    mocks.saveContent.mockReset();
    mocks.getOne.mockResolvedValue(pkg);
    mocks.saveContent.mockImplementation(async (_id: string, body: FormData) => {
      const { details } = JSON.parse(body.get('content') as string);
      return { ...pkg, detailsVersion: 1, details: { ...details, gallery: [] } };
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:demo'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });
  afterEach(() => vi.restoreAllMocks());

  it('saves structured content, trims empty benefit lines and keeps the version', async () => {
    open();
    await ready();
    fireEvent.change(screen.getByLabelText('Đối tượng phù hợp'), {
      target: { value: 'Lớp cuối cấp' },
    });
    fireEvent.change(screen.getByLabelText('Quyền lợi bổ sung (mỗi dòng một quyền lợi)'), {
      target: { value: ' Album lớp \n\nẢnh cá nhân\n' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mục vào lịch trình buổi chụp mẫu' }));
    fireEvent.change(screen.getByLabelText(/Mốc thời gian 1/), { target: { value: '08:00' } });
    fireEvent.change(screen.getByLabelText(/Hoạt động 1/), { target: { value: 'Tập trung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    await screen.findByText('Đã lưu. Nội dung mới đã hiển thị trên trang khách hàng.');
    const body = mocks.saveContent.mock.calls[0][1] as FormData;
    const sent = JSON.parse(body.get('content') as string);
    expect(sent.version).toBe(0);
    expect(sent.details.audience).toBe('Lớp cuối cấp');
    expect(sent.details.benefits).toEqual(['Album lớp', 'Ảnh cá nhân']);
    expect(sent.details.itinerary).toEqual([
      { time: '08:00', title: 'Tập trung', description: '' },
    ]);
    expect(screen.getByRole('button', { name: 'Lưu nội dung' })).toBeDisabled();
  });

  it('keeps changes after a conflict and can retry saving', async () => {
    mocks.saveContent.mockRejectedValueOnce({
      response: { status: 409, data: { message: 'Nội dung đã thay đổi. Hãy tải lại.' } },
    });
    open();
    await ready();
    fireEvent.change(screen.getByLabelText('Đối tượng phù hợp'), {
      target: { value: 'Nội dung đang sửa' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Đối tượng phù hợp')).toHaveValue('Nội dung đang sửa');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    await screen.findByText('Đã lưu. Nội dung mới đã hiển thị trên trang khách hàng.');
    expect(mocks.saveContent).toHaveBeenCalledTimes(2);
  });

  it('uploads files only on save, supports captions and rejects oversized images', async () => {
    open();
    await ready();
    const file = new File(['test-image'], 'lop.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Chọn ảnh từ máy'), { target: { files: [file] } });
    expect(mocks.saveContent).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Mô tả ảnh 1/)).toHaveValue('lop');
    fireEvent.change(screen.getByLabelText('Chú thích ảnh 1'), {
      target: { value: 'Ngày kỷ yếu' },
    });
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    });
    fireEvent.change(screen.getByLabelText('Chọn ảnh từ máy'), { target: { files: [oversized] } });
    await screen.findByRole('alert');
    expect(screen.queryByLabelText(/Mô tả ảnh 2/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    await waitFor(() => expect(mocks.saveContent).toHaveBeenCalledOnce());
    const body = mocks.saveContent.mock.calls[0][1] as FormData;
    expect(body.getAll('images')).toHaveLength(1);
    expect(JSON.parse(body.get('content') as string).details.gallery).toEqual([
      { uploadIndex: 0, alt: 'lop', caption: 'Ngày kỷ yếu' },
    ]);
  });

  it('confirms leaving with unsaved edits and stays if the user declines', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    open();
    await ready();
    fireEvent.change(screen.getByLabelText('Đối tượng phù hợp'), { target: { value: 'Chưa lưu' } });
    fireEvent.click(screen.getByRole('link', { name: 'Về danh sách gói' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Đối tượng phù hợp')).toHaveValue('Chưa lưu');
  });

  it('orders and deletes itinerary rows without losing their values', async () => {
    open();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mục vào lịch trình buổi chụp mẫu' }));
    fireEvent.change(screen.getByLabelText(/Hoạt động 1/), { target: { value: 'Đầu tiên' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mục vào lịch trình buổi chụp mẫu' }));
    fireEvent.change(screen.getByLabelText(/Hoạt động 2/), { target: { value: 'Thứ hai' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Đưa mục 2 lên trong Lịch trình buổi chụp mẫu' }),
    );
    expect(screen.getByLabelText(/Hoạt động 1/)).toHaveValue('Thứ hai');
    fireEvent.click(
      screen.getByRole('button', { name: 'Xóa mục 1 trong Lịch trình buổi chụp mẫu' }),
    );
    expect(screen.getByLabelText(/Hoạt động 1/)).toHaveValue('Đầu tiên');
  });
});

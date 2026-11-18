import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConceptManagePage from './ConceptManagePage';
import { Concept, ManagedCatalog, conceptService } from '../services/conceptService';

vi.mock('../services/conceptService', async (original) => ({
  ...(await original<typeof import('../services/conceptService')>()),
  conceptService: { manage: vi.fn(), save: vi.fn() },
}));
const initial: Concept[] = [
  {
    _id: 'portrait',
    name: 'Chân dung cá nhân',
    description: 'Mô tả thật',
    coverUrl: '/portrait.webp',
    active: true,
    story: 'Câu chuyện cũ',
    preparation: 'Chuẩn bị cũ',
    gallery: [{ url: '/one.webp', caption: 'Ảnh gốc' }],
  },
  {
    _id: 'aodai',
    name: 'Áo dài',
    description: 'Áo dài truyền thống',
    coverUrl: '/aodai.webp',
    active: false,
  },
];
let records: Concept[];
const catalog = () => ({ concepts: structuredClone(records) }) as ManagedCatalog;
const tab = (name: string) =>
  fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false });
const open = async () => {
  render(<ConceptManagePage />);
  await screen.findByLabelText(/Tên concept/);
};
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

beforeEach(() => {
  vi.resetAllMocks();
  records = structuredClone(initial);
  vi.mocked(conceptService.manage).mockImplementation(async () => catalog());
  vi.mocked(conceptService.save).mockImplementation(async (_kind, body) => {
    const value = body as Concept & { id?: string };
    const saved = { ...value, _id: value.id || 'new-concept' };
    records = value.id
      ? records.map((item) => (item._id === value.id ? saved : item))
      : [...records, saved];
    return {} as never;
  });
});

describe('concept-only admin editor', () => {
  it('loads real concept content, searches the list and omits unrelated management', async () => {
    await open();
    expect(screen.getByLabelText(/Tên concept/)).toHaveValue('Chân dung cá nhân');
    expect(screen.getByRole('link', { name: 'Xem trang khách' })).toHaveAttribute(
      'href',
      '/concept-booking?concept=portrait',
    );
    expect(screen.getAllByRole('tab').map((item) => item.textContent)).toEqual([
      'Thông tin chung',
      'Nội dung giới thiệu',
      'Ảnh tham khảo',
      'Hướng dẫn chuẩn bị',
    ]);
    expect(screen.queryByText('Hồ sơ thợ')).not.toBeInTheDocument();
    expect(screen.queryByText('Gói chụp')).not.toBeInTheDocument();
    expect(screen.queryByText('Giờ Studio')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ÁO' } });
    const list = within(screen.getByRole('complementary', { name: 'Danh sách concept' }));
    expect(list.queryByRole('button', { name: /Chân dung/ })).not.toBeInTheDocument();
    expect(list.getByRole('button', { name: /Áo dài/ })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'không có' } });
    expect(screen.getByText('Không tìm thấy concept phù hợp.')).toBeInTheDocument();
  });

  it('preserves edits across tabs and saves the full concept, including visibility', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('Mô tả ngắn'), { target: { value: 'Mô tả mới' } });
    tab('Nội dung giới thiệu');
    fireEvent.change(screen.getByLabelText('Câu chuyện và phong cách'), {
      target: { value: 'Câu chuyện mới' },
    });
    tab('Hướng dẫn chuẩn bị');
    expect(screen.getByLabelText('Chuẩn bị trước buổi chụp')).toHaveValue('Chuẩn bị cũ');
    tab('Thông tin chung');
    expect(screen.getByLabelText('Mô tả ngắn')).toHaveValue('Mô tả mới');
    fireEvent.click(screen.getByRole('switch', { name: 'Hiển thị concept' }));
    save();
    await screen.findByText('Đã lưu concept.');
    expect(conceptService.save).toHaveBeenCalledWith(
      'concept',
      expect.objectContaining({
        id: 'portrait',
        active: false,
        description: 'Mô tả mới',
        story: 'Câu chuyện mới',
        preparation: 'Chuẩn bị cũ',
        gallery: initial[0].gallery,
      }),
      expect.any(String),
    );
    expect(screen.queryByRole('link', { name: 'Xem trang khách' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
  });

  it('keeps unsaved content until discard is explicitly chosen', async () => {
    await open();
    fireEvent.change(screen.getByLabelText(/Tên concept/), { target: { value: 'Tên chưa lưu' } });
    fireEvent.click(screen.getByRole('button', { name: /Áo dài.*Đang ẩn/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }));
    expect(screen.getByLabelText(/Tên concept/)).toHaveValue('Tên chưa lưu');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy thay đổi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }));
    expect(screen.getByLabelText(/Tên concept/)).toHaveValue(initial[0].name);
    expect(conceptService.save).not.toHaveBeenCalled();
  });

  it('creates a concept and selects its saved record without duplicating a busy submission', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm concept' }));
    fireEvent.change(screen.getByLabelText(/Tên concept/), { target: { value: 'Concept mới' } });
    const submit = screen.getByRole('button', { name: 'Lưu thay đổi' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await screen.findByText('Đã lưu concept.');
    expect(conceptService.save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Concept mới' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Concept mới.*Đang mở/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('retains edits and reuses the idempotency key after an uncertain save', async () => {
    await open();
    vi.mocked(conceptService.save).mockRejectedValueOnce(new Error('network'));
    fireEvent.change(screen.getByLabelText('Mô tả ngắn'), {
      target: { value: 'Giữ nội dung này' },
    });
    save();
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Mô tả ngắn')).toHaveValue('Giữ nội dung này');
    save();
    await screen.findByText('Đã lưu concept.');
    expect(vi.mocked(conceptService.save).mock.calls[1][2]).toBe(
      vi.mocked(conceptService.save).mock.calls[0][2],
    );
  });

  it('also preserves the creation retry key if saving succeeds but refreshing fails', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm concept' }));
    fireEvent.change(screen.getByLabelText(/Tên concept/), { target: { value: 'Tạo an toàn' } });
    vi.mocked(conceptService.manage).mockRejectedValueOnce(new Error('refresh'));
    vi.mocked(conceptService.save).mockResolvedValue({} as never);
    save();
    await screen.findByRole('alert');
    save();
    await screen.findByText('Đã lưu concept.');
    expect(vi.mocked(conceptService.save).mock.calls[1][2]).toBe(
      vi.mocked(conceptService.save).mock.calls[0][2],
    );
  });

  it('validates incomplete gallery entries even when saving from a different tab', async () => {
    await open();
    tab('Ảnh tham khảo');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm ảnh' }));
    tab('Thông tin chung');
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập đường dẫn');
    expect(screen.getByRole('tab', { name: 'Ảnh tham khảo' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(conceptService.save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Đường dẫn ảnh 2'), { target: { value: '/two.webp' } });
    fireEvent.change(screen.getByLabelText('Chú thích ảnh 2'), { target: { value: 'Ảnh mới' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xóa ảnh 1' }));
    save();
    await screen.findByText('Đã lưu concept.');
    expect(conceptService.save).toHaveBeenCalledWith(
      'concept',
      expect.objectContaining({
        gallery: [{ url: '/two.webp', caption: 'Ảnh mới' }],
      }),
      expect.any(String),
    );
  });

  it('opens cover URL editing and never links a hidden concept to a public preview', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: /Áo dài.*Đang ẩn/ }));
    expect(screen.queryByRole('link', { name: 'Xem trang khách' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thay ảnh' }));
    fireEvent.change(screen.getByLabelText(/Đường dẫn ảnh bìa/), {
      target: { value: '/new-cover.webp' },
    });
    save();
    await screen.findByText('Đã lưu concept.');
    expect(conceptService.save).toHaveBeenCalledWith(
      'concept',
      expect.objectContaining({
        id: 'aodai',
        coverUrl: '/new-cover.webp',
        active: false,
      }),
      expect.any(String),
    );
  });

  it('handles an empty catalog and validates names from any editor tab', async () => {
    records = [];
    await open();
    expect(screen.getByText(/Chưa có concept/)).toBeInTheDocument();
    tab('Hướng dẫn chuẩn bị');
    save();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập tên concept.'),
    );
    expect(screen.getByRole('tab', { name: 'Thông tin chung' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(conceptService.save).not.toHaveBeenCalled();
  });
});

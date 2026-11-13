import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhotographerPortfolioPage from './PhotographerPortfolioPage';
import {
  photographerPortfolioService,
  type PersonalPortfolio,
} from '../services/photographerPortfolioService';
vi.mock('../components/Layout/PublicSiteLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('../services/photographerPortfolioService', async (original) => ({
  ...(await original<typeof import('../services/photographerPortfolioService')>()),
  photographerPortfolioService: { get: vi.fn(), save: vi.fn() },
}));
const initial: PersonalPortfolio = {
  photographer: 'photo-a',
  name: 'Thợ A',
  revision: 0,
  published: true,
  hasDraft: false,
  concepts: [{ _id: 'concept-a', name: 'Chân dung', active: true }],
  content: {
    bio: 'Lời giới thiệu',
    title: 'Nhiếp ảnh gia concept',
    tagline: 'Dấu ấn của tôi',
    portraitUrl: '/portrait.webp',
    coverUrl: '/cover.webp',
    portfolio: [
      { concept: 'concept-a', url: '/work-1.webp', caption: 'Ảnh đầu', permitted: true },
      { concept: 'concept-a', url: '/work-2.webp', caption: 'Ảnh sau', permitted: false },
    ],
  },
};
const open = () =>
  render(
    <MemoryRouter initialEntries={['/my-portfolio']}>
      <PhotographerPortfolioPage />
    </MemoryRouter>,
  );
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(photographerPortfolioService.get).mockResolvedValue(structuredClone(initial));
  vi.mocked(photographerPortfolioService.save).mockImplementation(
    async (state, content, _files, published) => ({
      ...state,
      content,
      revision: state.revision + 1,
      hasDraft: !published,
      published: published || state.published,
    }),
  );
});
describe('personal portfolio editing', () => {
  it('loads the existing profile and renders edits with the same public renderer', async () => {
    open();
    const input = await screen.findByLabelText('Câu định vị riêng');
    expect(input).toHaveValue(initial.content.tagline);
    fireEvent.change(input, { target: { value: 'Một dấu ấn mới' } });
    expect(screen.getByRole('heading', { name: 'Một dấu ấn mới' })).toBeInTheDocument();
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    await screen.findByText('Đã lưu nháp. Website vẫn giữ bản đã công khai.');
    expect(photographerPortfolioService.save).toHaveBeenCalledWith(
      expect.objectContaining({ photographer: 'photo-a', revision: 0 }),
      expect.objectContaining({ tagline: 'Một dấu ấn mới' }),
      {},
      false,
    );
    expect(screen.getByText('Có thay đổi chưa công khai')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Công khai' }));
    await screen.findByText('Đã công khai. Portfolio trên website đã được cập nhật.');
    expect(photographerPortfolioService.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ revision: 1 }),
      expect.objectContaining({ tagline: 'Một dấu ấn mới' }),
      {},
      true,
    );
  });
  it('previews unsaved content on a full page and returns without losing edits', async () => {
    open();
    const input = await screen.findByLabelText('Câu định vị riêng');
    fireEvent.change(input, { target: { value: 'Nháp chưa lưu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }));
    expect(screen.getByRole('heading', { name: 'Nháp chưa lưu' })).toBeInTheDocument();
    expect(
      screen.getByText('Xem trước bản nháp · Chỉ bạn nhìn thấy nội dung này'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại chỉnh sửa' }));
    expect(screen.getByLabelText('Câu định vị riêng')).toHaveValue('Nháp chưa lưu');
    expect(photographerPortfolioService.save).not.toHaveBeenCalled();
  });
  it('only previews permitted photos; supports caption, consent, ordering and removal', async () => {
    open();
    await screen.findByLabelText('Câu định vị riêng');
    const preview = screen.getByRole('complementary', { name: 'Xem trước trang công khai' });
    expect(within(preview).queryByAltText('Ảnh sau')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Ảnh concept' }));
    fireEvent.change(screen.getByLabelText('Chú thích ảnh 2'), {
      target: { value: 'Khung hình thứ hai' },
    });
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Được phép công khai' })[1]);
    expect(within(preview).getByAltText('Khung hình thứ hai')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đưa ảnh 2 lên' }));
    expect(screen.getByLabelText('Chú thích ảnh 1')).toHaveValue('Khung hình thứ hai');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa ảnh 2' }));
    expect(screen.queryByLabelText('Chú thích ảnh 2')).not.toBeInTheDocument();
  });
  it('shows a version conflict and retains local input until the user reloads', async () => {
    vi.mocked(photographerPortfolioService.save).mockRejectedValue({
      response: { status: 409, data: { message: 'Hồ sơ đã thay đổi.' } },
    });
    open();
    fireEvent.change(await screen.findByLabelText('Giới thiệu ngắn'), {
      target: { value: 'Nháp cần giữ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    await screen.findByText('Hồ sơ đã thay đổi.');
    expect(screen.getByLabelText('Giới thiệu ngắn')).toHaveValue('Nháp cần giữ');
    expect(screen.getByRole('button', { name: 'Công khai' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tải lại hồ sơ' })).toBeEnabled();
  });
  it('keeps failed publication editable and reports file limits before submitting', async () => {
    vi.mocked(photographerPortfolioService.save).mockRejectedValue(new Error('Mất kết nối'));
    const { container } = open();
    await screen.findByLabelText('Giới thiệu ngắn');
    fireEvent.click(screen.getByRole('button', { name: 'Công khai' }));
    await screen.findByText('Mất kết nối');
    const input = container.querySelector('input[type=file]')!;
    fireEvent.change(input, {
      target: { files: [new File(['no'], 'invalid.svg', { type: 'image/svg+xml' })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Chỉ nhận JPG, PNG, WebP');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Công khai' })).toBeEnabled());
  });
});

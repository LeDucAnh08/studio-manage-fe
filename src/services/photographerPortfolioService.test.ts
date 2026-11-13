import { beforeEach, expect, it, vi } from 'vitest';
import api from './api';
import {
  photographerPortfolioService,
  type PersonalPortfolio,
} from './photographerPortfolioService';

vi.mock('./api', () => ({ default: { request: vi.fn() } }));
const state: PersonalPortfolio = {
  photographer: 'owner-a',
  name: 'Thợ A',
  revision: 4,
  published: true,
  hasDraft: false,
  concepts: [{ _id: 'concept-a', name: 'Chân dung', active: true }],
  content: {
    bio: 'Giới thiệu',
    portraitUrl: 'blob:portrait',
    coverUrl: 'blob:portrait',
    portfolio: [
      { concept: 'concept-a', url: 'blob:work', caption: 'Mới', permitted: true },
      { concept: 'concept-a', url: '/images/concepts/old.webp', caption: 'Cũ', permitted: true },
    ],
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.request).mockResolvedValue({ data: { data: state } });
});
it('submits a versioned public snapshot and only referenced files, preserving order and existing URLs', async () => {
  const files = {
    'blob:portrait': new File(['portrait'], 'portrait.jpg', { type: 'image/jpeg' }),
    'blob:work': new File(['work'], 'work.webp', { type: 'image/webp' }),
    'blob:removed': new File(['removed'], 'removed.jpg', { type: 'image/jpeg' }),
  };
  await photographerPortfolioService.save(state, state.content, files, true);
  const config = vi.mocked(api.request).mock.calls[0][0]!;
  expect(config.url).toBe('/photographers/me/portfolio/publish');
  expect(config.method).toBe('POST');
  const form = config.data as FormData;
  const body = JSON.parse(form.get('content') as string);
  expect(body.revision).toBe(4);
  expect(body.photographer).toBeUndefined();
  expect(body.content.portraitUrl).toBe('upload:0');
  expect(body.content.coverUrl).toBe('upload:0');
  expect(body.content.portfolio.map((p: { url: string }) => p.url)).toEqual([
    'upload:1',
    '/images/concepts/old.webp',
  ]);
  expect(form.getAll('images').map((f) => (f as File).name)).toEqual(['portrait.jpg', 'work.webp']);
});
it('rejects more than ten new files before making a network request', async () => {
  const portfolio = Array.from({ length: 11 }, (_, i) => ({
    concept: 'concept-a',
    url: `blob:${i}`,
    caption: '',
    permitted: false,
  }));
  const files = Object.fromEntries(
    portfolio.map((p) => [p.url, new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })]),
  );
  await expect(
    photographerPortfolioService.save(
      state,
      { ...state.content, portraitUrl: '', coverUrl: '', portfolio },
      files,
      false,
    ),
  ).rejects.toThrow('Tối đa 10 ảnh');
  expect(api.request).not.toHaveBeenCalled();
});

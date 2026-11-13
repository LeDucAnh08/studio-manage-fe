import api from './api';
import type { PhotographerContent, PublicPhotographer } from './conceptService';

export interface PortfolioContent extends PhotographerContent {
  bio: string;
  portraitUrl: string;
  coverUrl: string;
  portfolio: { concept: string; url: string; caption: string; permitted: boolean }[];
}
export interface PersonalPortfolio {
  photographer: string;
  name: string;
  concepts: { _id: string; name: string; active: boolean }[];
  content: PortfolioContent;
  revision: number;
  published: boolean;
  hasDraft: boolean;
}
export function previewPortfolio(
  state: PersonalPortfolio,
  content = state.content,
): PublicPhotographer {
  const concepts = state.concepts.filter((c) => c.active);
  return {
    ...content,
    _id: state.photographer,
    name: state.name,
    concepts,
    portfolio: content.portfolio.filter(
      (p) => p.permitted && concepts.some((c) => c._id === p.concept),
    ),
  };
}
export const photographerPortfolioService = {
  get: (signal?: AbortSignal) =>
    api
      .get<{ data: PersonalPortfolio }>('/photographers/me/portfolio', { signal })
      .then((r) => r.data.data),
  save: async (
    state: PersonalPortfolio,
    content: PortfolioContent,
    files: Record<string, File>,
    publish: boolean,
  ) => {
    const data = new FormData();
    const used = [
      ...new Set(
        [content.portraitUrl, content.coverUrl, ...content.portfolio.map((p) => p.url)].filter(
          (url) => files[url],
        ),
      ),
    ];
    if (used.length > 10)
      throw new Error('Tối đa 10 ảnh mới mỗi lần lưu. Hãy lưu nháp trước khi thêm tiếp.');
    const resolve = (url: string) => (used.includes(url) ? `upload:${used.indexOf(url)}` : url);
    data.append(
      'content',
      JSON.stringify({
        revision: state.revision,
        content: {
          ...content,
          portraitUrl: resolve(content.portraitUrl),
          coverUrl: resolve(content.coverUrl),
          portfolio: content.portfolio.map((p) => ({ ...p, url: resolve(p.url) })),
        },
      }),
    );
    used.forEach((url) => data.append('images', files[url]));
    return api
      .request<{
        data: PersonalPortfolio;
      }>({ url: `/photographers/me/portfolio${publish ? '/publish' : ''}`, method: publish ? 'POST' : 'PUT', data })
      .then((r) => r.data.data);
  },
};

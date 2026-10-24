import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { costumeService } from '../services/costumeService';
import type { RentalCatalogItem } from '../types';
import RentalCatalogPage from './RentalCatalogPage';

const flags = vi.hoisted(() => ({ rental: true }));

vi.mock('../components/Layout/PublicSiteLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock('../config/features', () => ({
  get clientRentalEnabled() {
    return flags.rental;
  },
}));

vi.mock('../services/costumeService', () => ({
  costumeService: {
    getPublicCatalog: vi.fn(),
    getPublicCatalogCategories: vi.fn(),
  },
}));

const receiveDate = '2098-04-10';
const returnDate = '2098-04-12';
const periodQuery = `receiveDate=${receiveDate}&returnDate=${returnDate}`;
const item: RentalCatalogItem = {
  _id: 'outfit-1',
  name: 'Áo dài xanh',
  gender: 'female',
  itemKind: 'clothing',
  rentalPrice: 999_000,
  rentalDailyPrice: 120_000,
  sizes: ['S', 'M'],
  availableBySize: { S: 0, M: 3 },
  rentalDays: 3,
};
const groupedItems: RentalCatalogItem[] = [
  { ...item, categoryId: 'type-1', category: 'Áo dài' },
  {
    ...item,
    _id: 'outfit-2',
    name: 'Áo dài trắng',
    categoryId: 'type-2',
    category: '  ÁＯ   ＤÀＩ  ',
  },
  {
    ...item,
    _id: 'outfit-3',
    name: 'Áo dài hồng',
    categoryId: 'type-1',
    category: 'áo dài',
  },
  { ...item, _id: 'outfit-4', name: 'Áo trơn', category: null },
  { ...item, _id: 'outfit-5', name: 'Áo khoác', category: '   ' },
  {
    ...item,
    _id: 'accessory-1',
    name: 'Khăn áo dài',
    itemKind: 'accessory',
    categoryId: 'type-1',
    category: 'Áo dài',
  },
  { ...item, _id: 'accessory-2', name: 'Nơ cài áo', itemKind: 'accessory', category: null },
];

function Location() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderCatalog(query = '') {
  return render(
    <MemoryRouter initialEntries={[`/costumes${query ? `?${query}` : ''}`]}>
      <Location />
      <Routes>
        <Route path="/costumes" element={<RentalCatalogPage />} />
        <Route path="/rental/start" element={<p>Yêu cầu thuê</p>} />
        <Route path="/booking/start" element={<p>Yêu cầu chụp</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function catalogUrl() {
  return new URL(screen.getByTestId('location').textContent!, 'http://localhost');
}

describe('date-first rental catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flags.rental = true;
    vi.mocked(costumeService.getPublicCatalog).mockResolvedValue([item]);
  });

  it('does not fetch or show products before both dates are valid, and keeps dates outside optional filters', async () => {
    renderCatalog();
    expect(screen.getByLabelText(/Ngày nhận/)).toHaveValue('');
    expect(screen.getByLabelText(/Ngày trả/)).toHaveValue('');
    expect(screen.getByLabelText(/Ngày nhận/).closest('details')).toBeNull();
    expect(screen.getByRole('button', { name: 'Tìm sản phẩm', hidden: true })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Ngày nhận/), { target: { value: receiveDate } });
    expect(costumeService.getPublicCatalogCategories).not.toHaveBeenCalled();
    expect(costumeService.getPublicCatalog).not.toHaveBeenCalled();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tạo yêu cầu thuê riêng' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Ngày trả/), { target: { value: returnDate } });
    expect(await screen.findByRole('heading', { name: item.name })).toBeInTheDocument();
    expect(costumeService.getPublicCatalog).toHaveBeenCalledWith({ receiveDate, returnDate });
    expect(costumeService.getPublicCatalogCategories).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent(periodQuery);
  });

  it('groups returned items by kind and normalized category without merging categories across kinds', async () => {
    vi.mocked(costumeService.getPublicCatalog).mockResolvedValue(groupedItems);
    renderCatalog(periodQuery);
    await screen.findByRole('heading', { name: item.name, level: 4 });

    expect(screen.getByRole('heading', { name: 'Chọn nhóm hàng' })).toBeInTheDocument();
    const kinds = screen.getByRole('group', { name: 'Nhóm hàng' });
    expect(within(kinds).getByRole('button', { name: /^Tất cả / })).toHaveTextContent('7 mẫu');
    expect(within(kinds).getByRole('button', { name: /^Tất cả / })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(kinds).getByRole('button', { name: /^Trang phục\b/ })).toHaveTextContent('5 mẫu');
    expect(within(kinds).getByRole('button', { name: /^Phụ kiện\b/ })).toHaveTextContent('2 mẫu');

    const clothingCategories = screen.getByRole('group', { name: 'Danh mục trang phục' });
    const accessoryCategories = screen.getByRole('group', { name: 'Danh mục phụ kiện' });
    expect(within(clothingCategories).getAllByRole('button')).toHaveLength(2);
    expect(
      within(clothingCategories).getByRole('button', { name: /^Áo dài\b/i }),
    ).toHaveTextContent('3 mẫu');
    expect(
      within(clothingCategories).getByRole('button', { name: /^Trang phục khác\b/ }),
    ).toHaveTextContent('2 mẫu');
    expect(within(accessoryCategories).getAllByRole('button')).toHaveLength(2);
    expect(
      within(accessoryCategories).getByRole('button', { name: /^Áo dài\b/i }),
    ).toHaveTextContent('1 mẫu');
    expect(
      within(accessoryCategories).getByRole('button', { name: /^Phụ kiện khác\b/ }),
    ).toHaveTextContent('1 mẫu');
    expect(screen.getAllByRole('button', { name: 'Tất cả danh mục' })).toHaveLength(1);

    const clothingResults = screen.getByRole('region', { name: 'Trang phục' });
    const accessoryResults = screen.getByRole('region', { name: 'Phụ kiện' });
    expect(
      within(clothingResults).getByRole('heading', { name: 'Trang phục', level: 2 }),
    ).toBeInTheDocument();
    expect(
      within(clothingResults).getByRole('heading', { name: /^Áo dài/i, level: 3 }),
    ).toBeInTheDocument();
    expect(
      within(accessoryResults).getByRole('heading', { name: 'Phụ kiện', level: 2 }),
    ).toBeInTheDocument();
    expect(
      within(accessoryResults).getByRole('heading', { name: /^Áo dài/i, level: 3 }),
    ).toBeInTheDocument();
    expect(within(clothingResults).getAllByRole('article')).toHaveLength(5);
    expect(within(accessoryResults).getAllByRole('article')).toHaveLength(2);
    for (const product of groupedItems) {
      expect(screen.getByRole('heading', { name: product.name, level: 4 })).toBeInTheDocument();
    }
    expect(costumeService.getPublicCatalog).toHaveBeenCalledTimes(1);
    expect(costumeService.getPublicCatalogCategories).not.toHaveBeenCalled();
  });

  it('filters categories locally with canonical URL values and resets the category when changing kinds', async () => {
    vi.mocked(costumeService.getPublicCatalog).mockResolvedValue(groupedItems);
    renderCatalog(periodQuery);
    await screen.findByRole('heading', { name: item.name });
    const kinds = screen.getByRole('group', { name: 'Nhóm hàng' });
    const clothingCategory = within(
      screen.getByRole('group', { name: 'Danh mục trang phục' }),
    ).getByRole('button', { name: /^Áo dài\b/i });
    fireEvent.click(clothingCategory);

    expect(clothingCategory).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.queryByRole('heading', { name: 'Khăn áo dài' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Áo trơn' })).not.toBeInTheDocument();
    expect(catalogUrl().searchParams.get('kind')).toBe('clothing');
    expect(catalogUrl().searchParams.get('category')).toBe('áo dài');
    expect(catalogUrl().searchParams.get('receiveDate')).toBe(receiveDate);
    expect(catalogUrl().searchParams.get('returnDate')).toBe(returnDate);

    fireEvent.click(within(kinds).getByRole('button', { name: /^Phụ kiện\b/ }));
    expect(catalogUrl().searchParams.get('kind')).toBe('accessory');
    expect(catalogUrl().searchParams.has('category')).toBe(false);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Khăn áo dài' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nơ cài áo' })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Danh mục phụ kiện' })).getByRole('button', {
        name: /^Áo dài\b/i,
      }),
    );
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(catalogUrl().searchParams.get('kind')).toBe('accessory');
    expect(catalogUrl().searchParams.get('category')).toBe('áo dài');

    fireEvent.click(screen.getByRole('button', { name: 'Tất cả danh mục' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(catalogUrl().searchParams.get('kind')).toBe('accessory');
    expect(catalogUrl().searchParams.has('category')).toBe(false);
    fireEvent.click(within(kinds).getByRole('button', { name: /^Tất cả / }));
    expect(screen.getAllByRole('article')).toHaveLength(7);
    expect(catalogUrl().searchParams.has('kind')).toBe(false);
    expect(costumeService.getPublicCatalog).toHaveBeenCalledTimes(1);
    expect(costumeService.getPublicCatalog).toHaveBeenCalledWith({ receiveDate, returnDate });
  });

  it('restores a category URL and keeps an unavailable category in its requested kind until reset', async () => {
    vi.mocked(costumeService.getPublicCatalog).mockResolvedValue(groupedItems);
    const first = renderCatalog(
      `${periodQuery}&kind=clothing&category=${encodeURIComponent('áo dài')}`,
    );
    await screen.findByRole('heading', { name: item.name });
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(
      within(screen.getByRole('group', { name: 'Danh mục trang phục' })).getByRole('button', {
        name: /^Áo dài\b/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(costumeService.getPublicCatalog).toHaveBeenCalledWith({ receiveDate, returnDate });
    first.unmount();

    renderCatalog(`${periodQuery}&kind=clothing&category=${encodeURIComponent('phụ kiện khác')}`);
    await waitFor(() => expect(costumeService.getPublicCatalog).toHaveBeenCalledTimes(2));
    await screen.findByRole('heading', {
      name: 'Danh mục đã chọn chưa có mặt hàng phù hợp',
    });
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    const kinds = screen.getByRole('group', { name: 'Nhóm hàng' });
    expect(within(kinds).getByRole('button', { name: /^Trang phục\b/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(kinds).getByRole('button', { name: /^Phụ kiện\b/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(catalogUrl().searchParams.get('kind')).toBe('clothing');
    expect(catalogUrl().searchParams.get('category')).toBe('phụ kiện khác');
    fireEvent.click(screen.getByRole('button', { name: 'Xem tất cả danh mục' }));
    expect(screen.getAllByRole('article')).toHaveLength(7);
    expect(catalogUrl().searchParams.has('kind')).toBe(false);
    expect(catalogUrl().searchParams.has('category')).toBe(false);
    expect(costumeService.getPublicCatalog).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['2020-01-01', '2020-01-02', 'hôm nay'],
    ['2098-04-12', '2098-04-10', 'Ngày trả phải'],
    ['2098-02-30', '2098-03-01', 'không hợp lệ'],
    ['2098-01-01', '2099-01-02', '366 ngày'],
  ])('does not fetch an invalid period %s to %s', async (receive, returned, message) => {
    renderCatalog(`receiveDate=${receive}&returnDate=${returned}`);
    await screen.findByText(new RegExp(message));
    expect(costumeService.getPublicCatalog).not.toHaveBeenCalled();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('shows daily pricing, the inclusive estimate and available sizes; preserves dates through filters, clear and CTA', async () => {
    vi.mocked(costumeService.getPublicCatalog).mockResolvedValue([
      item,
      { ...item, _id: 'outfit-2', name: 'Nơ cài áo', rentalDailyPrice: null },
    ]);
    renderCatalog(periodQuery);
    const card = (await screen.findByRole('heading', { name: item.name })).closest('article')!;
    expect(within(card).getByText('M · còn 3')).toBeInTheDocument();
    expect(within(card).queryByText('S · còn 0')).not.toBeInTheDocument();
    expect(within(card).getByText('120.000 ₫')).toBeInTheDocument();
    expect(within(card).getByText('360.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('Liên hệ báo giá')).toBeInTheDocument();
    expect(screen.queryByText('999.000 ₫')).not.toBeInTheDocument();
    expect(screen.queryByText('Minh hoạ nhóm hàng')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Kích cỡ'), { target: { value: 'M' } });
    fireEvent.change(screen.getByLabelText('Giá/ngày từ (đ)'), { target: { value: '100000' } });
    fireEvent.change(screen.getByLabelText('Giá/ngày đến (đ)'), { target: { value: '200000' } });
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Nhóm hàng' })).getByRole('button', {
        name: /^Trang phục\b/,
      }),
    );
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Danh mục trang phục' })).getByRole('button', {
        name: /^Trang phục khác\b/,
      }),
    );
    fireEvent.submit(
      screen.getByRole('button', { name: 'Tìm sản phẩm', hidden: true }).closest('form')!,
    );
    await waitFor(() =>
      expect(costumeService.getPublicCatalog).toHaveBeenLastCalledWith({
        receiveDate,
        returnDate,
        size: 'M',
        minPrice: 100000,
        maxPrice: 200000,
      }),
    );
    await screen.findByRole('heading', { name: item.name });
    fireEvent.click(screen.getByRole('button', { name: 'Xoá lọc', hidden: true }));
    await waitFor(() =>
      expect(costumeService.getPublicCatalog).toHaveBeenLastCalledWith({ receiveDate, returnDate }),
    );
    expect(screen.getByLabelText(/Ngày nhận/)).toHaveValue(receiveDate);
    expect(screen.getByLabelText(/Ngày trả/)).toHaveValue(returnDate);
    expect(screen.getByLabelText('Kích cỡ')).toHaveValue('');
    expect(screen.getByLabelText('Giá/ngày từ (đ)')).toHaveValue(null);
    expect(screen.getByLabelText('Giá/ngày đến (đ)')).toHaveValue(null);
    expect(catalogUrl().searchParams.has('kind')).toBe(false);
    expect(catalogUrl().searchParams.has('category')).toBe(false);
    await screen.findByRole('heading', { name: item.name });
    fireEvent.click(screen.getAllByRole('link', { name: 'Thuê riêng mẫu này' })[0]);
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/rental/start?item=outfit-1&${periodQuery}`,
    );
  });

  it('opens a standalone rental request with the chosen period without a photography package', async () => {
    renderCatalog(periodQuery);
    fireEvent.click(await screen.findByRole('link', { name: 'Tạo yêu cầu thuê riêng' }));
    const url = catalogUrl();
    expect(url.pathname).toBe('/rental/start');
    expect(url.searchParams.get('receiveDate')).toBe(receiveDate);
    expect(url.searchParams.get('returnDate')).toBe(returnDate);
    expect(url.searchParams.has('source')).toBe(false);
    expect(url.searchParams.has('package')).toBe(false);
  });

  it('keeps the selected period but hides rental actions when online submission is disabled', async () => {
    flags.rental = false;
    renderCatalog(periodQuery);
    await screen.findByRole('heading', { name: item.name });
    expect(screen.getByLabelText(/Ngày nhận/)).toHaveValue(receiveDate);
    expect(screen.queryByRole('link', { name: 'Tạo yêu cầu thuê riêng' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Liên hệ thuê riêng' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Thuê riêng mẫu này' })).not.toBeInTheDocument();
  });

  it('hides previous results immediately on date change and ignores stale responses', async () => {
    let resolveOld!: (items: RentalCatalogItem[]) => void;
    let resolveNew!: (items: RentalCatalogItem[]) => void;
    vi.mocked(costumeService.getPublicCatalog)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNew = resolve;
          }),
      );
    renderCatalog(periodQuery);
    await waitFor(() => expect(costumeService.getPublicCatalog).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText(/Ngày trả/), { target: { value: '2098-04-13' } });
    await waitFor(() => expect(costumeService.getPublicCatalog).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('heading', { name: item.name })).not.toBeInTheDocument();
    await act(async () => resolveNew([{ ...item, name: 'Áo dài mới' }]));
    expect(await screen.findByRole('heading', { name: 'Áo dài mới' })).toBeInTheDocument();
    await act(async () => resolveOld([item]));
    expect(screen.queryByRole('heading', { name: item.name })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Áo dài mới' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Ngày nhận/), { target: { value: '' } });
    expect(screen.queryByRole('heading', { name: 'Áo dài mới' })).not.toBeInTheDocument();
    expect(costumeService.getPublicCatalog).toHaveBeenCalledTimes(2);
  });
});

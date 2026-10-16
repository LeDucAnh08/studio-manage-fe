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

describe('date-first rental catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flags.rental = true;
    vi.mocked(costumeService.getPublicCatalogCategories).mockResolvedValue([
      { _id: 'type-1', name: 'Áo dài' },
    ]);
    vi.mocked(costumeService.getPublicCatalog).mockResolvedValue([item]);
  });

  it('does not fetch or show products before both dates are valid, and keeps dates outside optional filters', async () => {
    renderCatalog();
    expect(screen.getByLabelText(/Ngày nhận/)).toHaveValue('');
    expect(screen.getByLabelText(/Ngày trả/)).toHaveValue('');
    expect(screen.getByLabelText(/Ngày nhận/).closest('details')).toBeNull();
    expect(screen.getByRole('button', { name: 'Tìm sản phẩm', hidden: true })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Ngày nhận/), { target: { value: receiveDate } });
    await waitFor(() => expect(costumeService.getPublicCatalogCategories).toHaveBeenCalled());
    expect(costumeService.getPublicCatalog).not.toHaveBeenCalled();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Ngày trả/), { target: { value: returnDate } });
    expect(await screen.findByRole('heading', { name: item.name })).toBeInTheDocument();
    expect(costumeService.getPublicCatalog).toHaveBeenCalledWith({ receiveDate, returnDate });
    expect(screen.getByTestId('location')).toHaveTextContent(periodQuery);
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
    fireEvent.submit(
      screen.getByRole('button', { name: 'Tìm sản phẩm', hidden: true }).closest('form')!,
    );
    await waitFor(() =>
      expect(costumeService.getPublicCatalog).toHaveBeenLastCalledWith({
        receiveDate,
        returnDate,
        size: 'M',
        minPrice: 100000,
      }),
    );
    await screen.findByRole('heading', { name: item.name });
    fireEvent.click(screen.getByRole('button', { name: 'Xoá lọc', hidden: true }));
    await waitFor(() =>
      expect(costumeService.getPublicCatalog).toHaveBeenLastCalledWith({ receiveDate, returnDate }),
    );
    expect(screen.getByLabelText(/Ngày nhận/)).toHaveValue(receiveDate);
    expect(screen.getByLabelText(/Ngày trả/)).toHaveValue(returnDate);
    await screen.findByRole('heading', { name: item.name });
    fireEvent.click(screen.getAllByRole('link', { name: 'Yêu cầu thuê mẫu này' })[0]);
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/rental/start?item=outfit-1&${periodQuery}`,
    );
  });

  it('restores the period from the URL and preserves the booking fallback context', async () => {
    flags.rental = false;
    const first = renderCatalog(periodQuery);
    await screen.findByRole('heading', { name: item.name });
    const restoredQuery = screen.getByTestId('location').textContent!.split('?')[1];
    first.unmount();
    renderCatalog(restoredQuery);
    await screen.findByRole('heading', { name: item.name });
    expect(screen.getByLabelText(/Ngày nhận/)).toHaveValue(receiveDate);
    fireEvent.click(screen.getByRole('link', { name: 'Thêm vào yêu cầu' }));
    const url = new URL(screen.getByTestId('location').textContent!, 'http://localhost');
    expect(url.pathname).toBe('/booking/start');
    expect(url.searchParams.get('itemName')).toBe(item.name);
    expect(url.searchParams.get('source')).toBe('costumes');
    expect(url.searchParams.get('receiveDate')).toBe(receiveDate);
    expect(url.searchParams.get('returnDate')).toBe(returnDate);
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
    await act(async () => resolveOld([item]));
    expect(screen.queryByRole('heading', { name: item.name })).not.toBeInTheDocument();
    await act(async () => resolveNew([{ ...item, name: 'Áo dài mới' }]));
    expect(await screen.findByRole('heading', { name: 'Áo dài mới' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Ngày nhận/), { target: { value: '' } });
    expect(screen.queryByRole('heading', { name: 'Áo dài mới' })).not.toBeInTheDocument();
    expect(costumeService.getPublicCatalog).toHaveBeenCalledTimes(2);
  });
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RentalListPage from './RentalListPage';
import FeedbackPage from './FeedbackPage';
import type { RentalOrder } from '../services/rentalService';

const mocks = vi.hoisted(() => ({
  rentals: vi.fn(),
  feedback: vi.fn(),
  markRead: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../services/rentalService', async () => ({
  ...(await vi.importActual('../services/rentalService')),
  rentalService: { list: mocks.rentals },
}));
vi.mock('../services/feedbackService', () => ({
  feedbackService: { getAll: mocks.feedback, markRead: mocks.markRead, remove: mocks.remove },
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const rental = {
  _id: 'rental-1',
  contactName: 'Khách thuê',
  phone: '0901234567',
  status: 'confirmed',
  requestedLines: [{ costumeId: 'costume-1', name: 'Áo dài', size: 'M', quantity: 2 }],
  requestedReceiveDate: '2027-01-01',
  requestedReturnDate: '2027-01-02',
  quote: null,
  payment: { netReceived: 200000, due: 50000, refundDue: 0 },
  updatedAt: '2026-10-31',
} as RentalOrder;
const feedback = {
  _id: 'feedback-1',
  customer: null,
  phone: '0901234567',
  crewFeedback: { rating: 5, description: 'Ekip nhiệt tình' },
  albumFeedback: { rating: 4, description: 'Album đẹp' },
  content: 'Nội dung đầy đủ',
  suggestion: 'Góp ý chi tiết',
  isRead: false,
  createdAt: '2026-10-31T08:00:00Z',
};
function Probe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname + location.search + JSON.stringify(location.state)}
    </output>
  );
}
const openRentals = (path = '/rental-orders') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Probe />
      <Routes>
        <Route path="/rental-orders" element={<RentalListPage />} />
        <Route path="/rental-orders/:id" element={<p>Chi tiết</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('shared admin tables', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.rentals.mockResolvedValue({ data: [rental], pagination: { total: 45 } });
    mocks.feedback.mockResolvedValue({
      data: [feedback],
      total: 25,
      totalRead: 5,
      totalUnread: 20,
    });
    mocks.markRead.mockResolvedValue({ ...feedback, isRead: true });
  });
  it('keeps rental server pagination, status and money in one table and retains the return URL', async () => {
    openRentals('/rental-orders?view=active&page=2');
    const table = await screen.findByRole('table', { name: 'Đơn thuê trang phục' });
    expect(mocks.rentals).toHaveBeenLastCalledWith(2, 'active');
    expect(within(table).getByRole('cell', { name: 'Áo dài · M · 2 món' })).toBeInTheDocument();
    expect(within(table).getByText('50.000 đ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() => expect(mocks.rentals).toHaveBeenLastCalledWith(3, 'active'));
    fireEvent.click(await screen.findByRole('link', { name: 'Khách thuê' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      'rentalOrdersReturnTo":"/rental-orders?view=active&page=3',
    );
  });
  it('resets rental paging on filter changes and displays refundable money', async () => {
    mocks.rentals.mockResolvedValue({
      data: [{ ...rental, payment: { ...rental.payment, refundDue: 10000 } }],
      pagination: { total: 1 },
    });
    openRentals('/rental-orders?page=2');
    await screen.findByRole('table');
    fireEvent.change(screen.getByRole('combobox', { name: 'Trạng thái đơn' }), {
      target: { value: 'cancelled' },
    });
    await waitFor(() => expect(mocks.rentals).toHaveBeenLastCalledWith(1, 'cancelled'));
    expect(screen.getByText('Cần hoàn 10.000 đ')).toBeInTheDocument();
  });
  it('does not replace a filtered rental list with an outdated request', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.rentals
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValueOnce({
        data: [{ ...rental, contactName: 'Đơn mới' }],
        pagination: { total: 1 },
      });
    openRentals();
    fireEvent.change(screen.getByRole('combobox', { name: 'Trạng thái đơn' }), {
      target: { value: 'completed' },
    });
    await screen.findByRole('link', { name: 'Đơn mới' });
    resolveOld({ data: [rental], pagination: { total: 45 } });
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Khách thuê' })).not.toBeInTheDocument(),
    );
  });
  it('preserves full feedback details, read actions and server filter pagination', async () => {
    render(
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>,
    );
    const table = await screen.findByRole('table', { name: 'Phản hồi khách hàng' });
    fireEvent.click(within(table).getByRole('button', { name: /Xem phản hồi/ }));
    const dialog = screen.getByRole('dialog', { name: 'Chi tiết phản hồi' });
    expect(within(dialog).getByText('Ekip nhiệt tình')).toBeInTheDocument();
    expect(within(dialog).getByText('Album đẹp')).toBeInTheDocument();
    expect(within(dialog).getByText('Góp ý chi tiết')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    fireEvent.click(within(table).getByRole('button', { name: 'Đánh dấu đã đọc' }));
    await waitFor(() => expect(mocks.markRead).toHaveBeenCalledWith('feedback-1', true));
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() => expect(mocks.feedback).toHaveBeenLastCalledWith({ page: 2, limit: 20 }));
    fireEvent.click(screen.getByRole('button', { name: /Chưa đọc \(/ }));
    await waitFor(() =>
      expect(mocks.feedback).toHaveBeenLastCalledWith({ page: 1, limit: 20, isRead: 'false' }),
    );
  });
});

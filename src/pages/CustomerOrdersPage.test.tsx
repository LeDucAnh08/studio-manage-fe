import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAppearanceContext } from '../components/customer/CustomerAppearance';
import CustomerOrdersPage from './CustomerOrdersPage';
import CustomerHeader from '../components/Layout/CustomerHeader';
import type { BookingWorkflowDto } from '../services/bookingWorkflowService';
import type { RentalOrder } from '../services/rentalService';
const mocks = vi.hoisted(() => ({
  bookings: vi.fn(),
  rentals: vi.fn(),
  notifications: vi.fn(),
  workflow: vi.fn(),
  read: vi.fn(),
}));
vi.mock('../config/features', () => ({
  clientPortalEnabled: true,
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { roles: [6] }, isAuthenticated: true }),
}));
vi.mock('../services/bookingService', () => ({
  bookingLabels: { pending: 'Chờ duyệt', rejected: 'Đã từ chối' },
  bookingService: { notifications: mocks.notifications, read: mocks.read },
}));
vi.mock('../services/bookingWorkflowService', async () => ({
  ...(await vi.importActual('../services/bookingWorkflowService')),
  bookingWorkflowService: { list: mocks.bookings, get: mocks.workflow },
}));
vi.mock('../services/rentalService', async () => ({
  ...(await vi.importActual('../services/rentalService')),
  rentalService: { list: mocks.rentals },
}));
function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="url">{location.search}</output>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  );
}
function open(search = '') {
  return render(
    <MemoryRouter initialEntries={['/account/orders' + search]}>
      <CustomerAppearanceContext.Provider value={true}>
        <CustomerOrdersPage />
        <Probe />
      </CustomerAppearanceContext.Provider>
    </MemoryRouter>,
  );
}
describe('Unified orders tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bookings.mockResolvedValue({ data: [], pagination: { total: 0 } });
    mocks.rentals.mockResolvedValue({ data: [], pagination: { total: 0 } });
    mocks.notifications.mockResolvedValue([]);
    mocks.read.mockResolvedValue({});
    mocks.workflow.mockResolvedValue(record());
  });
  it('loads only the active list, resets filters on switching and restores the previous view with Back', async () => {
    open();
    await screen.findByText(/Bạn chưa có đơn chụp ảnh/);
    expect(mocks.bookings).toHaveBeenCalledWith(1, 20, '');
    expect(mocks.rentals).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'active' } });
    await waitFor(() => expect(mocks.bookings).toHaveBeenLastCalledWith(1, 20, 'active'));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Thuê trang phục' }), {
      button: 0,
      ctrlKey: false,
    });
    await screen.findByText('Chưa có đơn thuê');
    expect(mocks.rentals).toHaveBeenCalledWith(1, '');
    expect(screen.getByTestId('url')).toHaveTextContent('?tab=rentals');
    expect(screen.getByLabelText('Trạng thái')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByText(/Chưa có đơn phù hợp với trạng thái này/);
    expect(mocks.bookings).toHaveBeenLastCalledWith(1, 20, 'active');
    expect(screen.getByRole('tab', { name: 'Chụp ảnh' })).toHaveAttribute('aria-selected', 'true');
  });
  it('directly opens rentals without loading bookings', async () => {
    open('?tab=rentals');
    await screen.findByText('Chưa có đơn thuê');
    expect(mocks.bookings).not.toHaveBeenCalled();
    expect(mocks.notifications).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Trạng thái')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải lại đơn' })).toBeInTheDocument();
  });

  function rental(id = 'rental-1', status = 'confirmed'): RentalOrder {
    return {
      _id: id,
      version: 3,
      status,
      contactName: 'Khách thuê',
      note: '',
      requestedReceiveDate: '2026-11-12',
      requestedReturnDate: '2026-11-14',
      requestedLines: [
        {
          costumeId: id,
          name: id === 'rental-1' ? 'Áo dài trắng' : 'Vest xanh',
          size: 'M',
          quantity: 2,
        },
      ],
      quote: {
        version: 1,
        lines: [
          {
            costumeId: id,
            name: id === 'rental-1' ? 'Áo dài trắng' : 'Vest xanh',
            size: 'M',
            quantity: 2,
          },
        ],
        receiveDate: '2026-11-13',
        returnDate: '2026-11-15',
        fee: 300000,
        deposit: 100000,
        terms: [],
        acceptedAt: '2026-10-30',
      },
      quoteHistory: [],
      readyForHandover: false,
      returns: [],
      change: null,
      events: [{ action: 'resources.confirm', message: 'Đã giữ hàng', at: '2026-10-31' }],
      createdAt: '2026-10-29',
      updatedAt: '2026-10-31',
    };
  }

  it('uses the same list and progress layout for rentals, selects an order and preserves its return context', async () => {
    const completed = rental('rental-2', 'completed');
    completed.events.push({ action: 'completed', message: 'Đã hoàn tất', at: '2026-11-16' });
    mocks.rentals.mockResolvedValue({
      data: [rental(), completed],
      pagination: { total: 2 },
    });
    open('?tab=rentals');
    const list = await screen.findByRole('list', { name: 'Danh sách đơn thuê trang phục' });
    const first = screen.getByRole('region', { name: 'Áo dài trắng' });
    expect(within(first).getByText('Tiến độ đơn')).toBeInTheDocument();
    expect(within(first).getByText('Đã giữ trang phục')).toBeInTheDocument();
    expect(within(first).getByText('13/11/2026')).toBeInTheDocument();
    expect(within(first).queryByText('12/11/2026')).not.toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button', { name: /Vest xanh/ }));
    const second = screen.getByRole('region', { name: 'Vest xanh' });
    expect(within(second).getByText('Đã hoàn tất dịch vụ')).toBeInTheDocument();
    expect(within(second).getByText('16/11/2026')).toBeInTheDocument();
    expect(within(second).getByRole('link', { name: 'Xem hồ sơ đầy đủ' })).toHaveAttribute(
      'href',
      '/account/rentals/rental-2',
    );
    expect(screen.getByTestId('url')).toHaveTextContent('order=rental-2');
    expect(mocks.bookings).not.toHaveBeenCalled();
  });

  it('filters and paginates rentals on the server, clears selection and retries errors', async () => {
    mocks.rentals.mockRejectedValueOnce(new Error('offline'));
    open('?tab=rentals&page=2&order=rental-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    await screen.findByText('Chưa có đơn thuê');
    expect(mocks.rentals).toHaveBeenLastCalledWith(2, '');
    mocks.rentals.mockResolvedValue({ data: [rental()], pagination: { total: 21 } });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'active' } });
    await screen.findByRole('region', { name: 'Áo dài trắng' });
    expect(mocks.rentals).toHaveBeenLastCalledWith(1, 'active');
    expect(screen.getByTestId('url')).not.toHaveTextContent('order=');
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
    await waitFor(() => expect(mocks.rentals).toHaveBeenLastCalledWith(2, 'active'));
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại đơn' }));
    await waitFor(() => expect(mocks.rentals).toHaveBeenCalledTimes(5));
  });

  it.each(['cancelled', 'rejected'])('hides future rental stages after %s', async (status) => {
    const order = rental('rental-1', status);
    order.quote = null;
    order.events = [];
    mocks.rentals.mockResolvedValue({ data: [order], pagination: { total: 1 } });
    open('?tab=rentals');
    await screen.findByText('Tiến độ đơn');
    expect(screen.queryByText('Xác nhận giữ trang phục')).not.toBeInTheDocument();
    expect(screen.queryByText('Nhận, trả & hoàn tất')).not.toBeInTheDocument();
  });
  it('normalizes an unknown tab while keeping rentals available', async () => {
    open('?tab=unknown');
    await screen.findByText(/Bạn chưa có đơn chụp ảnh/);
    expect(screen.getByRole('tab', { name: 'Thuê trang phục' })).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('?tab=bookings');
    expect(mocks.rentals).not.toHaveBeenCalled();
  });
  it('retries a failed booking request independently', async () => {
    mocks.bookings.mockRejectedValueOnce(new Error('offline'));
    open();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByText(/Bạn chưa có đơn chụp ảnh/);
    expect(mocks.bookings).toHaveBeenCalledTimes(2);
    expect(mocks.rentals).not.toHaveBeenCalled();
  });

  const summary = (id = 'order-1', lifecycle = 'confirmed') => ({
    bookingId: id,
    version: 3,
    lifecycle,
    packageName: id === 'order-1' ? 'Ngoại cảnh' : 'Sân trường',
    className: '12A1',
    school: 'THPT Yume',
    bookingStatus: 'approved',
    shootDate: '2026-11-19',
    updatedAt: '2026-10-24',
  });
  function record(
    id = 'order-1',
    lifecycle: BookingWorkflowDto['workflow']['lifecycle'] = 'confirmed',
  ): BookingWorkflowDto {
    return {
      booking: {
        _id: id,
        packageName: id === 'order-1' ? 'Ngoại cảnh' : 'Sân trường',
        status: 'approved',
        members: 37,
        className: '12A1',
        school: 'THPT Yume',
        startAt: '2026-11-19T07:30:00+07:00',
        endAt: '2026-11-19T15:00:00+07:00',
        location: 'Địa điểm yêu cầu',
      },
      workflow: {
        bookingId: id,
        version: 3,
        lifecycle,
        quote: null,
        payments: null,
        allowedCostumes: [],
        members: [],
        progress: null,
        resources: {
          scheduleId: 'schedule-1',
          scheduleDetails: {
            shootDate: '2026-11-20',
            startTime: '08:00',
            endTime: '16:00',
            location: 'Địa điểm đã chốt',
          },
          photographers: [],
          costumes: [],
        },
        changeRequest: null,
        feedback: null,
        quoteHistory: [],
        deliveryHistory: [],
        paymentInstructions: null,
        paymentReady: false,
        memberEntry: null,
        events: [
          {
            action: 'intake.received',
            message: 'Đã nhận yêu cầu',
            at: '2026-10-14T09:00:00+07:00',
          },
          { action: 'resources.confirm', message: 'Đã chốt lịch', at: '2026-10-24T20:30:00+07:00' },
        ],
      },
    };
  }

  it('selects orders, uses confirmed schedule details, links to the full record and discards a late response', async () => {
    mocks.bookings.mockResolvedValue({
      data: [summary(), summary('order-2', 'completed')],
      pagination: { total: 2 },
    });
    let resolveFirst!: (value: BookingWorkflowDto) => void;
    mocks.workflow.mockImplementation((id: string) =>
      id === 'order-1'
        ? new Promise((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve(record('order-2', 'completed')),
    );
    open();
    const list = await screen.findByRole('list', { name: 'Danh sách đơn chụp ảnh' });
    expect(screen.getByRole('tab', { name: 'Chụp ảnh' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(list).getByRole('button', { name: /Sân trường/ }));
    const preview = await screen.findByRole('region', { name: 'Sân trường' });
    expect(await within(preview).findByText('Đã hoàn tất dịch vụ')).toBeInTheDocument();
    expect(within(preview).getByText('Địa điểm đã chốt')).toBeInTheDocument();
    expect(within(preview).queryByText('Địa điểm yêu cầu')).not.toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('order=order-2');
    expect(within(preview).getByRole('link', { name: 'Xem hồ sơ đầy đủ' })).toHaveAttribute(
      'href',
      '/account/bookings/order-2',
    );
    await act(async () => resolveFirst(record()));
    expect(screen.getByRole('region', { name: 'Sân trường' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Ngoại cảnh' })).not.toBeInTheDocument();
  });

  it('retries the selected progress independently and resets page when changing the filter', async () => {
    mocks.bookings.mockResolvedValue({ data: [summary()], pagination: { total: 21 } });
    mocks.workflow.mockRejectedValueOnce(new Error('offline'));
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Thử tải lại tiến độ' }));
    await screen.findByText('Tiến độ đơn');
    expect(mocks.bookings).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
    await waitFor(() => expect(mocks.bookings).toHaveBeenLastCalledWith(2, 20, ''));
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'completed' } });
    await waitFor(() => expect(mocks.bookings).toHaveBeenLastCalledWith(1, 20, 'completed'));
  });

  it.each(['rejected', 'cancelled'] as const)(
    'does not present future stages as pending work for %s orders',
    async (status) => {
      const item = record();
      item.workflow.resources = null;
      if (status === 'rejected') item.booking.status = 'rejected';
      else item.workflow.lifecycle = 'cancelled';
      mocks.bookings.mockResolvedValue({ data: [summary()], pagination: { total: 1 } });
      mocks.workflow.mockResolvedValue(item);
      open();
      await screen.findByText('Tiến độ đơn');
      expect(screen.queryByText('Chụp & bàn giao')).not.toBeInTheDocument();
      expect(screen.queryByText('Xác nhận lịch chụp')).not.toBeInTheDocument();
    },
  );

  it('opens notifications on demand and marks only the latest displayed timestamp read', async () => {
    mocks.notifications.mockResolvedValue([
      {
        _id: 'note-1',
        bookingId: 'order-1',
        message: 'Studio đã phản hồi',
        at: '2026-10-25T08:00:00Z',
        unread: true,
      },
    ]);
    render(
      <MemoryRouter initialEntries={['/account/orders']}>
        <CustomerAppearanceContext.Provider value={true}>
          <CustomerHeader />
          <main>
            <CustomerOrdersPage />
          </main>
        </CustomerAppearanceContext.Provider>
      </MemoryRouter>,
    );
    const bell = await screen.findByRole('button', { name: 'Thông báo (1 chưa đọc)' });
    const header = screen.getByRole('button', { name: 'Tài khoản' }).closest('header')!;
    expect(within(header).getByRole('button', { name: /Thông báo/ })).toBe(bell);
    expect(
      within(screen.getByRole('heading', { name: 'Đơn của tôi' }).closest('header')!).queryByRole(
        'link',
        { name: 'Đặt dịch vụ' },
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Studio đã phản hồi')).not.toBeInTheDocument();
    fireEvent.click(bell);
    expect(await screen.findByRole('link', { name: /Studio đã phản hồi/ })).toHaveAttribute(
      'href',
      '/account/bookings/order-1',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã đọc' }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledWith('2026-10-25T08:00:00Z'));
  });
});

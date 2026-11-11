import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAppearanceContext } from '../components/customer/CustomerAppearance';
import CustomerOrdersPage from './CustomerOrdersPage';
import { RentalOrderProgress } from '../components/customer/RentalOrderProgress';
import { BookingOrderProgress } from '../components/customer/BookingOrderProgress';
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
  conceptBookingEnabled: false,
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
    expect(within(first).getAllByText('Chờ nhận đồ')[0]).toBeInTheDocument();
    expect(within(first).getByText('13/11/2026')).toBeInTheDocument();
    expect(within(first).queryByText('12/11/2026')).not.toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button', { name: /Vest xanh/ }));
    const second = screen.getByRole('region', { name: 'Vest xanh' });
    expect(within(second).getAllByText('Hoàn tất')[0]).toBeInTheDocument();
    expect(within(second).getByText('16/11/2026')).toBeInTheDocument();
    expect(within(second).getByRole('link', { name: 'Xem hồ sơ đầy đủ' })).toHaveAttribute(
      'href',
      '/account/rentals/rental-2',
    );
    expect(screen.getByTestId('url')).toHaveTextContent('order=rental-2');
    expect(mocks.bookings).not.toHaveBeenCalled();
  });

  it.each([
    ['requested', 'Chờ xác nhận'],
    ['quoting', 'Chờ xác nhận'],
    ['awaiting_deposit', 'Chờ xác nhận'],
    ['ready_to_confirm', 'Chờ xác nhận'],
    ['payment_review', 'Chờ xác nhận'],
    ['confirmed', 'Chờ nhận đồ'],
    ['checked_out', 'Đang thuê'],
    ['returned', 'Chờ đối soát'],
    ['completed', 'Hoàn tất'],
  ])('keeps fixed rental milestones for %s', (status, label) => {
    render(<RentalOrderProgress order={rental('rental-1', status)} />);
    const progress = screen.getByRole('region', { name: 'Tiến độ đơn' });
    expect(
      within(progress)
        .getAllByRole('listitem')
        .map((item) => item.querySelector('p')?.textContent),
    ).toEqual(['Chờ xác nhận', 'Chờ nhận đồ', 'Đang thuê', 'Chờ đối soát', 'Hoàn tất']);
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent(label);
  });

  it.each([
    'awaiting_confirmation',
    'ready_for_pickup',
    'renting',
    'settling',
    'completed',
    'cancelled',
  ])('uses the displayed stage %s as the server filter', async (view) => {
    open('?tab=rentals');
    await screen.findByText('Chưa có đơn thuê');
    const select = screen.getByLabelText('Trạng thái');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Tất cả',
      'Chờ xác nhận',
      'Chờ nhận đồ',
      'Đang thuê',
      'Chờ đối soát',
      'Hoàn tất',
      'Đã hủy',
    ]);
    fireEvent.change(select, { target: { value: view } });
    await waitFor(() => expect(mocks.rentals).toHaveBeenLastCalledWith(1, view));
  });

  it.each([
    ['expired', 'cancelled'],
    ['rejected', 'cancelled'],
    ['payment_review', 'awaiting_confirmation'],
    ['active', ''],
  ])('normalizes legacy rental filter %s', async (legacy, canonical) => {
    open('?tab=rentals&view=' + legacy);
    await waitFor(() => expect(mocks.rentals).toHaveBeenCalledWith(1, canonical));
    expect(screen.getByLabelText('Trạng thái')).toHaveValue(canonical);
  });

  it('keeps payment exceptions in the first stage without asking for another deposit', () => {
    render(
      <RentalOrderProgress
        order={{ ...rental('rental-1', 'payment_review'), autoCheckout: true }}
      />,
    );
    const progress = screen.getByRole('region', { name: 'Tiến độ đơn' });
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent('Chờ xác nhận');
    expect(
      within(progress).getByText(
        'Studio đang kiểm tra khoản thanh toán và khả năng giữ trang phục.',
      ),
    ).toBeInTheDocument();
    expect(progress).not.toHaveTextContent('Hoàn tất tiền cọc');
  });

  it('filters and paginates rentals on the server, clears selection and retries errors', async () => {
    mocks.rentals.mockRejectedValueOnce(new Error('offline'));
    open('?tab=rentals&page=2&order=rental-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    await screen.findByText('Chưa có đơn thuê');
    expect(mocks.rentals).toHaveBeenLastCalledWith(2, '');
    mocks.rentals.mockResolvedValue({ data: [rental()], pagination: { total: 21 } });
    fireEvent.change(screen.getByLabelText('Trạng thái'), {
      target: { value: 'ready_for_pickup' },
    });
    await screen.findByRole('region', { name: 'Áo dài trắng' });
    expect(mocks.rentals).toHaveBeenLastCalledWith(1, 'ready_for_pickup');
    expect(screen.getByTestId('url')).not.toHaveTextContent('order=');
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
    await waitFor(() => expect(mocks.rentals).toHaveBeenLastCalledWith(2, 'ready_for_pickup'));
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại đơn' }));
    await waitFor(() => expect(mocks.rentals).toHaveBeenCalledTimes(5));
  });

  it.each(['cancelled', 'rejected', 'expired'])(
    'hides future rental stages after %s',
    async (status) => {
      const order = rental('rental-1', status);
      order.quote = null;
      order.events = [];
      mocks.rentals.mockResolvedValue({ data: [order], pagination: { total: 1 } });
      open('?tab=rentals');
      await screen.findByText('Tiến độ đơn');
      const progress = screen.getByRole('region', { name: 'Tiến độ đơn' });
      expect(within(progress).queryByText('Chờ nhận đồ')).not.toBeInTheDocument();
      expect(within(progress).queryByText('Chờ đối soát')).not.toBeInTheDocument();
    },
  );
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
  it('matches booking filter labels with badges in both the list and selected record', async () => {
    mocks.bookings.mockResolvedValue({
      data: [{ ...summary('order-1', 'change_pending'), orderStage: 'active' }],
      pagination: { total: 1 },
    });
    const selected = record('order-1', 'change_pending');
    selected.workflow.orderStage = 'active';
    mocks.workflow.mockResolvedValue(selected);
    open('?view=active');
    const list = await screen.findByRole('list', { name: 'Danh sách đơn chụp ảnh' });
    expect(within(list).getByText('Đang thực hiện')).toBeInTheDocument();
    const preview = await screen.findByRole('region', { name: 'Ngoại cảnh' });
    expect(await within(preview).findByRole('region', { name: 'Tiến độ đơn' })).toHaveTextContent(
      'Đang thực hiện',
    );
    expect(screen.getByRole('option', { name: 'Đang thực hiện' })).toHaveValue('active');
    expect(screen.getAllByRole('option')).toHaveLength(9);
    fireEvent.change(screen.getByLabelText('Trạng thái'), {
      target: { value: 'awaiting_confirmation' },
    });
    await waitFor(() =>
      expect(mocks.bookings).toHaveBeenLastCalledWith(1, 20, 'awaiting_confirmation'),
    );
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

  it.each([
    ['intake', 'pending', 'Chờ duyệt'],
    ['quoting', 'awaiting_confirmation', 'Chờ chốt lịch'],
    ['confirmed', 'confirmed', 'Đã chốt lịch'],
    ['shooting', 'active', 'Đang thực hiện'],
    ['revision_requested', 'active', 'Đang thực hiện'],
    ['delivered', 'delivered', 'Đã bàn giao'],
    ['accepted', 'delivered', 'Đã bàn giao'],
    ['completed', 'completed', 'Hoàn tất'],
  ] as const)('keeps the same six progress milestones for %s', (lifecycle, stage, current) => {
    const data = record('order-1', lifecycle);
    data.booking.status = lifecycle === 'intake' ? 'pending' : 'approved';
    data.workflow.orderStage = stage;
    render(<BookingOrderProgress record={data} />);
    const progress = screen.getByRole('region', { name: 'Tiến độ đơn' });
    const items = within(progress).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('p')?.textContent)).toEqual([
      'Chờ duyệt',
      'Chờ chốt lịch',
      'Đã chốt lịch',
      'Đang thực hiện',
      'Đã bàn giao',
      'Hoàn tất',
    ]);
    expect(progress.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(progress.querySelector('[aria-current="step"]')).toHaveTextContent(current);
  });

  it('shows recorded milestone dates, leaves future stages undated and marks missing history', () => {
    const data = record('order-1', 'completed');
    data.workflow.createdAt = '2026-10-20T09:00:00+07:00';
    data.booking.createdAt = '2026-10-14T09:00:00+07:00';
    data.workflow.events.push(
      { action: 'package.approve', message: '', at: '2026-10-22T09:00:00+07:00' },
      { action: 'progress.update', message: '', at: '2026-10-27T09:00:00+07:00' },
      { action: 'progress.update', message: '', at: '2026-10-26T09:00:00+07:00' },
      { action: 'workflow.completed', message: '', at: '2026-11-03T18:00:00Z' },
    );
    data.workflow.progress = {
      status: 'delivered',
      deliveryVersion: 1,
      revisionRequests: [],
      deliveredAt: '2026-11-01T09:00:00+07:00',
    };
    const page = render(<BookingOrderProgress record={data} />);
    const dates = () =>
      Array.from(page.container.querySelectorAll('time')).map((item) => item.textContent);
    expect(dates()).toEqual([
      '14/10/2026',
      '22/10/2026',
      '24/10/2026',
      '26/10/2026',
      '01/11/2026',
      '04/11/2026',
    ]);
    data.workflow.lifecycle = 'awaiting_deposit';
    page.rerender(<BookingOrderProgress record={data} />);
    expect(dates()).toEqual(['14/10/2026', '22/10/2026']);
    data.workflow.events = [];
    page.rerender(<BookingOrderProgress record={data} />);
    expect(screen.getByText('Chưa có ngày ghi nhận')).toBeInTheDocument();
    expect(dates()).toEqual(['14/10/2026']);
  });

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
    expect(await within(preview).findByRole('region', { name: 'Tiến độ đơn' })).toHaveTextContent(
      'Hoàn tất',
    );
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
      const progress = screen.getByRole('region', { name: 'Tiến độ đơn' });
      expect(within(progress).queryByText('Đang thực hiện')).not.toBeInTheDocument();
      expect(within(progress).queryByText('Hoàn tất')).not.toBeInTheDocument();
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
        { name: 'Chụp kỉ yếu' },
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

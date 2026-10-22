import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAppearanceContext } from '@/components/customer/CustomerAppearance';
import type { BookingWorkflowDto } from '../services/bookingWorkflowService';
import type { RentalOrder } from '../services/rentalService';
import { RENTAL_DRAFT_KEY } from '../services/rentalDraft';
import BookingWorkflowDetailPage from './BookingWorkflowDetailPage';
import RentalDetailPage from './RentalDetailPage';
import NewRentalPage from './NewRentalPage';

const mocks = vi.hoisted(() => ({
  workflowGet: vi.fn(),
  workflowAct: vi.fn(),
  legacyGet: vi.fn(),
  photographers: vi.fn(),
  rentalGet: vi.fn(),
  rentalAct: vi.fn(),
  rentalCreate: vi.fn(),
  catalog: vi.fn(),
  requestId: vi.fn(),
  auth: { user: null as { _id: string; name: string; roles: number[] } | null },
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../config/features', () => ({ clientRentalEnabled: true }));
vi.mock('../services/bookingWorkflowService', () => ({
  bookingWorkflowService: { get: mocks.workflowGet, act: mocks.workflowAct },
  createWorkflowRequestId: mocks.requestId,
}));
vi.mock('../services/bookingService', () => ({ bookingService: { get: mocks.legacyGet } }));
vi.mock('../services/userService', () => ({
  userService: { getPhotographers: mocks.photographers },
}));
vi.mock('../services/costumeService', () => ({
  costumeService: { getPublicCatalog: mocks.catalog },
}));
vi.mock('../services/rentalService', async () => ({
  ...(await vi.importActual('../services/rentalService')),
  rentalService: { get: mocks.rentalGet, act: mocks.rentalAct, create: mocks.rentalCreate },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const futureDate = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

function bookingFixture(accepted = true): BookingWorkflowDto {
  const day = futureDate();
  return {
    booking: {
      _id: 'booking-1',
      status: 'approved',
      packageName: 'Gói kỷ yếu',
      members: 2,
      className: 'Lớp 12A',
      startAt: day + 'T08:00:00+07:00',
      endAt: day + 'T10:00:00+07:00',
      location: 'Studio',
    },
    workflow: {
      bookingId: 'booking-1',
      version: 7,
      lifecycle: accepted ? 'confirmed' : 'quoting',
      quote: {
        version: 2,
        currency: 'VND',
        lines: [{ label: 'Gói kỷ yếu', quantity: 2, unitPrice: 750000 }],
        total: 1500000,
        depositRequired: 500000,
        proposedSchedule: {
          shootDate: day + 'T00:00:00+07:00',
          startTime: '08:00',
          endTime: '10:00',
          location: 'Studio',
        },
        delivery: { targetDays: 14 },
        editingTerms: ['Chỉnh màu'],
        terms: ['Điều khoản thử'],
        paymentInstructions: {
          bankName: 'Ngân hàng thử',
          accountName: 'Studio',
          accountNumber: '123',
          transferTemplate: 'BOOKING-1',
        },
        ...(accepted ? { acceptedAt: '2026-10-01T08:00:00.000Z' } : {}),
      },
      payments: {
        requiredDeposit: 500000,
        totalReceived: 500000,
        totalRefunded: 0,
        netReceived: 500000,
        totalDue: 1000000,
        refundDue: 0,
        entries: [],
      },
      resources: accepted
        ? { scheduleId: 'schedule-1', photographers: ['photo-1'], costumes: [] }
        : null,
      allowedCostumes: [],
      members: [],
      progress: null,
      changeRequest: null,
      feedback: null,
      quoteHistory: [],
      deliveryHistory: [],
      paymentInstructions: null,
      paymentReady: true,
      events: [],
      memberEntry: null,
    },
  };
}

function intakeFixture(): BookingWorkflowDto {
  const record = bookingFixture(false);
  record.booking.status = 'pending';
  record.booking.className = '12A1';
  record.booking.startAt = '2026-10-17T01:00:00.000Z';
  record.booking.endAt = '2026-10-17T09:00:00.000Z';
  record.workflow.lifecycle = 'intake';
  record.workflow.quote = null;
  record.workflow.payments = null;
  record.workflow.paymentInstructions = null;
  record.workflow.paymentReady = false;
  return record;
}

function rentalFixture(status = 'confirmed'): RentalOrder {
  return {
    _id: 'rental-1',
    version: 6,
    status,
    contactName: 'Khách thuê thử',
    phone: '0901234567',
    note: 'Ghi chú thuê',
    requestedLines: [{ costumeId: 'costume-1', name: 'Áo dài', size: 'M', quantity: 2 }],
    requestedReceiveDate: futureDate(),
    requestedReturnDate: futureDate(),
    quote: {
      version: 2,
      lines: [
        { costumeId: 'costume-1', name: 'Áo dài', size: 'M', quantity: 2, unitPrice: 100000 },
      ],
      receiveDate: futureDate(),
      returnDate: futureDate(),
      fee: 200000,
      deposit: 500000,
      terms: ['Giá áp dụng cả kỳ thuê'],
      ...(status === 'quoting' ? {} : { acceptedAt: '2026-10-01T08:00:00.000Z' }),
    },
    quoteHistory: [],
    payment: { netReceived: 700000, payable: 700000, due: 0, refundDue: 0 },
    payments: [],
    readyForHandover: true,
    returns: [],
    change: null,
    events: [],
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function Location() {
  const location = useLocation();
  return <p data-testid="destination">{location.pathname + location.search}</p>;
}

function renderPage(page: ReactNode, path: string, route: string, customer = true) {
  return render(
    <CustomerAppearanceContext.Provider value={customer}>
      <div className={customer ? 'customer-ui customer-tokens' : undefined}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={page} />
            <Route path="/login" element={<Location />} />
            <Route path="/account/bookings" element={<Location />} />
            <Route path="/account/rentals/:id" element={<Location />} />
          </Routes>
        </MemoryRouter>
      </div>
    </CustomerAppearanceContext.Provider>,
  );
}
const renderBooking = (customer = true) =>
  renderPage(
    <BookingWorkflowDetailPage />,
    '/account/bookings/booking-1',
    '/account/bookings/:id',
    customer,
  );
const renderRental = (customer = true) =>
  renderPage(<RentalDetailPage />, '/rentals/rental-1', '/rentals/:id', customer);
const apiFailure = (message: string) => ({ response: { status: 409, data: { message } } });

describe('Customer order presentation preserves workflow contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.auth.user = { _id: 'client-1', name: 'Khách thử', roles: [6] };
    let sequence = 0;
    mocks.requestId.mockImplementation(() => 'action-' + ++sequence);
    mocks.workflowGet.mockResolvedValue(bookingFixture());
    mocks.legacyGet.mockResolvedValue(null);
    mocks.photographers.mockResolvedValue([]);
    mocks.rentalGet.mockResolvedValue(rentalFixture());
    mocks.catalog.mockResolvedValue([
      {
        _id: 'costume-1',
        name: 'Áo dài',
        sizes: ['M', 'L'],
        rentalPrice: 100000,
        rentalDailyPrice: 100000,
        availableBySize: { M: 4, L: 2 },
        rentalDays: 1,
      },
    ]);
    mocks.rentalCreate.mockResolvedValue({ _id: 'created-rental' });
  });

  it('keeps an intake request informational with one back link and no quote or payment actions', async () => {
    const record = intakeFixture();
    record.booking.endAt = '2026-10-18T03:00:00.000Z';
    record.booking.pricePerMember = 750000;
    mocks.workflowGet.mockResolvedValue(record);
    const { container } = renderBooking();
    await screen.findByRole('heading', { name: 'Yêu cầu của lớp 12A1' });
    expect(container.querySelector('.customer-booking-intake')).toHaveTextContent('18/10/2026');
    expect(
      screen.getByText('Yêu cầu đang chờ studio xem xét. Thời gian đề xuất chưa giữ lịch.'),
    ).toBeInTheDocument();
    const back = screen.getByRole('link', { name: /Quay lại danh sách/ });
    expect(screen.getAllByRole('link', { name: /Quay lại danh sách/ })).toHaveLength(1);
    expect(back).toHaveAttribute('href', '/account/bookings');
    expect(screen.getAllByRole('button', { name: 'Tải lại hồ sơ' })).toHaveLength(1);
    expect(screen.queryByText(/Phiên bản hồ sơ|₫/)).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Chi tiết báo giá' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Thanh toán và đối soát' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /Tôi đồng ý báo giá|Ghi nhận giao dịch|Gửi yêu cầu cho studio|Hủy/,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Loại yêu cầu')).not.toBeInTheDocument();
    fireEvent.click(back);
    expect(await screen.findByTestId('destination')).toHaveTextContent('/account/bookings');
    expect(mocks.workflowAct).not.toHaveBeenCalled();
  });

  it('handles missing intake fields and timestamps, then shows only real merged events in Vietnam time', async () => {
    const empty = intakeFixture();
    delete empty.booking.className;
    delete empty.booking.school;
    delete empty.booking.contactName;
    delete empty.booking.phone;
    delete empty.booking.note;
    const updated = intakeFixture();
    updated.workflow.createdAt = '2026-10-12T02:00:00.000Z';
    updated.workflow.events = [
      {
        action: 'intake.updated',
        message: 'Studio đã nhận thông tin bổ sung của lớp.',
        at: '2026-10-12T09:30:00.000Z',
      },
    ];
    mocks.workflowGet.mockResolvedValueOnce(empty).mockResolvedValue(updated);
    mocks.legacyGet
      .mockRejectedValueOnce(apiFailure('Không tải được hồ sơ ban đầu'))
      .mockResolvedValue({
        ...updated.booking,
        createdAt: '2026-10-12T01:30:00.000Z',
        events: [{ message: 'Lớp đã gửi yêu cầu chụp.', at: '2026-10-12T08:00:00.000Z' }],
      });
    renderBooking();
    await screen.findByText('Yêu cầu đang chờ studio xem xét. Thời gian đề xuất chưa giữ lịch.');
    expect(screen.getAllByText('Chưa cập nhật').length).toBeGreaterThan(0);
    expect(screen.getByText('Chưa có cập nhật trong quy trình.')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date|undefined|NaN/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại hồ sơ' }));
    const latest = await screen.findByText('Studio đã nhận thông tin bổ sung của lớp.');
    const earlier = screen.getByText('Lớp đã gửi yêu cầu chụp.');
    expect(latest.compareDocumentPosition(earlier) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(latest.closest('li')).toHaveTextContent(/12\/10\/2026\s*·\s*16:30/);
    expect(earlier.closest('li')).toHaveTextContent(/12\/10\/2026\s*·\s*15:00/);
    expect(
      within(screen.getByRole('region', { name: 'Thông tin yêu cầu' })).getByText(
        /12\/10\/2026\s*·\s*08:30/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Chưa có cập nhật trong quy trình.')).not.toBeInTheDocument();
    expect(mocks.workflowAct).not.toHaveBeenCalled();
  });

  it('leaves intake presentation after refresh and keeps the existing active quote consent contract', async () => {
    const fresh = bookingFixture(false);
    fresh.workflow.version = 8;
    fresh.workflow.quote!.version = 3;
    mocks.workflowGet.mockResolvedValueOnce(intakeFixture()).mockResolvedValue(fresh);
    const accepted = bookingFixture();
    accepted.workflow.version = 9;
    accepted.workflow.quote!.version = 3;
    mocks.workflowAct.mockResolvedValue(accepted);
    const { container } = renderBooking();
    await screen.findByRole('heading', { name: 'Yêu cầu của lớp 12A1' });
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại hồ sơ' }));
    const consent = await screen.findByRole('button', { name: 'Tôi đồng ý báo giá phiên bản 3' });
    expect(container.querySelector('.customer-booking-intake')).toBeNull();
    expect(screen.getByRole('table', { name: 'Chi tiết báo giá' })).toBeInTheDocument();
    expect(mocks.workflowGet).toHaveBeenCalledTimes(2);
    expect(mocks.workflowAct).not.toHaveBeenCalled();
    fireEvent.click(consent);
    await waitFor(() =>
      expect(mocks.workflowAct).toHaveBeenCalledWith(
        'booking-1',
        8,
        'quote.accept',
        {},
        'action-1',
      ),
    );
  });

  it('keeps pending admin requests on the legacy approval form and its required feedback gate', async () => {
    mocks.auth.user = { _id: 'admin-1', name: 'Admin', roles: [0] };
    mocks.workflowGet.mockResolvedValue(intakeFixture());
    const { container } = renderBooking(false);
    await screen.findByRole('heading', { name: 'Xét duyệt yêu cầu ban đầu' });
    expect(container.querySelector('.customer-booking-intake')).toBeNull();
    expect(container.querySelector('main')).toHaveClass('max-w-6xl');
    const feedback = screen.getByLabelText('Phản hồi cho khách');
    expect(feedback.tagName).toBe('TEXTAREA');
    expect(feedback).not.toHaveClass('customer-control');
    const approve = screen.getByRole('button', { name: 'Duyệt yêu cầu' });
    const reject = screen.getByRole('button', { name: 'Từ chối' });
    expect(approve).toBeDisabled();
    expect(reject).toBeDisabled();
    fireEvent.change(feedback, { target: { value: 'Studio đã nhận yêu cầu của lớp.' } });
    expect(approve).toBeEnabled();
    expect(reject).toBeEnabled();
    expect(mocks.workflowAct).not.toHaveBeenCalled();
  });

  it('keeps quote quantity/unit/total and payment data readable in the customer table', async () => {
    renderBooking();
    const table = await screen.findByRole('table', { name: 'Chi tiết báo giá' });
    expect(within(table).getByRole('cell', { name: '2' })).toHaveAttribute(
      'data-label',
      'Số lượng',
    );
    expect(within(table).getByRole('cell', { name: '750.000 ₫' })).toHaveAttribute(
      'data-label',
      'Đơn giá',
    );
    expect(within(table).getAllByRole('cell', { name: '1.500.000 ₫' })[0]).toHaveAttribute(
      'data-label',
      'Thành tiền',
    );
    expect(screen.getByText('Cọc cần có')).toBeInTheDocument();
    expect(screen.getByText('Đã hoàn')).toBeInTheDocument();
    expect(screen.getByText('1.000.000 ₫')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ghi nhận thanh toán' })).not.toBeInTheDocument();
    expect(mocks.workflowAct).not.toHaveBeenCalled();
  });

  it('sends a changed VN schedule with the existing version and trimmed values', async () => {
    const updated = bookingFixture();
    updated.workflow.changeRequest = {
      _id: 'change-1',
      kind: 'change',
      status: 'requested',
      priceDelta: 0,
      terms: [],
      at: '2026-10-01T08:00:00.000Z',
    };
    mocks.workflowAct.mockResolvedValue(updated);
    renderBooking();
    await screen.findByRole('heading', { name: 'Lớp 12A' });
    const day = futureDate();
    fireEvent.change(screen.getByLabelText('Ngày mong muốn'), { target: { value: day } });
    fireEvent.change(screen.getByLabelText('Bắt đầu'), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText('Kết thúc'), { target: { value: '12:30' } });
    fireEvent.change(screen.getByLabelText('Địa điểm mới'), {
      target: { value: '  Ngoại cảnh  ' },
    });
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: '  Lịch thi đổi  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu cho studio' }));
    await waitFor(() =>
      expect(mocks.workflowAct).toHaveBeenCalledWith(
        'booking-1',
        7,
        'change.request',
        {
          kind: 'change',
          note: 'Lịch thi đổi',
          proposed: {
            schedule: {
              shootDate: new Date(day + 'T00:00:00+07:00').toISOString(),
              startTime: '11:00',
              endTime: '12:30',
              location: 'Ngoại cảnh',
            },
          },
        },
        'action-1',
      ),
    );
    expect(mocks.workflowAct).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Lý do')).not.toBeInTheDocument();
  });

  it('displays the supplied quote total independently of line sums and keeps the existing nonfinite fallback', async () => {
    const record = bookingFixture();
    record.workflow.quote!.total = 9876543210;
    record.workflow.quote!.lines = [
      { label: 'Giá chưa xác định', quantity: 2, unitPrice: Number.NaN },
    ];
    record.workflow.payments!.totalDue = 0;
    mocks.workflowGet.mockResolvedValue(record);
    renderBooking();
    const table = await screen.findByRole('table', { name: 'Chi tiết báo giá' });
    expect(within(table).getAllByRole('cell', { name: '0 ₫' })).toHaveLength(2);
    expect(within(table).getByRole('cell', { name: '9.876.543.210 ₫' })).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(mocks.workflowAct).not.toHaveBeenCalled();
  });

  it('blocks duplicate cancellation clicks while pending and keeps the key for unchanged retries', async () => {
    const pending = deferred<BookingWorkflowDto>();
    mocks.workflowAct
      .mockReturnValueOnce(pending.promise)
      .mockRejectedValue(apiFailure('Tạm thời chưa xử lý'));
    renderBooking();
    await screen.findByRole('heading', { name: 'Lớp 12A' });
    fireEvent.change(screen.getByLabelText('Loại yêu cầu'), { target: { value: 'cancel' } });
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: '  Hủy vì lịch thi  ' } });
    expect(screen.queryByLabelText('Ngày mong muốn')).not.toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Gửi yêu cầu cho studio' });
    fireEvent.click(send);
    expect(send).toBeDisabled();
    fireEvent.click(send);
    expect(mocks.workflowAct).toHaveBeenCalledTimes(1);
    expect(mocks.workflowAct).toHaveBeenLastCalledWith(
      'booking-1',
      7,
      'change.request',
      { kind: 'cancel', note: 'Hủy vì lịch thi', proposed: {} },
      'action-1',
    );
    await act(async () => {
      pending.reject(apiFailure('Tạm thời chưa xử lý'));
    });
    await screen.findByRole('alert');
    fireEvent.click(send);
    await waitFor(() => expect(send).toBeEnabled());
    expect(mocks.workflowAct).toHaveBeenLastCalledWith(
      'booking-1',
      7,
      'change.request',
      { kind: 'cancel', note: 'Hủy vì lịch thi', proposed: {} },
      'action-1',
    );
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Lý do khác' } });
    fireEvent.click(send);
    await waitFor(() => expect(mocks.workflowAct).toHaveBeenCalledTimes(3));
    expect(mocks.workflowAct.mock.calls[2][4]).toBe('action-2');
  });

  it('shows a stale quote failure without optimistic consent, then reloads the current workflow version', async () => {
    const old = bookingFixture(false),
      fresh = bookingFixture(false);
    fresh.workflow.version = 8;
    fresh.workflow.quote!.version = 3;
    mocks.workflowGet.mockResolvedValueOnce(old).mockResolvedValue(fresh);
    mocks.workflowAct.mockRejectedValueOnce(apiFailure('Báo giá đã thay đổi'));
    renderBooking();
    fireEvent.click(await screen.findByRole('button', { name: 'Tôi đồng ý báo giá phiên bản 2' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Báo giá đã thay đổi');
    expect(screen.getByRole('button', { name: 'Tôi đồng ý báo giá phiên bản 2' })).toBeEnabled();
    expect(mocks.workflowAct).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại hồ sơ' }));
    const accepted = bookingFixture(true);
    accepted.workflow.version = 9;
    accepted.workflow.quote!.version = 3;
    mocks.workflowAct.mockResolvedValue(accepted);
    fireEvent.click(await screen.findByRole('button', { name: 'Tôi đồng ý báo giá phiên bản 3' }));
    await waitFor(() =>
      expect(mocks.workflowAct.mock.calls[1].slice(0, 4)).toEqual([
        'booking-1',
        8,
        'quote.accept',
        {},
      ]),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Tôi đồng ý báo giá phiên bản/ }),
      ).not.toBeInTheDocument(),
    );
  });

  it('accepts only the active change request once while preserving its consent gate', async () => {
    const record = bookingFixture();
    record.workflow.changeRequest = {
      _id: 'change-current',
      kind: 'cancel',
      status: 'proposed',
      priceDelta: -1000000,
      finalPayable: 500000,
      refundDue: 0,
      terms: ['Điều kiện hủy'],
      at: '2026-10-01T08:00:00.000Z',
    };
    mocks.workflowGet.mockResolvedValue(record);
    const pending = deferred<BookingWorkflowDto>();
    mocks.workflowAct.mockReturnValue(pending.promise);
    renderBooking();
    const accept = await screen.findByRole('button', { name: 'Đồng ý đề xuất' });
    fireEvent.click(accept);
    fireEvent.click(accept);
    expect(accept).toBeDisabled();
    expect(mocks.workflowAct).toHaveBeenCalledTimes(1);
    expect(mocks.workflowAct).toHaveBeenLastCalledWith(
      'booking-1',
      7,
      'change.accept',
      { requestId: 'change-current' },
      'action-1',
    );
    record.workflow.changeRequest.status = 'applied';
    await act(async () => pending.resolve({ ...record, workflow: { ...record.workflow } }));
    expect(screen.queryByRole('button', { name: 'Đồng ý đề xuất' })).not.toBeInTheDocument();
  });

  it('retains legacy admin fields and native controls outside customer appearance', async () => {
    mocks.auth.user = { _id: 'admin-1', name: 'Admin', roles: [0] };
    mocks.workflowGet.mockResolvedValue(bookingFixture(false));
    const { container } = renderBooking(false);
    await screen.findByRole('heading', { name: 'Lớp 12A' });
    expect(container.querySelector('main')).toHaveClass('max-w-6xl');
    expect(screen.getByLabelText('Ngày chụp (giờ Việt Nam)')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Ngày chụp (giờ Việt Nam)')).not.toHaveClass('customer-control');
    expect(screen.getByRole('button', { name: 'Gửi phiên bản báo giá mới' })).not.toHaveClass(
      'customer-button',
    );
    expect(screen.queryByRole('button', { name: /Tôi đồng ý báo giá/ })).not.toBeInTheDocument();
    expect(container.querySelector('[class*="customer-order-"]')).toBeNull();
  });

  it('keeps rental size/quantity/period prices and both due and refund rows including zero', async () => {
    renderRental();
    await screen.findByRole('heading', { name: 'Khách thuê thử' });
    expect(screen.getAllByText('Áo dài · cỡ M · 2 món')).toHaveLength(2);
    expect(screen.getByText(/Đơn giá kỳ thuê ban đầu:/)).toHaveTextContent('100.000 ₫');
    expect(screen.getByText('Còn thu')).toBeInTheDocument();
    expect(screen.getByText('Cần hoàn')).toBeInTheDocument();
    expect(screen.getAllByText('0 ₫')).toHaveLength(2);
    expect(mocks.rentalAct).not.toHaveBeenCalled();
  });

  it('submits an extension with its native date and suppresses repeated clicks while pending', async () => {
    const order = rentalFixture('checked_out');
    mocks.rentalGet.mockResolvedValue(order);
    const pending = deferred<RentalOrder>();
    mocks.rentalAct.mockReturnValue(pending.promise);
    renderRental();
    await screen.findByRole('heading', { name: 'Khách thuê thử' });
    fireEvent.change(screen.getByLabelText('Ngày trả gia hạn'), {
      target: { value: futureDate() },
    });
    fireEvent.change(screen.getByLabelText('Lý do thay đổi đơn thuê'), {
      target: { value: '  Thêm buổi diễn  ' },
    });
    const send = screen.getByRole('button', { name: 'Gửi yêu cầu thay đổi đơn thuê' });
    fireEvent.click(send);
    fireEvent.click(send);
    expect(send).toBeDisabled();
    expect(mocks.rentalAct).toHaveBeenCalledTimes(1);
    expect(mocks.rentalAct).toHaveBeenLastCalledWith(
      'rental-1',
      6,
      'change.request',
      { kind: 'extend', note: 'Thêm buổi diễn', returnDate: futureDate() },
      'action-1',
    );
    order.change = {
      _id: 'extend-1',
      kind: 'extend',
      status: 'requested',
      note: 'Thêm buổi diễn',
      terms: [],
      returnDate: futureDate(),
    };
    await act(async () => pending.resolve({ ...order }));
    expect(
      screen.queryByRole('button', { name: 'Gửi yêu cầu thay đổi đơn thuê' }),
    ).not.toBeInTheDocument();
  });

  it('cancels before handover without an extension date and preserves keys across failure/retry', async () => {
    mocks.rentalGet.mockResolvedValue(rentalFixture('awaiting_deposit'));
    mocks.rentalAct.mockRejectedValue(apiFailure('Chưa gửi được yêu cầu'));
    renderRental();
    await screen.findByRole('heading', { name: 'Khách thuê thử' });
    expect(screen.queryByLabelText('Ngày trả gia hạn')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Lý do thay đổi đơn thuê'), {
      target: { value: '  Hủy trước giao  ' },
    });
    const send = screen.getByRole('button', { name: 'Gửi yêu cầu thay đổi đơn thuê' });
    fireEvent.click(send);
    await screen.findByRole('alert');
    fireEvent.click(send);
    await waitFor(() => expect(send).toBeEnabled());
    expect(mocks.rentalAct).toHaveBeenCalledTimes(2);
    expect(mocks.rentalAct).toHaveBeenLastCalledWith(
      'rental-1',
      6,
      'change.request',
      { kind: 'cancel', note: 'Hủy trước giao' },
      'action-1',
    );
    fireEvent.change(screen.getByLabelText('Lý do thay đổi đơn thuê'), {
      target: { value: 'Lý do mới' },
    });
    fireEvent.click(send);
    await waitFor(() => expect(mocks.rentalAct).toHaveBeenCalledTimes(3));
    expect(mocks.rentalAct.mock.calls[2][4]).toBe('action-2');
  });

  it('uses the refreshed rental quote version after a stale failure and never consents automatically', async () => {
    const old = rentalFixture('quoting'),
      fresh = rentalFixture('quoting');
    fresh.version = 7;
    fresh.quote!.version = 3;
    mocks.rentalGet.mockResolvedValueOnce(old).mockResolvedValue(fresh);
    mocks.rentalAct.mockRejectedValueOnce(apiFailure('Phiên bản đã thay đổi'));
    renderRental();
    fireEvent.click(await screen.findByRole('button', { name: 'Tôi đồng ý báo giá thuê 2' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Phiên bản đã thay đổi');
    expect(mocks.rentalAct).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại đơn thuê' }));
    const accepted = rentalFixture('awaiting_deposit');
    accepted.version = 8;
    accepted.quote!.version = 3;
    mocks.rentalAct.mockResolvedValue(accepted);
    fireEvent.click(await screen.findByRole('button', { name: 'Tôi đồng ý báo giá thuê 3' }));
    await waitFor(() =>
      expect(mocks.rentalAct).toHaveBeenLastCalledWith(
        'rental-1',
        7,
        'quote.accept',
        { quoteVersion: 3 },
        'action-2',
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Tôi đồng ý báo giá thuê/ }),
      ).not.toBeInTheDocument(),
    );
  });

  it('accepts an extension proposal using the active change id without recalculating its final fee', async () => {
    const order = rentalFixture('checked_out');
    order.quote!.fee = 250000;
    order.change = {
      _id: 'extend-current',
      kind: 'extend',
      status: 'proposed',
      finalFee: 350000,
      note: 'Gia hạn',
      terms: ['Giá cuối'],
      returnDate: futureDate(),
    };
    mocks.rentalGet.mockResolvedValue(order);
    const pending = deferred<RentalOrder>();
    mocks.rentalAct.mockReturnValue(pending.promise);
    renderRental();
    const accept = await screen.findByRole('button', { name: 'Đồng ý thay đổi đơn thuê' });
    expect(screen.getByText(/Phí gia hạn đã đồng ý:/)).toHaveTextContent('50.000 ₫');
    expect(screen.getByText(/Phí thuê cuối cùng:/)).toHaveTextContent('350.000 ₫');
    fireEvent.click(accept);
    fireEvent.click(accept);
    expect(mocks.rentalAct).toHaveBeenCalledTimes(1);
    expect(mocks.rentalAct).toHaveBeenLastCalledWith(
      'rental-1',
      6,
      'change.accept',
      { changeId: 'extend-current' },
      'action-1',
    );
    order.change.status = 'applied';
    await act(async () => pending.resolve({ ...order }));
    expect(
      screen.queryByRole('button', { name: 'Đồng ý thay đổi đơn thuê' }),
    ).not.toBeInTheDocument();
  });

  it('keeps new rental drafts through a guest login redirect and reuses a failed submission key', async () => {
    mocks.auth.user = null;
    const rentalPath = `/rental/start?item=costume-1&receiveDate=${futureDate()}&returnDate=${futureDate()}`;
    const first = renderPage(<NewRentalPage />, rentalPath, '/rental/start');
    expect(document.querySelector('input[type="date"]')).toBeNull();
    await screen.findByLabelText('Mẫu thuê 1');
    fireEvent.change(screen.getByLabelText('Kích cỡ 1'), { target: { value: 'M' } });
    fireEvent.change(screen.getByLabelText('Số lượng 1'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Người liên hệ'), {
      target: { value: '  Khách thuê  ' },
    });
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0901234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại yêu cầu thuê' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập để gửi yêu cầu thuê' }));
    expect(await screen.findByTestId('destination')).toHaveTextContent(
      '/login?returnTo=' +
        encodeURIComponent(
          `/rental/start?item=costume-1&receiveDate=${futureDate()}&returnDate=${futureDate()}`,
        ),
    );
    expect(JSON.parse(sessionStorage.getItem(RENTAL_DRAFT_KEY)!)).toMatchObject({
      preview: true,
      lines: [{ costumeId: 'costume-1', size: 'M', quantity: '2' }],
    });
    first.unmount();
    mocks.auth.user = { _id: 'client-1', name: 'Khách thuê', roles: [6] };
    const pending = deferred<RentalOrder>();
    mocks.rentalCreate
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ _id: 'created-rental' });
    renderPage(<NewRentalPage />, rentalPath, '/rental/start');
    const send = await screen.findByRole('button', { name: 'Gửi yêu cầu thuê' });
    fireEvent.click(send);
    fireEvent.click(send);
    expect(mocks.rentalCreate).toHaveBeenCalledTimes(1);
    await act(async () => pending.reject(apiFailure('Gửi thất bại')));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu thuê' }));
    await screen.findByTestId('destination');
    expect(mocks.rentalCreate).toHaveBeenCalledTimes(2);
    expect(mocks.rentalCreate).toHaveBeenLastCalledWith(
      {
        contactName: 'Khách thuê',
        phone: '0901234567',
        note: '',
        receiveDate: futureDate(),
        returnDate: futureDate(),
        lines: [{ costumeId: 'costume-1', size: 'M', quantity: 2 }],
      },
      'action-1',
    );
    expect(sessionStorage.getItem(RENTAL_DRAFT_KEY)).toBeNull();
  });
});

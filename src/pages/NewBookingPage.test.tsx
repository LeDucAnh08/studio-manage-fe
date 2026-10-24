import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { packageService } from '../services/packageService';
import { bookingService } from '../services/bookingService';
import { BOOKING_DRAFT_KEY } from '../services/bookingDraft';
import { NewBookingPage } from './BookingsPage';

const { auth } = vi.hoisted(() => ({
  auth: {
    user: { _id: 'client-1', name: 'Khách thử', roles: [6] } as {
      _id: string;
      name: string;
      roles: number[];
    } | null,
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => auth,
}));

vi.mock('../services/packageService', () => ({
  packageService: { listPublic: vi.fn() },
}));

vi.mock('../services/bookingService', () => ({
  bookingLabels: { pending: 'Chờ duyệt', approved: 'Đã duyệt yêu cầu', rejected: 'Đã từ chối' },
  bookingService: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    review: vi.fn(),
    notifications: vi.fn(),
    read: vi.fn(),
  },
}));

const vnDateTimeInput = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};

const futureWindow = (days = 30, hours = 2) => {
  const start = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  start.setSeconds(0, 0);
  return {
    start: vnDateTimeInput(start),
    end: vnDateTimeInput(new Date(start.getTime() + hours * 60 * 60 * 1000)),
  };
};

function RouteDestination() {
  const location = useLocation();
  return (
    <>
      <p data-testid="destination">{location.pathname + location.search + location.hash}</p>
      <p data-testid="destination-state">{JSON.stringify(location.state)}</p>
    </>
  );
}

async function choosePackage() {
  await screen.findByRole('heading', { name: 'Chọn gói chụp phù hợp' });
  fireEvent.click(screen.getAllByRole('button', { name: 'Chọn gói' })[0]);
  fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }));
  await screen.findByRole('heading', { name: 'Cho Yume biết về lớp mình' });
}

function fillDetails(options: { endDays?: number } = {}) {
  const { start, end } = futureWindow(30);
  const endValue = options.endDays
    ? vnDateTimeInput(
        new Date(Date.parse(`${start}:00+07:00`) + options.endDays * 24 * 60 * 60 * 1000),
      )
    : end;
  fireEvent.change(screen.getByLabelText('Tên lớp / nhóm'), { target: { value: '12A1' } });
  fireEvent.change(screen.getByLabelText('Trường'), { target: { value: 'THPT Yume' } });
  fireEvent.change(screen.getByLabelText('Họ tên người liên hệ'), {
    target: { value: 'Khách thử' },
  });
  fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0901234567' } });
  fireEvent.change(screen.getByLabelText('Số thành viên dự kiến'), { target: { value: '30' } });
  fireEvent.change(screen.getByLabelText('Địa điểm mong muốn'), { target: { value: 'Hà Nội' } });
  fireEvent.change(screen.getByLabelText('Ngày và giờ bắt đầu mong muốn (giờ Việt Nam)'), {
    target: { value: start },
  });
  fireEvent.change(screen.getByLabelText('Ngày và giờ kết thúc mong muốn (giờ Việt Nam)'), {
    target: { value: endValue },
  });
  return { start, end: endValue };
}

async function reviewRequest() {
  fireEvent.click(screen.getByRole('button', { name: /Xem lại yêu cầu/ }));
  await screen.findByRole('heading', { name: 'Kiểm tra trước khi gửi' });
}

describe('NewBookingPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    auth.user = { _id: 'client-1', name: 'Khách thử', roles: [6] };
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.mocked(packageService.listPublic).mockResolvedValue([
      { _id: 'package-1', name: 'Gói thử', pricePerMember: 500_000 },
      { _id: 'package-2', name: 'Gói nâng cao', pricePerMember: 700_000 },
      { _id: 'package-3', name: 'Gói trọn bộ', pricePerMember: 900_000 },
      { _id: 'package-4', name: 'Gói bổ sung', pricePerMember: 1_100_000 },
    ]);
    vi.mocked(bookingService.create).mockResolvedValue({ _id: 'booking-1' });
  });

  it('keeps discovery context and package comparison while collecting class and VN schedule details', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/booking/start?source=portfolio&package=package-1&concept=Vintage&item=costume-1&itemName=Áo%20dài',
        ]}
      >
        <NewBookingPage />
      </MemoryRouter>,
    );

    await screen.findByText('Concept tham khảo: Vintage');
    expect(
      screen.queryByRole('navigation', { name: 'Khám phá và tài khoản' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dịch vụ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Concept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Bảng giá' })).not.toBeInTheDocument();
    const packageStep = screen.getByRole('region', { name: 'Chọn gói chụp phù hợp' });
    const packageCards = within(packageStep).getAllByRole('article');
    expect(packageCards).toHaveLength(4);
    expect(
      within(packageCards[3]).getByRole('heading', { name: 'Gói bổ sung' }),
    ).toBeInTheDocument();
    packageCards
      .slice(0, 3)
      .forEach((card) =>
        fireEvent.click(within(card).getByRole('button', { name: 'So sánh gói' })),
      );
    expect(screen.getByRole('heading', { name: 'So sánh gói dịch vụ' })).toBeInTheDocument();
    fireEvent.click(within(packageCards[3]).getByRole('button', { name: 'So sánh gói' }));
    expect(
      await screen.findByText('Bạn có thể so sánh tối đa 3 gói cùng lúc.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đang chọn' }));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }));

    const times = fillDetails();
    await reviewRequest();
    expect(screen.getByText('12A1')).toBeInTheDocument();
    expect(screen.getByText('THPT Yume')).toBeInTheDocument();
    const readableContext = 'Trang phục/phụ kiện tham khảo: Áo dài';
    expect(
      within(screen.getByRole('complementary', { name: 'Bạn đang tham khảo' })).getByText(
        readableContext,
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Kiểm tra trước khi gửi' })).getByText(
        readableContext,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/mã costume-1/)).not.toBeInTheDocument();
    expect(screen.queryByText('Nguồn: Trang giới thiệu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sửa thông tin' }));
    expect(screen.getByLabelText('Tên lớp / nhóm')).toHaveValue('12A1');
    expect(screen.getByLabelText('Ngày và giờ bắt đầu mong muốn (giờ Việt Nam)')).toHaveValue(
      times.start,
    );
    fireEvent.click(screen.getByRole('button', { name: /Quay lại/ }));
    const comparison = screen.getByRole('region', { name: 'So sánh gói dịch vụ' });
    for (const name of ['Gói thử', 'Gói nâng cao', 'Gói trọn bộ']) {
      expect(within(comparison).getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(
      within(comparison).queryByRole('heading', { name: 'Gói bổ sung' }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Chọn gói chụp phù hợp' })).getAllByRole('article'),
    ).toHaveLength(4);
  });

  it('keeps the guest review draft and return target through sign-in before submitting', async () => {
    auth.user = null;
    const returnTo =
      '/booking/start?source=concepts&concept=Vintage&item=costume-1&itemName=' +
      encodeURIComponent('Áo dài') +
      '#review';
    const guest = render(
      <MemoryRouter initialEntries={[returnTo]}>
        <Routes>
          <Route path="/booking/start" element={<NewBookingPage />} />
          <Route path="*" element={<RouteDestination />} />
        </Routes>
      </MemoryRouter>,
    );

    await choosePackage();
    const { start, end } = fillDetails();
    fireEvent.change(screen.getByLabelText('Điều Yume nên biết thêm'), {
      target: { value: 'Chụp cùng cô chủ nhiệm.' },
    });
    await reviewRequest();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập để gửi' }));

    expect(await screen.findByTestId('destination')).toHaveTextContent('/login');
    expect(screen.getByTestId('destination-state').textContent).toBe(
      JSON.stringify({ from: returnTo }),
    );
    expect(bookingService.create).not.toHaveBeenCalled();
    const saved = JSON.parse(sessionStorage.getItem(BOOKING_DRAFT_KEY) || 'null');
    expect(saved).toMatchObject({
      ownerId: null,
      step: 3,
      packageId: 'package-1',
      className: '12A1',
      school: 'THPT Yume',
      contactName: 'Khách thử',
      members: 30,
      startAt: start,
      endAt: end,
      source: 'concepts',
      concept: 'Vintage',
      itemId: 'costume-1',
      itemName: 'Áo dài',
      note: 'Chụp cùng cô chủ nhiệm.',
    });

    guest.unmount();
    auth.user = { _id: 'client-1', name: 'Khách thử', roles: [6] };
    render(
      <MemoryRouter initialEntries={[returnTo]}>
        <Routes>
          <Route path="/booking/start" element={<NewBookingPage />} />
          <Route path="*" element={<RouteDestination />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Kiểm tra trước khi gửi' });
    const review = screen.getByRole('region', { name: 'Kiểm tra trước khi gửi' });
    await within(review).findByText('Gói thử');
    for (const text of ['12A1', 'THPT Yume', 'Gói thử', 'Chụp cùng cô chủ nhiệm.']) {
      expect(within(review).getByText(text)).toBeInTheDocument();
    }
    expect(within(review).getByText('Trang phục/phụ kiện tham khảo: Áo dài')).toBeInTheDocument();
    expect(screen.queryByText(/mã costume-1/)).not.toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Gửi yêu cầu tới Yume' });
    await waitFor(() => expect(submit).toBeEnabled());
    expect(bookingService.create).not.toHaveBeenCalled();
    fireEvent.click(submit);

    await waitFor(() => expect(bookingService.create).toHaveBeenCalledTimes(1));
    const [payload, key] = vi.mocked(bookingService.create).mock.calls[0];
    expect(key).toBe(saved.idempotencyKey);
    expect(payload).toMatchObject({
      packageId: 'package-1',
      className: '12A1',
      school: 'THPT Yume',
      contactName: 'Khách thử',
      members: 30,
      startAt: new Date(`${start}:00+07:00`).toISOString(),
      endAt: new Date(`${end}:00+07:00`).toISOString(),
    });
    expect(payload.note).toContain('Trang phục/phụ kiện tham khảo: Áo dài (mã costume-1)');
    expect(payload.note).toContain('Nguồn: Concept');
    expect(payload.note).toContain('Chụp cùng cô chủ nhiệm.');
    expect(await screen.findByTestId('destination')).toHaveTextContent(
      '/account/bookings/booking-1',
    );
    expect(sessionStorage.getItem(BOOKING_DRAFT_KEY)).toBeNull();
  });

  it('allows a booking 30 days ahead, sends class details, and reuses the key only for an unchanged retry', async () => {
    vi.mocked(bookingService.create)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({ _id: 'booking-1' });
    render(
      <MemoryRouter initialEntries={['/account/bookings/new']}>
        <NewBookingPage />
      </MemoryRouter>,
    );

    await choosePackage();
    const { start, end } = fillDetails();
    await reviewRequest();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu tới Yume' }));
    await screen.findByRole('alert');
    const first = vi.mocked(bookingService.create).mock.calls[0];

    fireEvent.click(screen.getByRole('button', { name: 'Sửa thông tin' }));
    fireEvent.click(screen.getByRole('button', { name: /Xem lại yêu cầu/ }));
    await screen.findByRole('heading', { name: 'Kiểm tra trước khi gửi' });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu tới Yume' }));
    await waitFor(() => expect(bookingService.create).toHaveBeenCalledTimes(2));
    const second = vi.mocked(bookingService.create).mock.calls[1];
    expect(second[1]).toBe(first[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Sửa thông tin' }));
    fireEvent.change(screen.getByLabelText('Tên lớp / nhóm'), { target: { value: '12A2' } });
    fireEvent.click(screen.getByRole('button', { name: /Xem lại yêu cầu/ }));
    await screen.findByRole('heading', { name: 'Kiểm tra trước khi gửi' });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu tới Yume' }));
    await waitFor(() => expect(bookingService.create).toHaveBeenCalledTimes(3));

    const [payload, thirdKey] = vi.mocked(bookingService.create).mock.calls[2];
    expect(payload).toMatchObject({
      packageId: 'package-1',
      className: '12A2',
      school: 'THPT Yume',
      contactName: 'Khách thử',
      phone: '0901234567',
      members: 30,
      location: 'Hà Nội',
    });
    expect(payload.startAt).toBe(new Date(`${start}:00+07:00`).toISOString());
    expect(payload.endAt).toBe(new Date(`${end}:00+07:00`).toISOString());
    expect(first[1]).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
    expect(thirdKey).not.toBe(first[1]);
    await waitFor(() => expect(sessionStorage.getItem('yume.booking-draft.v1')).toBeNull());
  });

  it('rejects a requested time range longer than seven days', async () => {
    render(
      <MemoryRouter initialEntries={['/account/bookings/new']}>
        <NewBookingPage />
      </MemoryRouter>,
    );
    await choosePackage();
    fillDetails({ endDays: 8 });
    fireEvent.click(screen.getByRole('button', { name: /Xem lại yêu cầu/ }));
    expect(
      await screen.findByText('Khoảng thời gian yêu cầu không được dài quá 7 ngày.'),
    ).toBeInTheDocument();
    expect(bookingService.create).not.toHaveBeenCalled();
  });
});

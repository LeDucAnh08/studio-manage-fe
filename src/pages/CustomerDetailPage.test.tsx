import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerDetailPage from './CustomerDetailPage';
import CustomerSizePage from './CustomerSizePage';

const mocks = vi.hoisted(() => ({
  getOne: vi.fn(),
  getStudents: vi.fn(),
  schedules: vi.fn(),
  transactions: vi.fn(),
  auth: { user: { roles: [0] } },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../services/customerService', () => ({ customerService: mocks }));
vi.mock('../services/scheduleService', () => ({ scheduleService: { getAll: mocks.schedules } }));
vi.mock('../services/transactionService', () => ({
  transactionService: { getAll: mocks.transactions },
}));
const roster = {
  source: 'booking',
  students: Array.from({ length: 55 }, (_, index) => ({
    _id: `student-${index}`,
    name: `Học sinh ${index + 1}`,
    contact: '0901234567',
    height: 165,
    weight: 52,
    shirtSize: 'L',
    pantsSize: 'M',
    notes: 'Thông tin từ đơn kỉ yếu',
  })),
};
function ListProbe() {
  const location = useLocation();
  return <h1>Danh sách lớp {location.search}</h1>;
}
function OrderProbe() {
  const location = useLocation();
  return (
    <output data-testid="order-location">
      {location.pathname + JSON.stringify(location.state)}
    </output>
  );
}
function open(path = '/customers/class-1') {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: path, state: { classListReturnTo: '/customers?search=12A&page=2&limit=20' } },
      ]}
    >
      <Routes>
        <Route path="/customers" element={<ListProbe />} />
        <Route path="/customers/size" element={<CustomerSizePage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/workflow-bookings/:id" element={<OrderProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.user = { roles: [0] };
  mocks.getOne.mockResolvedValue({
    _id: 'class-1',
    className: '12A1',
    school: 'Trường A',
    contactName: 'Đại diện lớp',
    total: 55,
  });
  mocks.getStudents.mockResolvedValue(roster);
  mocks.schedules.mockResolvedValue({
    data: [
      {
        _id: 'schedule-1',
        workflowBooking: 'booking-1',
        shootDate: '2026-11-22',
        startTime: '08:00',
        endTime: '12:00',
        location: 'Sân trường',
        leadPhotographer: { name: 'Nguyễn Anh Khoa', username: 'nhiepanh.anhkhoa' },
        supportPhotographers: [{ name: 'Trần Gia Bảo', username: 'nhiepanh.giabao' }],
        status: 'confirmed',
      },
    ],
  });
  mocks.transactions.mockResolvedValue({ data: [] });
});
describe('Merged class and student details', () => {
  it.each(['link', 'row'] as const)(
    'shows full crew names and opens the linked order from its %s',
    async (target) => {
      open();
      const table = await screen.findByRole('table', { name: 'Lịch chụp' });
      expect(within(table).getByText('Chính: Nguyễn Anh Khoa')).toBeInTheDocument();
      expect(within(table).getByText('Hỗ trợ: Trần Gia Bảo')).toBeInTheDocument();
      expect(within(table).queryByText(/nhiepanh\./)).not.toBeInTheDocument();
      fireEvent.click(
        target === 'link'
          ? within(table).getByRole('link', { name: /Xem đơn chụp ngày/ })
          : within(table).getByText('Sân trường'),
      );
      expect(screen.getByTestId('order-location')).toHaveTextContent(
        '/workflow-bookings/booking-1',
      );
      expect(screen.getByTestId('order-location')).toHaveTextContent(
        '"bookingOrdersReturnTo":"/customers/class-1"',
      );
      expect(screen.getByTestId('order-location')).toHaveTextContent(
        '"classListReturnTo":"/customers?search=12A&page=2&limit=20"',
      );
    },
  );
  it.each([2, 4])('does not add yearbook-order access for class-view role %s', async (role) => {
    mocks.auth.user = { roles: [role] };
    open();
    const table = await screen.findByRole('table', { name: 'Lịch chụp' });
    expect(within(table).queryByRole('link')).not.toBeInTheDocument();
    fireEvent.click(within(table).getByText('Sân trường'));
    expect(screen.queryByTestId('order-location')).not.toBeInTheDocument();
  });
  it('uses the username when a name is blank and keeps unlinked legacy schedules as plain rows', async () => {
    mocks.schedules.mockResolvedValue({
      data: [
        {
          _id: 'legacy',
          shootDate: '2026-11-22',
          leadPhotographer: { name: ' ', username: 'legacy.user' },
          supportPhotographers: [],
          status: 'confirmed',
        },
      ],
    });
    open();
    const table = await screen.findByRole('table', { name: 'Lịch chụp' });
    expect(within(table).getByText('Chính: legacy.user')).toBeInTheDocument();
    expect(within(table).queryByRole('link')).not.toBeInTheDocument();
  });
  it('shows booking student fields, paginates all members and returns to the originating list', async () => {
    open();
    const table = await screen.findByRole('table', { name: 'Thông tin học sinh của lớp' });
    expect(mocks.getStudents).toHaveBeenCalledWith('class-1');
    const schedules = await screen.findByRole('table', { name: 'Lịch chụp' });
    expect(within(schedules).getByText('Sân trường')).toBeInTheDocument();
    expect(mocks.transactions).not.toHaveBeenCalled();
    for (const label of ['Tổng thu', 'Tổng chi', 'Lợi nhuận', 'Thu chi'])
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    const row = within(table).getByRole('row', { name: /Học sinh 1 / });
    for (const text of ['0901234567', '165', '52', 'L', 'M', 'Thông tin từ đơn kỉ yếu'])
      expect(within(row).getByText(text)).toBeInTheDocument();
    expect(screen.queryByText('Học sinh 55')).not.toBeInTheDocument();
    const section = screen.getByRole('region', { name: 'Thông tin học sinh' });
    fireEvent.click(within(section).getAllByRole('button', { name: 'Trang sau' })[0]);
    fireEvent.click(within(section).getAllByRole('button', { name: 'Trang sau' })[0]);
    expect(screen.getByText('Học sinh 55')).toBeInTheDocument();
    const back = screen.getByRole('link', { name: 'Danh sách lớp' });
    expect(back).toHaveClass('app-back-link');
    fireEvent.click(back);
    expect(
      screen.getByRole('heading', { name: 'Danh sách lớp ?search=12A&page=2&limit=20' }),
    ).toBeInTheDocument();
  });
  it('keeps the roster visible even if schedules fail, and retries roster errors', async () => {
    mocks.schedules.mockRejectedValue(new Error('Offline'));
    mocks.getStudents.mockRejectedValueOnce(new Error('Offline'));
    open();
    await screen.findByRole('alert');
    expect(screen.getByRole('heading', { name: '12A1' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('table', { name: 'Thông tin học sinh của lớp' });
    expect(mocks.getStudents).toHaveBeenCalledTimes(2);
  });
  it('redirects the old separate student page to the class list', async () => {
    open('/customers/size');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Danh sách lớp' })).toBeInTheDocument(),
    );
    expect(mocks.getOne).not.toHaveBeenCalled();
  });
});

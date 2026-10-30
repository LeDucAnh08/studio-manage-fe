import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BookingWorkflowListPage from './BookingWorkflowListPage';
import { bookingWorkflowService, type WorkflowSummary } from '../services/bookingWorkflowService';

const { auth } = vi.hoisted(() => ({ auth: { user: { _id: 'admin', roles: [0] } } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../services/bookingWorkflowService', () => ({
  bookingWorkflowService: { list: vi.fn() },
}));
vi.mock('./BookingsPage', () => ({
  BookingNotifications: ({ base }: { base: string }) => (
    <a href={`${base}/notice`}>Thông báo yêu cầu</a>
  ),
}));
vi.mock('../components/PhotographerUnavailability', () => ({
  PhotographerUnavailability: ({ admin }: { admin: boolean }) => (
    <p>{admin ? 'Quản lý lịch bận' : 'Lịch bận của tôi'}</p>
  ),
}));
const booking: WorkflowSummary = {
  bookingId: 'booking',
  version: 0,
  lifecycle: 'intake',
  packageName: 'Gói lớp',
  className: '12A1',
  shootDate: '2027-02-01',
  updatedAt: '2026-10-29',
  bookingStatus: 'pending',
};
const response = (data: WorkflowSummary[], total = data.length) => ({
  success: true,
  message: 'OK',
  data,
  pagination: { total, page: 1, limit: 20 },
});
function Probe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname + location.search + JSON.stringify(location.state)}
    </output>
  );
}
function open(path = '/workflow-bookings') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Probe />
      <Routes>
        <Route path="/workflow-bookings" element={<BookingWorkflowListPage />} />
        <Route path="/workflow-bookings/:id" element={<p>Chi tiết đơn</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('unified photography workspace', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.user = { _id: 'admin', roles: [0] };
    vi.mocked(bookingWorkflowService.list).mockResolvedValue(response([booking]));
  });
  it('shows new requests, progress and admin notifications in one workspace', async () => {
    vi.mocked(bookingWorkflowService.list).mockResolvedValue(
      response([
        booking,
        {
          ...booking,
          bookingId: 'confirmed',
          className: '12A2',
          lifecycle: 'confirmed',
          bookingStatus: 'approved',
        },
      ]),
    );
    open();
    expect(screen.getByRole('heading', { name: 'Đơn chụp ảnh' })).toBeInTheDocument();
    await screen.findByRole('heading', { name: '12A1' });
    expect(screen.getAllByText('Chờ duyệt')).toHaveLength(2);
    expect(screen.getByText('Đã chốt lịch')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thông báo yêu cầu' })).toHaveAttribute(
      'href',
      '/workflow-bookings/notice',
    );
    expect(screen.getByText('Quản lý lịch bận')).toBeInTheDocument();
  });
  it('restores filters and pagination from the URL and retains them when opening a record', async () => {
    vi.mocked(bookingWorkflowService.list).mockResolvedValue(
      response([{ ...booking, lifecycle: 'completed', bookingStatus: 'approved' }], 45),
    );
    open('/workflow-bookings?view=completed&page=2');
    await waitFor(() =>
      expect(bookingWorkflowService.list).toHaveBeenLastCalledWith(2, 20, 'completed', ''),
    );
    expect(screen.getByRole('combobox', { name: 'Trạng thái đơn' })).toHaveValue('completed');
    fireEvent.click(await screen.findByRole('link', { name: /12A1/ }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      'bookingOrdersReturnTo":"/workflow-bookings?view=completed&page=2',
    );
  });
  it('filters new requests separately from accepted work without client-side pagination filtering', async () => {
    open('/workflow-bookings?view=pending&page=2');
    await waitFor(() =>
      expect(bookingWorkflowService.list).toHaveBeenLastCalledWith(2, 20, '', 'pending'),
    );
    expect(screen.getByRole('combobox', { name: 'Trạng thái đơn' })).toHaveValue('pending');
    fireEvent.change(screen.getByRole('combobox', { name: 'Trạng thái đơn' }), {
      target: { value: 'active' },
    });
    await waitFor(() =>
      expect(bookingWorkflowService.list).toHaveBeenLastCalledWith(1, 20, 'active', 'approved'),
    );
  });
  it('resets the page on a filter change and ignores stale list responses', async () => {
    let resolveOld!: (value: ReturnType<typeof response>) => void;
    vi.mocked(bookingWorkflowService.list)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValueOnce(
        response([{ ...booking, className: 'Đơn từ chối', bookingStatus: 'rejected' }]),
      );
    open('/workflow-bookings?page=3');
    fireEvent.change(screen.getByRole('combobox', { name: 'Trạng thái đơn' }), {
      target: { value: 'rejected' },
    });
    expect(await screen.findByRole('heading', { name: 'Đơn từ chối' })).toBeInTheDocument();
    await waitFor(() =>
      expect(bookingWorkflowService.list).toHaveBeenLastCalledWith(1, 20, 'rejected', ''),
    );
    resolveOld(response([booking]));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: '12A1' })).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText('Đã từ chối')).toHaveLength(2);
    expect(screen.getByTestId('location')).not.toHaveTextContent('page=3');
  });
  it('preserves staff-specific controls and financial visibility', async () => {
    auth.user = { _id: 'photographer', roles: [3] };
    open();
    await screen.findByRole('heading', { name: '12A1' });
    expect(screen.getByText('Lịch bận của tôi')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Thông báo yêu cầu' })).not.toBeInTheDocument();
    expect(screen.queryByText('Quản lý lịch bận')).not.toBeInTheDocument();
  });
  it('labels automatically cancelled intake as cancelled rather than waiting for review', async () => {
    vi.mocked(bookingWorkflowService.list).mockResolvedValue(
      response([{ ...booking, bookingStatus: 'cancelled', className: 'Đơn quá hạn' }]),
    );
    open('/workflow-bookings?view=cancelled');
    expect(await screen.findByRole('link', { name: /Đơn quá hạn/ })).toHaveTextContent('Đã hủy');
  });
});

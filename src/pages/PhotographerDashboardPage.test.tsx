import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhotographerDashboardPage from './PhotographerDashboardPage';
import {
  photographerDashboardService,
  type PhotographerStats,
} from '../services/photographerDashboardService';
const auth = vi.hoisted(() => ({ user: { _id: 'photo-1', name: 'Lê Minh Đức', roles: [3] } }));
const season = vi.hoisted(() => ({ selectedSeasonId: '' }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../store', () => ({
  useAppSelector: (select: (state: unknown) => unknown) => select({ seasons: season }),
}));
vi.mock('../config/features', () => ({ conceptBookingEnabled: true }));
vi.mock('../services/photographerDashboardService', async (original) => ({
  ...(await original<typeof import('../services/photographerDashboardService')>()),
  photographerDashboardService: { get: vi.fn() },
}));
const fixture: PhotographerStats = {
  from: '2026-11-01',
  to: '2026-11-30',
  now: '2026-11-13T02:00:00Z',
  nextRefreshAt: '2099-01-01',
  counts: { shoots: 14, upcoming: 4, editing: 3, review: 2, completed: 4, overdue: 1 },
  breakdown: { concept: 8, yearbook: 6 },
  chart: [
    { key: '0', label: '1–7', concept: 4, yearbook: 2 },
    { key: '1', label: '8–14', concept: 2, yearbook: 2 },
  ],
  priority: [
    {
      _id: 'concept-1',
      service: 'concept',
      title: 'Chân dung cá nhân',
      packageName: 'Gói chân dung',
      stage: 'editing',
      role: 'lead',
      shootDate: '2026-11-03',
      deadline: null,
      location: 'Studio',
    },
  ],
};
function Probe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname + location.search + JSON.stringify(location.state)}
    </output>
  );
}
function open(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Probe />
      <Routes>
        <Route path="/" element={<PhotographerDashboardPage />} />
        <Route path="/concept-orders/:id" element={<p>Hồ sơ concept</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  season.selectedSeasonId = '';
  auth.user = { _id: 'photo-1', name: 'Lê Minh Đức', roles: [3] };
  vi.mocked(photographerDashboardService.get).mockResolvedValue(fixture);
});
describe('photographer statistics', () => {
  it('renders the approved six metrics, chart and priority queue without nearest shoots or busy-time sections', async () => {
    const { container } = open();
    await screen.findByRole('button', { name: /Buổi chụp trong kỳ/ });
    expect(container.querySelectorAll('.yd-stat')).toHaveLength(6);
    expect(screen.getByRole('heading', { name: 'Khối lượng chụp' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cần xử lý' })).toBeInTheDocument();
    expect(screen.queryByText('Lịch chụp gần nhất')).not.toBeInTheDocument();
    expect(screen.queryByText('Lịch bận của tôi')).not.toBeInTheDocument();
    expect(screen.getByText('Chưa có hạn bàn giao')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Loại dịch vụ' })).toBeInTheDocument();
  });
  it('filters period, service and the globally selected season at the server', async () => {
    open();
    await screen.findByText('Chân dung cá nhân');
    fireEvent.change(screen.getByRole('combobox', { name: 'Loại dịch vụ' }), {
      target: { value: 'concept' },
    });
    await waitFor(() =>
      expect(photographerDashboardService.get).toHaveBeenLastCalledWith(
        expect.objectContaining({ service: 'concept' }),
        expect.any(AbortSignal),
      ),
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Thời gian' }), {
      target: { value: 'previous' },
    });
    await waitFor(() =>
      expect(photographerDashboardService.get).toHaveBeenLastCalledWith(
        expect.objectContaining({ period: 'previous', service: 'concept' }),
        expect.any(AbortSignal),
      ),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('period=previous');
  });
  it('opens a matching metric list, preserves return context for actual order profiles and returns to overview', async () => {
    vi.mocked(photographerDashboardService.get).mockResolvedValue({
      ...fixture,
      detail: { rows: fixture.priority, total: 1, page: 1, limit: 20 },
    });
    open('/?period=previous&service=concept&metric=overdue');
    const link = await screen.findByRole('link', { name: 'Chân dung cá nhân' });
    fireEvent.click(link);
    expect(screen.getByText('Hồ sơ concept')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      'bookingOrdersReturnTo":"/?period=previous&service=concept&metric=overdue',
    );
  });
  it('opens chart drilldown and keeps filters when returning to the overview', async () => {
    open('/?service=concept');
    await screen.findByRole('group', { name: /Số buổi chụp/ });
    fireEvent.click(screen.getByRole('button', { name: '1–7: 6 buổi, 4 concept và 2 kỉ yếu' }));
    await waitFor(() =>
      expect(photographerDashboardService.get).toHaveBeenLastCalledWith(
        expect.objectContaining({ metric: 'group', group: 0, service: 'concept' }),
        expect.any(AbortSignal),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại thống kê' }));
    await screen.findByRole('heading', { name: 'Thống kê của tôi' });
    expect(screen.getByTestId('location')).toHaveTextContent('/?service=concept');
  });
  it('ignores stale responses after a filter change and allows retry after failure', async () => {
    let finish!: (value: PhotographerStats) => void;
    vi.mocked(photographerDashboardService.get)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ...fixture, counts: { ...fixture.counts, shoots: 0 } });
    open();
    fireEvent.change(screen.getByRole('combobox', { name: 'Loại dịch vụ' }), {
      target: { value: 'yearbook' },
    });
    await screen.findByRole('alert');
    await act(async () => finish(fixture));
    expect(screen.queryByRole('button', { name: /Buổi chụp trong kỳ/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('button', { name: /Buổi chụp trong kỳ/ });
  });
});

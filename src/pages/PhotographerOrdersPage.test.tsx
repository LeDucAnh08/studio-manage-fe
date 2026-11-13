import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhotographerOrdersPage from './PhotographerOrdersPage';
import ConceptOrdersPage from './ConceptOrdersPage';
import {
  photographerOrdersService,
  type PhotographerOrder,
} from '../services/photographerOrdersService';

const auth = vi.hoisted(() => ({ user: { _id: 'photo-1', roles: [3] } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../config/features', () => ({ conceptBookingEnabled: true, clientPortalEnabled: true }));
vi.mock('../services/photographerOrdersService', () => ({
  photographerOrdersService: { list: vi.fn() },
}));

const yearbook: PhotographerOrder = {
  _id: 'yearbook-1',
  service: 'yearbook',
  title: '12A1',
  packageName: 'Gói lớp',
  role: 'support',
  stage: 'confirmed',
  shootDate: '2026-11-18T00:30:00Z',
  startTime: '07:30',
  endTime: '11:30',
  updatedAt: '2026-11-13',
};
const concept: PhotographerOrder = {
  ...yearbook,
  _id: 'concept-1',
  service: 'concept',
  title: 'Áo dài',
  packageName: 'Gói chân dung',
  role: 'lead',
};
const response = (data: PhotographerOrder[], total = data.length) => ({
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
        <Route path="/workflow-bookings" element={<PhotographerOrdersPage />} />
        <Route path="/workflow-bookings/:id" element={<p>Hồ sơ kỉ yếu</p>} />
        <Route path="/concept-orders/:id" element={<p>Hồ sơ concept</p>} />
        <Route path="/concept-orders" element={<ConceptOrdersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  auth.user = { _id: 'photo-1', roles: [3] };
  vi.mocked(photographerOrdersService.list).mockResolvedValue(response([concept, yearbook], 45));
});

describe('photographer photography orders', () => {
  it('shows both services with own role and opens each existing record route', async () => {
    open();
    const conceptLink = await screen.findByRole('link', { name: 'Áo dài' });
    const yearbookLink = screen.getByRole('link', { name: '12A1' });
    expect(conceptLink).toHaveAttribute('href', '/concept-orders/concept-1');
    expect(yearbookLink).toHaveAttribute('href', '/workflow-bookings/yearbook-1');
    expect(yearbookLink.closest('tr')).toHaveTextContent('Kỉ yếu');
    expect(yearbookLink.closest('tr')).toHaveTextContent('Thợ phụ');
    expect(conceptLink.closest('tr')).toHaveTextContent('Concept');
    expect(screen.queryByText('Thanh toán')).not.toBeInTheDocument();
    fireEvent.click(yearbookLink);
    expect(screen.getByText('Hồ sơ kỉ yếu')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('bookingOrdersReturnTo');
  });
  it('keeps service/status filters and global pagination in URL; restores them on concept detail navigation', async () => {
    open('/workflow-bookings?service=concept&view=editing&page=2');
    await waitFor(() =>
      expect(photographerOrdersService.list).toHaveBeenLastCalledWith(
        2,
        'concept',
        'editing',
        expect.any(AbortSignal),
      ),
    );
    expect(screen.getByRole('combobox', { name: 'Loại dịch vụ' })).toHaveValue('concept');
    fireEvent.click(await screen.findByRole('link', { name: 'Áo dài' }));
    expect(screen.getByText('Hồ sơ concept')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      'bookingOrdersReturnTo":"/workflow-bookings?service=concept&view=editing&page=2',
    );
  });
  it('resets only the page when changing service and retains both filters when paging', async () => {
    open('/workflow-bookings?view=editing&page=2');
    await screen.findByRole('link', { name: '12A1' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Loại dịch vụ' }), {
      target: { value: 'yearbook' },
    });
    await waitFor(() =>
      expect(photographerOrdersService.list).toHaveBeenLastCalledWith(
        1,
        'yearbook',
        'editing',
        expect.any(AbortSignal),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() =>
      expect(photographerOrdersService.list).toHaveBeenLastCalledWith(
        2,
        'yearbook',
        'editing',
        expect.any(AbortSignal),
      ),
    );
  });
  it('ignores stale responses and recovers from an error without displaying an old service result', async () => {
    let finishOld!: (value: ReturnType<typeof response>) => void;
    vi.mocked(photographerOrdersService.list)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response([concept]));
    open();
    fireEvent.change(screen.getByRole('combobox', { name: 'Loại dịch vụ' }), {
      target: { value: 'concept' },
    });
    await screen.findByRole('alert');
    await act(async () => finishOld(response([yearbook])));
    expect(screen.queryByRole('link', { name: '12A1' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('link', { name: 'Áo dài' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('redirects the old photographer concept list into the filtered unified workspace', async () => {
    open('/concept-orders');
    await screen.findByRole('link', { name: 'Áo dài' });
    expect(screen.getByTestId('location')).toHaveTextContent('/workflow-bookings?service=concept');
    expect(screen.getByRole('combobox', { name: 'Loại dịch vụ' })).toHaveValue('concept');
  });
});

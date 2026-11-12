import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerOrdersPage from './CustomerOrdersPage';
import {
  conceptService,
  type ConceptOrder,
  type ConceptOrderStage,
} from '../services/conceptService';

vi.mock('../config/features', () => ({ conceptBookingEnabled: true, clientPortalEnabled: true }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'client', roles: [6], emailVerifiedAt: '2026-01-01' } }),
}));
vi.mock('../services/conceptService', async (original) => ({
  ...(await original<typeof import('../services/conceptService')>()),
  conceptService: { list: vi.fn() },
}));

function order(id: string, status: string, orderStage: ConceptOrderStage | null): ConceptOrder {
  return {
    _id: id,
    status,
    orderStage,
    contactName: 'Mai Anh',
    people: 1,
    snapshot: {
      name: `Gói ${id}`,
      conceptName: 'Chân dung',
      durationMinutes: 60,
      price: 900000,
      deposit: 270000,
    },
    startAt: '2026-11-14T07:00:00Z',
    endAt: '2026-11-14T08:00:00Z',
    netReceived: orderStage === null ? 0 : 270000,
    refundDue: 0,
    payments:
      orderStage && status !== 'expired'
        ? [{ kind: 'deposit', amount: 270000, at: '2026-11-12T07:00:00Z' }]
        : [],
    events: [],
  } as unknown as ConceptOrder;
}
function Probe() {
  const location = useLocation();
  return <output data-testid="url">{location.search}</output>;
}
function open(search = '?tab=concepts') {
  return render(
    <MemoryRouter initialEntries={['/account/orders' + search]}>
      <CustomerOrdersPage />
      <Probe />
    </MemoryRouter>,
  );
}
const rows = [
  order('one', 'confirmed', 'deposited'),
  order('two', 'shot', 'handing_over'),
  order('three', 'completed', 'completed'),
  order('four', 'expired', 'cancelled'),
];
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(conceptService.list).mockImplementation(async (status, _page, view) => ({
    data:
      status === 'awaiting_deposit'
        ? []
        : rows.filter((row) => view === 'all' || row.orderStage === view),
    pagination: { total: status === 'awaiting_deposit' ? 0 : 4 },
  }));
});
describe('Customer concept orders', () => {
  it('uses the shared list, selection, progress and four customer statuses', async () => {
    open();
    const list = await screen.findByRole('list', { name: 'Danh sách đơn chụp concept' });
    expect(screen.getAllByRole('heading', { level: 1 }).map((item) => item.textContent)).toEqual([
      'Đơn của tôi',
    ]);
    const select = screen.getByLabelText('Trạng thái');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Tất cả', 'Đã cọc', 'Đang bàn giao', 'Hoàn thành', 'Hủy']);
    expect(conceptService.list).toHaveBeenCalledWith('', 1, 'all');
    expect(
      within(screen.getByRole('region', { name: 'Gói one' })).getByRole('region', {
        name: 'Tiến độ đơn',
      }),
    ).toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button', { name: /Gói two/ }));
    const preview = screen.getByRole('region', { name: 'Gói two' });
    expect(preview.querySelector('[aria-current="step"]')).toHaveTextContent('Đang bàn giao');
    expect(within(preview).getByRole('link', { name: 'Xem hồ sơ đầy đủ' })).toHaveAttribute(
      'href',
      '/account/concept-orders/two',
    );
    expect(screen.getByTestId('url')).toHaveTextContent('order=two');
  });
  it('filters and paginates on the server, clears selection and retries failures', async () => {
    vi.mocked(conceptService.list).mockRejectedValueOnce(new Error('offline'));
    open('?tab=concepts&page=2&order=one');
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('region', { name: 'Gói one' });
    vi.mocked(conceptService.list).mockImplementation(async (status) => ({
      data: status ? [] : [rows[1]],
      pagination: { total: status ? 0 : 21 },
    }));
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'handing_over' } });
    await screen.findByRole('region', { name: 'Gói two' });
    expect(conceptService.list).toHaveBeenCalledWith('', 1, 'handing_over');
    expect(screen.getByTestId('url')).not.toHaveTextContent('order=');
    fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
    await waitFor(() => expect(conceptService.list).toHaveBeenCalledWith('', 2, 'handing_over'));
  });
  it('keeps unpaid checkouts separate with a direct payment link', async () => {
    vi.mocked(conceptService.list).mockImplementation(async (status) => ({
      data: status ? [order('unpaid', 'awaiting_deposit', null)] : [],
      pagination: { total: status ? 1 : 0 },
    }));
    open();
    const pending = await screen.findByRole('region', { name: 'Tiếp tục thanh toán concept' });
    expect(within(pending).getByRole('link', { name: 'Tiếp tục thanh toán' })).toHaveAttribute(
      'href',
      '/account/concept-orders/unpaid?payment=deposit',
    );
    expect(within(pending).queryByText('Đã cọc')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Danh sách đơn chụp concept' }),
    ).not.toBeInTheDocument();
  });
  it('shows expired orders as Hủy and hides future milestones', async () => {
    open('?tab=concepts&view=cancelled');
    const preview = await screen.findByRole('region', { name: 'Gói four' });
    expect(within(preview).getAllByText('Hủy')).toHaveLength(2);
    const progress = within(preview).getByRole('region', { name: 'Tiến độ đơn' });
    expect(within(progress).queryByText('Đang bàn giao')).not.toBeInTheDocument();
    expect(within(progress).queryByText('Hoàn thành')).not.toBeInTheDocument();
  });
  it('defaults unknown filters to all and validates pagination', async () => {
    open('?tab=concepts&view=toString&page=-1');
    await screen.findByRole('region', { name: 'Gói one' });
    expect(conceptService.list).toHaveBeenCalledWith('', 1, 'all');
    expect(screen.getByLabelText('Trạng thái')).toHaveValue('');
  });
});

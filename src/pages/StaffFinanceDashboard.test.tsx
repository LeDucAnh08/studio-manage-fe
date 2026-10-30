import type { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import dashboardReducer from '../store/slices/dashboardSlice';
import transactionsReducer from '../store/slices/transactionsSlice';
import customersReducer from '../store/slices/customersSlice';
import categoriesReducer from '../store/slices/categoriesSlice';
import usersReducer from '../store/slices/usersSlice';
import { reportMoney } from '../services/reportService';
import type { FinanceReport, InventoryReport, ReportResponse } from '../services/reportService';
import DashboardPage from './DashboardPage';
import FinancePage from './FinancePage';
import ReportsPage from './ReportsPage';

const mocks = vi.hoisted(() => ({
  roles: [0],
  stats: vi.fn(),
  chart: vi.fn(),
  transactions: vi.fn(),
  summary: vi.fn(),
  update: vi.fn(),
  finance: vi.fn(),
  inventory: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'staff-1', name: 'Nhân viên mẫu', roles: mocks.roles } }),
}));
vi.mock('../services/dashboardService', () => ({ dashboardService: { getStats: mocks.stats } }));
vi.mock('../services/transactionService', () => ({
  transactionService: {
    getAll: mocks.transactions,
    getSummary: mocks.summary,
    update: mocks.update,
  },
}));
vi.mock('../services/customerService', () => ({
  customerService: { getAll: async () => ({ data: [], total: 0 }) },
}));
vi.mock('../services/categoryService', () => ({
  categoryService: {
    getAll: async () => [{ _id: 'category-1', name: 'Tiền chụp', type: 'income' }],
  },
}));
vi.mock('../services/userService', () => ({ userService: { getAll: async () => [] } }));
vi.mock('../services/reportService', async () => ({
  ...(await vi.importActual('../services/reportService')),
  reportService: { finance: mocks.finance, inventory: mocks.inventory },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// Keep real dashboard transformations, replace SVG layout only in jsdom; native QA renders Recharts.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ComposedChart: ({ data, children }: { data: unknown; children: ReactNode }) => {
    mocks.chart(data);
    return <div>{children}</div>;
  },
  Bar: ({ dataKey, isAnimationActive }: { dataKey: string; isAnimationActive: boolean }) => (
    <span data-testid={'series-' + dataKey} data-animated={String(isAnimationActive)} />
  ),
  Line: ({ dataKey, isAnimationActive }: { dataKey: string; isAnimationActive: boolean }) => (
    <span data-testid={'series-' + dataKey} data-animated={String(isAnimationActive)} />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
}));

const stats = {
  totals: { income: 1400000, expense: 400000, profit: 1000000 },
  daily: [
    { label: '2026-09-01', income: 600000, expense: 100000 },
    { label: '2026-09-10', income: 400000, expense: 100000 },
    { label: '2026-10-01', income: 400000, expense: 200000 },
  ],
  customerCount: 7,
  scheduleCount: 9,
  showSchedules: true,
  upcomingSchedules: [],
};
const finance: ReportResponse<FinanceReport> = {
  pagination: { page: 1, limit: 20, total: 21 },
  data: {
    range: { from: '2026-10-01', to: '2026-10-31', days: 31 },
    generatedAt: '2026-10-29T04:00:00Z',
    view: 'cash',
    service: 'all',
    cash: [
      { _id: 'photography', count: 2, income: 1000000, expense: 150000 },
      { _id: 'rental', count: 1, income: 300000, expense: 50000 },
    ],
    snapshot: [
      {
        _id: 'photography',
        count: 1,
        agreedValue: 1500000,
        due: 500000,
        refundDue: 0,
        depositHeld: 0,
        unsettledSurplus: 0,
      },
      {
        _id: 'rental',
        count: 1,
        agreedValue: 200000,
        due: 0,
        refundDue: 50000,
        depositHeld: 100000,
        unsettledSurplus: 20000,
      },
    ],
    accepted: [{ _id: 'photography', count: 1, serviceValue: 1000000, cancellationValue: 0 }],
    rows: [
      {
        _id: 'payment-1',
        referenceId: 'workflow-123456',
        service: 'photography',
        date: '2026-10-15',
        type: 'income',
        amount: 1000000,
        status: 'confirmed',
        fee: 1500000,
        netReceived: 1000000,
        due: 500000,
      },
    ],
  },
};
const inventory: ReportResponse<InventoryReport> = {
  pagination: { page: 1, limit: 20, total: 1 },
  data: {
    range: finance.data.range,
    generatedAt: finance.data.generatedAt,
    summary: {
      good: 5,
      photographyDays: 9,
      rentalDays: 4,
      conflictRows: 1,
      unknownSchedules: 0,
      missingCostumes: 0,
      invalidIntervals: 0,
      overdueOrders: 1,
    },
    rows: [
      {
        costumeId: 'costume-1',
        name: 'Áo dài mẫu',
        size: 'M',
        good: 5,
        photographyDays: 9,
        rentalDays: 4,
        peak: 6,
        overCapacityDays: 1,
        unknownSchedules: 0,
        invalidIntervals: 0,
        utilization: 30,
        missingCostume: false,
      },
    ],
  },
};
function renderPage(page: ReactNode, url = '/') {
  const store = configureStore({
    reducer: {
      dashboard: dashboardReducer,
      transactions: transactionsReducer,
      customers: customersReducer,
      categories: categoriesReducer,
      users: usersReducer,
      seasons: () => ({
        list: [
          { _id: 'season-1', name: 'Mùa thu', startDate: '2026-09-01', endDate: '2026-10-31' },
        ],
        selectedSeasonId: 'season-1',
        loading: false,
        error: null,
      }),
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>{page}</MemoryRouter>
    </Provider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.roles = [0];
  mocks.stats.mockResolvedValue(stats);
  mocks.transactions.mockResolvedValue({
    data: [
      {
        _id: 'tx-1',
        date: '2026-10-15',
        type: 'income',
        amount: 500000,
        categoryId: { _id: 'category-1', name: 'Tiền chụp' },
        customer: { _id: 'class-1', className: '12A1' },
        createdBy: { username: 'staff' },
        description: 'Thu mẫu',
        accountantRefunded: false,
      },
    ],
    total: 1,
  });
  mocks.summary.mockResolvedValue([
    {
      _id: 'class-1',
      customer: { className: '12A1', school: 'THPT mẫu' },
      income: 500000,
      expense: 200000,
      profit: 300000,
    },
  ]);
  mocks.finance.mockResolvedValue(finance);
  mocks.inventory.mockResolvedValue(inventory);
});

describe('Dashboard, finance and reports rollout', () => {
  it('keeps admin KPIs, month aggregation and cumulative values while respecting reduced motion', async () => {
    const media = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    try {
      renderPage(<DashboardPage />);
      await screen.findByRole('heading', { level: 1, name: 'Xin chào, Nhân viên mẫu!' });
      expect(screen.getByRole('link', { name: /Tổng thu/ })).toHaveTextContent('1.400.000');
      expect(screen.getByRole('link', { name: /Chênh lệch thu–chi/ })).toHaveTextContent(
        '1.000.000',
      );
      expect(mocks.chart).toHaveBeenLastCalledWith([
        {
          name: '09/26',
          Thu: 1000000,
          Chi: 200000,
          'Chênh lệch thu–chi': 800000,
          'Chênh lệch lũy kế': 800000,
        },
        {
          name: '10/26',
          Thu: 400000,
          Chi: 200000,
          'Chênh lệch thu–chi': 200000,
          'Chênh lệch lũy kế': 1000000,
        },
      ]);
      expect(screen.getByTestId('series-Thu')).toHaveAttribute('data-animated', 'false');
      expect(screen.getByRole('combobox', { name: 'Xem theo người' })).toBeInTheDocument();
    } finally {
      media.mockRestore();
    }
  });
  it('does not expose finance or admin filters to a photographer', async () => {
    mocks.roles = [3];
    renderPage(<DashboardPage />);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('link', { name: /Lịch chụp 9/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Tổng thu/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Xem theo người' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('series-Thu')).not.toBeInTheDocument();
  });
  it('shows a retry rather than a permanent loader after dashboard failure', async () => {
    mocks.stats.mockRejectedValueOnce(new Error('Offline'));
    renderPage(<DashboardPage />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('heading', { level: 1 });
    expect(mocks.stats).toHaveBeenLastCalledWith({ userId: undefined, season: 'season-1' });
  });
  it.each([
    [0, false],
    [5, true],
  ])('preserves refund edit permission for role %s', async (role, enabled) => {
    mocks.roles = [role];
    renderPage(<FinancePage />);
    const table = await screen.findByRole('table', { name: 'Danh sách giao dịch' });
    const refund = within(table).getByRole('checkbox', { name: /Kế toán đã hoàn tiền/ });
    if (enabled) expect(refund).toBeEnabled();
    else expect(refund).toBeDisabled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('renders unchanged summary totals inside the table footer and validates the payment form', async () => {
    renderPage(<FinancePage />);
    await screen.findByRole('table', { name: 'Danh sách giao dịch' });
    fireEvent.click(screen.getByRole('button', { name: 'Tổng hợp theo lớp' }));
    const summary = await screen.findByRole('table', { name: 'Tổng hợp thu chi theo lớp' });
    expect(summary.querySelector('tfoot')).toHaveTextContent('500.000');
    expect(summary.querySelector('tfoot')).toHaveTextContent('200.000');
    expect(summary.querySelector('tfoot')).toHaveTextContent('300.000');
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm giao dịch' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm giao dịch' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(
        within(dialog).getByRole('combobox', { name: 'Danh mục' }),
      ).toHaveAccessibleDescription('Vui lòng chọn danh mục.'),
    );
  });
  it('preserves report money values, URL date range, service filter, reference links and pagination', async () => {
    renderPage(<ReportsPage />, '/reports?from=2026-10-01&to=2026-10-31');
    const totals = await screen.findByRole('table', { name: 'So sánh dịch vụ trong kỳ' });
    const totalRow = within(totals).getByRole('row', { name: /^Tổng / });
    expect(totalRow).toHaveTextContent(reportMoney(1300000).replace(/\s+/g, ' '));
    expect(totalRow).toHaveTextContent(reportMoney(200000).replace(/\s+/g, ' '));
    expect(totalRow).toHaveTextContent(reportMoney(1100000).replace(/\s+/g, ' '));
    expect(screen.getByRole('link', { name: 'Chụp #123456' })).toHaveAttribute(
      'href',
      '/workflow-bookings/workflow-123456',
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Dịch vụ đối chiếu' }), {
      target: { value: 'rental' },
    });
    await waitFor(() =>
      expect(mocks.finance).toHaveBeenLastCalledWith(
        { from: '2026-10-01', to: '2026-10-31', service: 'rental', view: 'cash', page: 1 },
        expect.any(AbortSignal),
      ),
    );
    await screen.findByRole('button', { name: 'Trang sau' });
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() =>
      expect(mocks.finance).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, service: 'rental' }),
        expect.any(AbortSignal),
      ),
    );
  });
  it('retains inventory units, over-capacity warnings and sample search parameters', async () => {
    renderPage(<ReportsPage />, '/reports?from=2026-10-01&to=2026-10-31');
    await screen.findByRole('table', { name: 'So sánh dịch vụ trong kỳ' });
    fireEvent.click(screen.getByRole('button', { name: 'Phân bổ kho' }));
    const table = await screen.findByRole('table', { name: 'Phân bổ trang phục theo mẫu và size' });
    expect(within(table).getByText('30%')).toBeInTheDocument();
    expect(within(table).getByText('6 món / 1 ngày')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 đơn quá hạn chưa trả đang giữ kho.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm tên mẫu' }), {
      target: { value: '  Áo dài  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm mẫu' }));
    await waitFor(() =>
      expect(mocks.inventory).toHaveBeenLastCalledWith(
        { from: '2026-10-01', to: '2026-10-31', q: 'Áo dài', page: 1 },
        expect.any(AbortSignal),
      ),
    );
  });
});

import type { ComponentProps } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatePicker } from '../components/ui/date-picker';
import schedulesReducer from '../store/slices/schedulesSlice';
import customersReducer from '../store/slices/customersSlice';
import packagesReducer from '../store/slices/packagesSlice';
import categoriesReducer from '../store/slices/categoriesSlice';
import usersReducer from '../store/slices/usersSlice';
import SchedulesPage from './SchedulesPage';
import PackagesPage from './PackagesPage';
import CategoriesPage from './CategoriesPage';
import CostumeTypesPage from './CostumeTypesPage';

const mocks = vi.hoisted(() => ({
  schedules: vi.fn(),
  customers: vi.fn(),
  packages: vi.fn(),
  categories: vi.fn(),
  types: vi.fn(),
  costumes: vi.fn(),
  updatePackage: vi.fn(),
  createType: vi.fn(),
  createCategory: vi.fn(),
  removeSchedule: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('../services/scheduleService', () => ({
  scheduleService: { getAll: mocks.schedules, remove: mocks.removeSchedule },
}));
vi.mock('../services/customerService', () => ({ customerService: { getAll: mocks.customers } }));
vi.mock('../services/packageService', () => ({
  packageService: { getAll: mocks.packages, update: mocks.updatePackage },
}));
vi.mock('../services/categoryService', () => ({
  categoryService: { getAll: mocks.categories, create: mocks.createCategory },
}));
vi.mock('../services/costumeTypeService', () => ({
  costumeTypeService: { getAll: mocks.types, create: mocks.createType },
}));
vi.mock('../services/costumeService', () => ({ costumeService: { getAll: mocks.costumes } }));
vi.mock('../services/userService', () => ({
  userService: { getPhotographers: async () => [], getSales: async () => [] },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: mocks.toast } }));
// Filter request tests keep the native string/undefined callback contract; browser QA covers the real calendar.
vi.mock('../components/ui/date-picker', () => ({
  DatePicker: ({ onChange, value, ...props }: ComponentProps<typeof DatePicker>) => (
    <input
      {...props}
      type="date"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
    />
  ),
}));

const item = {
  _id: 'schedule-1',
  shootDate: '2026-10-15',
  startTime: '07:00',
  endTime: '11:00',
  customer: {
    _id: 'class-1',
    className: '12A1',
    school: 'THPT mẫu',
    contactName: 'Người liên hệ',
    contactPhone: '0901234567',
    total: 40,
  },
  package: { _id: 'pkg-1', name: 'Gói mẫu', pricePerMember: 250000 },
  supportPhotographers: [],
  status: 'confirmed',
  notes: 'Ghi chú mẫu',
  workflowBooking: 'workflow-1',
};
const pkg = {
  _id: 'pkg-1',
  name: 'Gói mẫu',
  pricePerMember: 250000,
  editingScope: 'full',
  duration: 'half_day',
  deliveryDays: 7,
  studentsPerCrew: 15,
  costumes: [{ _id: 'type-1', name: 'Áo dài' }],
  isPopular: true,
};
function renderPage(page: React.ReactNode) {
  const store = configureStore({
    reducer: {
      schedules: schedulesReducer,
      customers: customersReducer,
      packages: packagesReducer,
      categories: categoriesReducer,
      users: usersReducer,
      seasons: () => ({
        list: [{ _id: 'season-1', name: 'Mùa thu' }],
        selectedSeasonId: 'season-1',
        loading: false,
        error: null,
      }),
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>{page}</MemoryRouter>
    </Provider>,
  );
}
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.resetAllMocks();
  mocks.schedules.mockResolvedValue({ data: [item], total: 21 });
  mocks.customers.mockResolvedValue({ data: [item.customer], total: 1 });
  mocks.packages.mockResolvedValue([pkg]);
  mocks.categories.mockResolvedValue([
    { _id: 'category-1', name: 'Tiền chụp', type: 'income', isDefault: true },
  ]);
  mocks.types.mockResolvedValue([{ _id: 'type-1', name: 'Áo dài' }]);
  mocks.costumes.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllGlobals());

describe('Schedule and inventory rollout', () => {
  it('retains applied date filters, pagination, reset and linked-schedule guards', async () => {
    renderPage(<SchedulesPage />);
    const table = await screen.findByRole('table', { name: 'Danh sách lịch chụp' });
    expect(screen.getByRole('heading', { level: 1, name: 'Lịch chụp' })).toBeInTheDocument();
    fireEvent.click(within(table).getByRole('button', { name: /^Sửa lịch 12A1/ }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('liên kết đơn chụp ảnh'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(within(table).getByRole('button', { name: /^Xoá lịch 12A1/ }));
    expect(mocks.removeSchedule).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Lọc từ ngày'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Lọc đến ngày'), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lọc' }));
    await waitFor(() =>
      expect(mocks.schedules).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        season: 'season-1',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-31',
      }),
    );
    await screen.findByRole('table');
    fireEvent.click(
      within(screen.getAllByRole('navigation', { name: 'Phân trang' })[0]).getByRole('button', {
        name: 'Trang sau',
      }),
    );
    await waitFor(() =>
      expect(mocks.schedules).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, dateFrom: '2026-10-01' }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xoá lọc' }));
    await waitFor(() =>
      expect(mocks.schedules).toHaveBeenLastCalledWith({ page: 1, limit: 20, season: 'season-1' }),
    );
  });
  it('exposes detail and contract fields without creating a document or changing a schedule', async () => {
    renderPage(<SchedulesPage />);
    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: /^Xem lịch 12A1/ }));
    const detail = screen.getByRole('dialog', { name: 'Chi tiết lịch chụp' });
    expect(within(detail).getByText('Ghi chú mẫu')).toBeInTheDocument();
    fireEvent.click(within(detail).getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(within(table).getByRole('button', { name: /^Hợp đồng lịch 12A1/ }));
    const contract = screen.getByRole('dialog', { name: 'Xác nhận thông tin hợp đồng' });
    expect(within(contract).getByLabelText('Người liên hệ', { exact: false })).toHaveValue(
      'Người liên hệ',
    );
    expect(within(contract).getByRole('spinbutton', { name: 'Tổng học sinh' })).toHaveValue(40);
  });
  it('links required schedule controls to their errors and prevents an invalid write', async () => {
    renderPage(<SchedulesPage />);
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm lịch' }));
    const form = screen.getByRole('dialog', { name: 'Thêm lịch chụp' });
    fireEvent.click(within(form).getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(within(form).getByRole('combobox', { name: 'Lớp' })).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    );
    expect(within(form).getByRole('combobox', { name: 'Lớp' })).toHaveAccessibleDescription(
      'Vui lòng chọn lớp.',
    );
    expect(within(form).getByRole('combobox', { name: 'Lớp' })).toHaveFocus();
  });
  it('preserves package price, linked costume type IDs and form defaults in the update payload', async () => {
    mocks.updatePackage.mockResolvedValue(pkg);
    renderPage(<PackagesPage />);
    const table = await screen.findByRole('table', { name: 'Gói chụp' });
    fireEvent.click(within(table).getByRole('button', { name: 'Sửa gói Gói mẫu' }));
    const dialog = screen.getByRole('dialog', { name: 'Sửa gói chụp' });
    expect(within(dialog).getByRole('combobox', { name: 'Trang phục' })).toHaveTextContent(
      'Áo dài',
    );
    expect(within(dialog).getByRole('spinbutton', { name: 'Giá/thành viên (₫)' })).toHaveValue(
      250000,
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(mocks.updatePackage).toHaveBeenCalledWith(
        'pkg-1',
        expect.objectContaining({
          pricePerMember: 250000,
          costumes: ['type-1'],
          duration: 'half_day',
          editingScope: 'full',
          studentsPerCrew: 15,
          isPopular: true,
        }),
      ),
    );
  });
  it('shows a type read error and retry, then validates the required name', async () => {
    mocks.types.mockRejectedValueOnce(new Error('Offline'));
    renderPage(<CostumeTypesPage />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('table', { name: 'Loại trang phục' });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm loại' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm loại trang phục' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(within(dialog).getByRole('textbox', { name: 'Tên loại' })).toHaveAccessibleDescription(
        'Vui lòng nhập tên loại.',
      ),
    );
    expect(mocks.createType).not.toHaveBeenCalled();
  });
  it('keeps category actions visible by name and preserves the default-category delete guard', async () => {
    renderPage(<CategoriesPage />);
    await screen.findByRole('button', { name: 'Sửa danh mục Tiền chụp' });
    expect(
      screen.queryByRole('button', { name: 'Xoá danh mục Tiền chụp' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm danh mục' });
    expect(within(dialog).getByRole('combobox', { name: 'Loại' })).toHaveTextContent('Thu');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(
        within(dialog).getByRole('textbox', { name: 'Tên danh mục' }),
      ).toHaveAccessibleDescription('Vui lòng nhập tên danh mục.'),
    );
    expect(mocks.createCategory).not.toHaveBeenCalled();
  });
});

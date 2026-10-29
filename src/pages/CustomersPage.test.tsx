import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import customersReducer from '../store/slices/customersSlice';
import CustomersPage from './CustomersPage';
import type { Customer } from '../types';

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../services/customerService', () => ({ customerService: mocks }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const customer: Customer = {
  _id: 'class-1',
  className: '12A1',
  school: 'Trường THPT có tên dài',
  contactName: 'Mai Anh',
  contactPhone: '0901234567',
  contactAddress: 'Hà Nội',
  total: 40,
  totalMale: 20,
  totalFemale: 20,
  notes: 'Liên hệ trước khi tới',
  season: 'season-1',
};
function renderPage() {
  const store = configureStore({
    reducer: {
      customers: customersReducer,
      seasons: () => ({
        list: [{ _id: 'season-1', name: 'Mùa thu 2026' }],
        selectedSeasonId: 'season-1',
        loading: false,
        error: null,
      }),
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CustomersPage />
      </MemoryRouter>
    </Provider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getAll.mockResolvedValue({ data: [customer], total: 25 });
  mocks.create.mockResolvedValue(customer);
  mocks.update.mockResolvedValue(customer);
});

describe('Class list pilot', () => {
  it('searches on Enter, clears search and retains server pagination and season', async () => {
    renderPage();
    await screen.findByRole('table', { name: 'Danh sách lớp học' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Danh sách lớp học' }),
    ).toBeInTheDocument();
    const search = screen.getByRole('textbox', { name: 'Tìm kiếm lớp hoặc trường' });
    fireEvent.change(search, { target: { value: '12A' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() =>
      expect(mocks.getAll).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        season: 'season-1',
        search: '12A',
      }),
    );
    await screen.findByRole('table');
    const pagination = screen.getAllByRole('navigation', { name: 'Phân trang' })[0];
    fireEvent.click(within(pagination).getByRole('button', { name: 'Trang sau' }));
    await waitFor(() =>
      expect(mocks.getAll).toHaveBeenLastCalledWith({
        page: 2,
        limit: 20,
        season: 'season-1',
        search: '12A',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xoá tìm kiếm' }));
    await waitFor(() =>
      expect(mocks.getAll).toHaveBeenLastCalledWith({ page: 1, limit: 20, season: 'season-1' }),
    );
    expect(search).toHaveFocus();
  });

  it('retains defaults, connects validation and does not submit an invalid form', async () => {
    renderPage();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm lớp' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm lớp mới' });
    expect(within(dialog).getByRole('spinbutton', { name: 'Sĩ số' })).toHaveValue(0);
    expect(within(dialog).getByRole('combobox', { name: 'Mùa chụp' })).toHaveTextContent(
      'Mùa thu 2026',
    );
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Người liên hệ' }), {
      target: { value: 'Giữ giá trị này' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(within(dialog).getByRole('textbox', { name: 'Tên lớp' })).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    );
    expect(within(dialog).getByRole('textbox', { name: 'Tên lớp' })).toHaveAccessibleDescription(
      'Vui lòng nhập tên lớp',
    );
    expect(within(dialog).getByRole('textbox', { name: 'Người liên hệ' })).toHaveValue(
      'Giữ giá trị này',
    );
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps edit values and the update payload contract while showing a busy state', async () => {
    let finish!: (value: Customer) => void;
    mocks.update.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    renderPage();
    const table = await screen.findByRole('table');
    fireEvent.click(
      within(table).getByRole('button', { name: 'Sửa lớp 12A1, Trường THPT có tên dài' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Sửa lớp' });
    expect(within(dialog).getByRole('spinbutton', { name: 'Sĩ số' })).toHaveValue(40);
    fireEvent.change(within(dialog).getByLabelText('Ghi chú'), {
      target: { value: 'Ghi chú mới' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith('class-1', { ...customer, notes: 'Ghi chú mới' }),
    );
    expect(within(dialog).getByRole('button', { name: 'Đang lưu…' })).toBeDisabled();
    finish(customer);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('shows a retry after a failed read, then distinguishes an empty search', async () => {
    mocks.getAll.mockRejectedValueOnce(new Error('Network unavailable'));
    renderPage();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByRole('table');
    mocks.getAll.mockResolvedValue({ data: [], total: 0 });
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm kiếm lớp hoặc trường' }), {
      target: { value: 'không-có' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }));
    await waitFor(() =>
      expect(screen.getAllByText('Không tìm thấy lớp').length).toBeGreaterThan(0),
    );
  });
});

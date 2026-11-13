import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PhotographerSchedulePage from './PhotographerSchedulePage';
import type { PersonalSchedule } from '../services/scheduleService';

const mocks = vi.hoisted(() => ({
  calendar: vi.fn(),
  user: { _id: 'photo-1', roles: [3], name: 'Lê Minh Đức' },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../services/scheduleService', () => ({ scheduleService: { myCalendar: mocks.calendar } }));

const event = (overrides: Partial<PersonalSchedule> = {}): PersonalSchedule => ({
  _id: 'concept-1',
  shootDate: '2026-11-18T01:30:00Z',
  startTime: '08:30',
  endTime: '09:30',
  location: 'Yume Studio',
  status: 'confirmed',
  notes: 'Chuẩn bị phông sáng',
  service: 'concept',
  title: 'Chân dung cá nhân',
  role: 'lead',
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-13T02:00:00Z'));
  mocks.user = { _id: 'photo-1', roles: [3], name: 'Lê Minh Đức' };
  mocks.calendar.mockReset().mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('personal monthly shoot calendar', () => {
  it('loads the complete 42-day range, keeps every November day, and navigates months/today', async () => {
    const { container } = render(<PhotographerSchedulePage />);
    await screen.findByText('0 lịch được phân công');
    expect(mocks.calendar).toHaveBeenCalledWith(
      '2026-10-26',
      '2026-12-06',
      expect.any(AbortSignal),
    );
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
    expect(container.querySelectorAll('[data-day^="2026-11"]')).toHaveLength(30);
    expect(screen.getByText('Chưa có lịch chụp')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));
    await screen.findByRole('heading', { name: 'Tháng 12, 2026' });
    expect(mocks.calendar).toHaveBeenLastCalledWith(
      '2026-11-30',
      '2027-01-10',
      expect.any(AbortSignal),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }));
    await screen.findByRole('heading', { name: 'Tháng 11, 2026' });
    expect(screen.getByRole('heading', { name: '13 tháng 11' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tạo lịch|Sửa|Xóa/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows all selected-day shoots, support role, notes and cancelled state; groups at Vietnam midnight', async () => {
    mocks.calendar.mockResolvedValue([
      event(),
      event({
        _id: 'yearbook',
        title: 'Lớp 12A1',
        service: 'yearbook',
        role: 'support',
        startTime: '14:00',
        status: 'cancelled',
      }),
      event({ _id: 'third', title: 'Áo dài', startTime: '17:00' }),
      event({ _id: 'first', title: 'Đầu tháng', shootDate: '2026-10-31T17:00:00Z' }),
      event({ _id: 'last', title: 'Cuối tháng', shootDate: '2026-11-30T16:59:59Z' }),
    ]);
    const { container } = render(<PhotographerSchedulePage />);
    await screen.findByText('5 lịch được phân công');
    expect(
      within(container.querySelector('[data-day="2026-11-01"]') as HTMLElement).getByText(
        'Đầu tháng',
      ),
    ).toBeInTheDocument();
    expect(
      within(container.querySelector('[data-day="2026-11-30"]') as HTMLElement).getByText(
        'Cuối tháng',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /14:00.*Lớp 12A1/ }));
    const detail = screen.getByRole('complementary', { name: 'Chi tiết ngày đã chọn' });
    expect(within(detail).getByText('3 buổi chụp')).toBeInTheDocument();
    expect(within(detail).getByText('Thợ phụ')).toBeInTheDocument();
    expect(within(detail).getByText('Đã hủy')).toBeInTheDocument();
    expect(within(detail).getByText('Áo dài')).toBeInTheDocument();
    expect(within(detail).getAllByText('Thông tin chuẩn bị')).toHaveLength(3);
    expect(document.activeElement?.id).toBe('pc-session-yearbook');
    fireEvent.click(screen.getByRole('button', { name: /19\/11\/2026, 0 buổi/ }));
    expect(within(detail).getByText('Chưa có lịch chụp')).toBeInTheDocument();
  });

  it('does not expose stale data when switching month/account and ignores responses from aborted requests', async () => {
    let finishOld: (value: PersonalSchedule[]) => void = () => {};
    mocks.calendar
      .mockImplementationOnce(
        () =>
          new Promise<PersonalSchedule[]>((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockResolvedValue([]);
    const { rerender } = render(<PhotographerSchedulePage />);
    const oldSignal = mocks.calendar.mock.calls[0][2] as AbortSignal;
    fireEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));
    await screen.findByText('0 lịch được phân công');
    expect(oldSignal.aborted).toBe(true);
    await act(async () => finishOld([event({ title: 'Dữ liệu cũ' })]));
    expect(screen.queryByText('Dữ liệu cũ')).not.toBeInTheDocument();
    mocks.user = { _id: 'photo-2', roles: [3], name: 'Người khác' };
    rerender(<PhotographerSchedulePage />);
    await waitFor(() => expect(mocks.calendar).toHaveBeenCalledTimes(3));
    expect(screen.getByText('Người khác')).toBeInTheDocument();
  });

  it('shows a recoverable error instead of a misleading empty calendar', async () => {
    mocks.calendar.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    render(<PhotographerSchedulePage />);
    await screen.findByRole('alert');
    expect(screen.queryByText('Chưa có lịch chụp')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByText('0 lịch được phân công');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

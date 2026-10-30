import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScheduleCalendar from './ScheduleCalendar';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-15T05:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('Staff schedule calendar', () => {
  it('exposes real day buttons, complete details and contextual actions without changing IDs', () => {
    const edit = vi.fn(),
      remove = vi.fn();
    render(
      <ScheduleCalendar
        items={[
          {
            _id: 'schedule-1',
            shootDate: '2026-10-14T17:00:00.000Z',
            className: '12A1',
            status: 'confirmed',
            startTime: '07:00',
            endTime: '11:00',
            location: 'Địa điểm có tên dài',
            notes: 'Ghi chú đầy đủ',
          },
        ]}
        onEdit={edit}
        onDelete={remove}
      />,
    );
    const day = screen.getByRole('button', { name: 'Ngày 15/10/2026, 1 lịch chụp: 12A1' });
    expect(day).toHaveAttribute('aria-current', 'date');
    fireEvent.click(day);
    expect(day).toHaveAttribute('aria-pressed', 'true');
    const details = screen.getByRole('region', { name: 'Lịch ngày 2026-10-15' });
    expect(within(details).getByText('Ghi chú đầy đủ')).toBeInTheDocument();
    expect(within(details).getByText('Địa điểm có tên dài')).toBeInTheDocument();
    fireEvent.click(within(details).getByRole('button', { name: 'Sửa lịch 12A1' }));
    fireEvent.click(within(details).getByRole('button', { name: 'Xoá lịch 12A1' }));
    expect(edit).toHaveBeenCalledWith('schedule-1');
    expect(remove).toHaveBeenCalledWith('schedule-1');
    fireEvent.click(day);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
  it('navigates month/year boundaries and keeps an explicit empty-day state', () => {
    render(<ScheduleCalendar items={[]} />);
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Tháng sau' }));
    expect(screen.getByRole('heading', { name: 'Tháng 1 / 2027' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tháng trước' }));
    expect(screen.getByRole('heading', { name: 'Tháng 12 / 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ngày 01/12/2026, 0 lịch chụp' }));
    expect(screen.getByText('Không có lịch ngày này')).toBeInTheDocument();
  });
});

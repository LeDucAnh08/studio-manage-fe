import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingPhotographer } from './BookingPhotographer';
import { PhotographerAvailabilityPicker } from './PhotographerAvailabilityPicker';
import { PhotographerUnavailability } from './PhotographerUnavailability';
import {
  photographerService,
  type PhotographerAvailability,
} from '../services/photographerService';
import type { BookingWorkflowDto } from '../services/bookingWorkflowService';

vi.mock('../services/photographerService', async (original) => ({
  ...(await original<typeof import('../services/photographerService')>()),
  photographerService: {
    availability: vi.fn(),
    blocks: vi.fn(),
    saveBlock: vi.fn(),
    deleteBlock: vi.fn(),
  },
}));
vi.mock('../services/userService', () => ({ userService: { getPhotographers: vi.fn() } }));
const free: PhotographerAvailability = {
  _id: 'a',
  name: 'Minh',
  status: 'available',
  conflicts: [],
  schedules: [],
};
const busy: PhotographerAvailability = {
  _id: 'b',
  name: 'Hà',
  status: 'busy',
  conflicts: ['Chưa đủ 60 phút giữa hai buổi chụp.'],
  schedules: [
    {
      _id: 's',
      shootDate: '2027-01-01',
      startTime: '08:00',
      endTime: '11:00',
      location: 'Trường A',
      conflicting: true,
    },
  ],
};
const record = {
  booking: {
    _id: 'booking',
    status: 'pending',
    startAt: '2027-01-01T08:00:00+07:00',
    endAt: '2027-01-01T11:00:00+07:00',
  },
  workflow: {
    version: 0,
    lifecycle: 'intake',
    resources: null,
    quote: null,
    assignedPhotographer: null,
  },
} as BookingWorkflowDto;

describe('photographer assignment', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(photographerService.availability).mockResolvedValue([free, busy]);
    vi.mocked(photographerService.blocks).mockResolvedValue([]);
  });
  it('gives an early intake an accessible assignment action and disables unavailable people', async () => {
    const assign = vi.fn().mockResolvedValue(record);
    render(<BookingPhotographer record={record} admin busy={false} onAssign={assign} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gắn thợ' }));
    const minh = await screen.findByRole('checkbox', { name: /Minh/ });
    expect(minh).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: /Hà/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lưu phân công' })).toBeDisabled();
    fireEvent.click(minh);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phân công' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(['a']));
    expect(screen.getByText(/Phân công này chưa giữ khung giờ chụp/)).toBeInTheDocument();
  });
  it('selects multiple people, changes the lead, and restores the saved team when reopened', async () => {
    const second = { ...free, _id: 'c', name: 'Lan' };
    vi.mocked(photographerService.availability).mockResolvedValue([free, second, busy]);
    const assign = vi.fn().mockResolvedValue(record);
    const { rerender } = render(
      <BookingPhotographer record={record} admin busy={false} onAssign={assign} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gắn thợ' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Minh/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Lan/ }));
    expect(screen.getByRole('checkbox', { name: /Minh/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Lan/ })).toBeChecked();
    fireEvent.change(screen.getByRole('combobox', { name: 'Thợ chính / người chăm khách' }), {
      target: { value: 'c' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phân công' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(['c', 'a']));
    rerender(
      <BookingPhotographer
        record={{
          ...record,
          workflow: {
            ...record.workflow,
            version: 1,
            assignedPhotographer: second,
            assignedSupportPhotographers: [free],
          },
        }}
        admin
        busy={false}
        onAssign={assign}
      />,
    );
    expect(screen.getByText('Thợ hỗ trợ: Minh')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đổi thợ' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Lan/ })).toBeEnabled());
    expect(screen.getByRole('checkbox', { name: /Minh/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Lan/ })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: /Lan/ }));
    expect(screen.getByRole('combobox', { name: 'Thợ chính / người chăm khách' })).toHaveValue('a');
    fireEvent.click(screen.getByRole('checkbox', { name: /Minh/ }));
    expect(screen.getByRole('button', { name: 'Lưu phân công' })).toBeDisabled();
  });
  it('shows lookup errors and retries without treating an error as availability', async () => {
    vi.mocked(photographerService.availability).mockRejectedValueOnce(new Error('offline'));
    render(<BookingPhotographer record={record} admin busy={false} onAssign={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gắn thợ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kiểm tra được lịch trống');
    expect(screen.queryByText('Trống lịch')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu phân công' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('checkbox', { name: /Minh/ })).toBeEnabled();
  });
  it('refreshes unchanged data with visible progress and completion, and prevents saving while checking', async () => {
    let finishRefresh!: (rows: PhotographerAvailability[]) => void;
    vi.mocked(photographerService.availability)
      .mockImplementationOnce(async () => [free, busy])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishRefresh = resolve;
          }),
      );
    render(<BookingPhotographer record={record} admin busy={false} onAssign={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gắn thợ' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Minh/ }));
    expect(screen.getByRole('button', { name: 'Lưu phân công' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại lịch trống' }));
    expect(screen.getByRole('status')).toHaveTextContent('Đang kiểm tra lịch trống');
    expect(screen.getByRole('button', { name: 'Đang kiểm tra…' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Minh/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Minh/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lưu phân công' })).toBeDisabled();
    finishRefresh([free, busy]);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /Đã kiểm tra lại lúc .*1 thợ trống, 1 bận, 0 chưa xác định/,
      ),
    );
    expect(photographerService.availability).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Lưu phân công' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: /Minh/ })).toBeChecked();
  });
  it('updates changed availability after refreshing and keeps save disabled on a failed refresh', async () => {
    vi.mocked(photographerService.availability)
      .mockResolvedValueOnce([free, busy])
      .mockResolvedValueOnce([
        { ...free, status: 'busy', conflicts: ['Vừa có lịch chụp mới.'] },
        busy,
      ])
      .mockRejectedValueOnce(new Error('offline'));
    render(<BookingPhotographer record={record} admin busy={false} onAssign={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gắn thợ' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Minh/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại lịch trống' }));
    expect(await screen.findByText('Vừa có lịch chụp mới.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Minh/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Lưu phân công' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('0 thợ trống, 2 bận');
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại lịch trống' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kiểm tra được lịch trống');
    expect(screen.queryByText(/Đã kiểm tra lại lúc/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu phân công' })).toBeDisabled();
  });
  it('ignores old responses after date changes and locks the primary selection among support staff', async () => {
    let finishOld!: (value: PhotographerAvailability[]) => void;
    vi.mocked(photographerService.availability).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    );
    const props = {
      startAt: record.booking.startAt,
      endAt: record.booking.endAt,
      bookingId: 'booking',
      version: 1,
      selected: ['a'],
      onChange: vi.fn(),
      multiple: true,
      primaryId: 'a',
    };
    const { rerender } = render(<PhotographerAvailabilityPicker {...props} />);
    rerender(
      <PhotographerAvailabilityPicker
        {...props}
        startAt="2027-01-02T08:00:00+07:00"
        endAt="2027-01-02T11:00:00+07:00"
      />,
    );
    expect(await screen.findByRole('checkbox', { name: /Minh/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Minh/ })).toBeDisabled();
    finishOld([{ ...free, name: 'Kết quả ngày cũ' }]);
    await waitFor(() => expect(screen.queryByText('Kết quả ngày cũ')).not.toBeInTheDocument());
    fireEvent.click(screen.getByText(/Lịch chụp trong ngày/));
    expect(screen.getByText(/Trường A/)).toBeInTheDocument();
  });
  it('shows unknown legacy time as unselectable and gives customers only their assigned name', async () => {
    vi.mocked(photographerService.availability).mockResolvedValue([
      { ...free, status: 'unknown', conflicts: ['Cần đối soát lịch cũ.'] },
    ]);
    const { unmount } = render(
      <BookingPhotographer record={record} admin busy={false} onAssign={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gắn thợ' }));
    expect(await screen.findByRole('checkbox', { name: /Minh/ })).toBeDisabled();
    expect(screen.getByText('Chưa xác định')).toBeInTheDocument();
    unmount();
    render(
      <BookingPhotographer
        record={{
          ...record,
          workflow: { ...record.workflow, assignedPhotographer: { _id: 'a', name: 'Minh' } },
        }}
        admin={false}
        busy={false}
        onAssign={vi.fn()}
      />,
    );
    expect(screen.getByText('Minh')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đổi thợ/ })).not.toBeInTheDocument();
  });
  it('supports creating, editing and deleting personal blocks with Vietnam timestamps', async () => {
    vi.mocked(photographerService.blocks).mockResolvedValue([
      {
        _id: 'block',
        photographer: 'a',
        startAt: '2027-01-02T08:00:00+07:00',
        endAt: '2027-01-02T11:00:00+07:00',
        note: 'Nghỉ',
      },
    ]);
    render(<PhotographerUnavailability userId="a" admin={false} />);
    fireEvent.click(screen.getByText('Lịch bận của tôi'));
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    expect(screen.getByLabelText('Bắt đầu')).toHaveValue('2027-01-02T08:00');
    fireEvent.change(screen.getByLabelText('Kết thúc'), { target: { value: '2027-01-02T12:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() =>
      expect(photographerService.saveBlock).toHaveBeenCalledWith(
        {
          photographerId: 'a',
          startAt: '2027-01-02T08:00:00+07:00',
          endAt: '2027-01-02T12:00:00+07:00',
          note: 'Nghỉ',
        },
        'block',
      ),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xóa' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(photographerService.deleteBlock).toHaveBeenCalledWith('block'));
    const form = screen.getByRole('button', { name: 'Thêm lịch bận' }).closest('form')!;
    fireEvent.change(within(form).getByLabelText('Bắt đầu'), {
      target: { value: '2027-01-03T09:00' },
    });
    fireEvent.change(within(form).getByLabelText('Kết thúc'), {
      target: { value: '2027-01-03T10:00' },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Thêm lịch bận' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch bận' }));
    await waitFor(() =>
      expect(photographerService.saveBlock).toHaveBeenLastCalledWith(
        {
          photographerId: 'a',
          startAt: '2027-01-03T09:00:00+07:00',
          endAt: '2027-01-03T10:00:00+07:00',
          note: '',
        },
        undefined,
      ),
    );
  });
});

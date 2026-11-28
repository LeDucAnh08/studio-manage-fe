import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PhotographersManagePage from './PhotographersManagePage';
import PhotographerManageDetailPage from './PhotographerManageDetailPage';
import type { PersonalSchedule } from '../services/scheduleService';

const mocks = vi.hoisted(() => ({
  getPhotographersManage: vi.fn(),
  getOne: vi.fn(),
  photographerCalendar: vi.fn(),
  getAllSchedules: vi.fn(),
}));

vi.mock('../services/userService', () => ({
  userService: {
    getPhotographersManage: mocks.getPhotographersManage,
    getOne: mocks.getOne,
  },
}));

vi.mock('../services/scheduleService', () => ({
  scheduleService: {
    photographerCalendar: mocks.photographerCalendar,
    getAll: mocks.getAllSchedules,
  },
}));

const samplePhotographers = [
  {
    _id: 'photo-1',
    username: 'nhiepanh.minhduc',
    name: 'Lê Minh Đức',
    email: 'duc@yume.test',
    roles: [3 as const],
    isActive: true,
    scheduleStats: { total: 4, upcoming: 2, completed: 2 },
  },
  {
    _id: 'photo-2',
    username: 'nhiepanh.giabao',
    name: 'Nguyễn Gia Bảo',
    email: 'bao@yume.test',
    roles: [3 as const],
    isActive: false,
    scheduleStats: { total: 1, upcoming: 0, completed: 1 },
  },
];

const sampleCalendarEvents: PersonalSchedule[] = [
  {
    _id: 'sch-1',
    shootDate: '2026-11-28T02:00:00Z',
    startTime: '09:00',
    endTime: '11:30',
    location: 'THPT Nguyễn Trãi',
    status: 'confirmed',
    notes: 'Mang ống kính 50mm',
    service: 'yearbook',
    title: '12A1',
    role: 'lead',
    workflowBooking: 'wf-123',
  },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-28T05:00:00Z'));
  mocks.getPhotographersManage.mockReset().mockResolvedValue(samplePhotographers);
  mocks.getOne.mockReset().mockResolvedValue(samplePhotographers[0]);
  mocks.photographerCalendar.mockReset().mockResolvedValue(sampleCalendarEvents);
  mocks.getAllSchedules.mockReset().mockResolvedValue({
    data: [
      {
        _id: 'sch-1',
        customer: { _id: 'c1', className: '12A1', school: 'THPT Nguyễn Trãi', contactName: 'An', contactPhone: '090', contactAddress: 'HN', total: 40 },
        package: null,
        costumes: [],
        shootDate: '2026-11-28T02:00:00Z',
        startTime: '09:00',
        endTime: '11:30',
        location: 'THPT Nguyễn Trãi',
        leadPhotographer: samplePhotographers[0],
        supportPhotographers: [],
        bookedBy: null,
        status: 'confirmed',
        workflowBooking: 'wf-123',
      },
    ],
    total: 1,
    page: 1,
    limit: 100,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('admin photographer management', () => {
  it('lists photographers, filters by name/status, and opens the photographer schedule when clicking their name', async () => {
    render(
      <MemoryRouter initialEntries={['/staff/photographers']}>
        <Routes>
          <Route path="/staff/photographers" element={<PhotographersManagePage />} />
          <Route path="/staff/photographers/:id" element={<PhotographerManageDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const link = await screen.findByRole('link', { name: 'Lê Minh Đức' });
    expect(screen.getByRole('link', { name: 'Nguyễn Gia Bảo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Đang hoạt động/ }));
    expect(screen.queryByRole('link', { name: 'Nguyễn Gia Bảo' })).not.toBeInTheDocument();

    fireEvent.click(link);

    await screen.findByRole('heading', { name: 'Lịch chụp của Lê Minh Đức' });
    expect(mocks.photographerCalendar).toHaveBeenCalledWith(
      'photo-1',
      '2026-10-26',
      '2026-12-06',
      expect.any(AbortSignal),
    );
    expect(await screen.findByRole('heading', { name: '12A1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quản lý thợ' })).toHaveClass('app-back-link');

    fireEvent.click(screen.getByRole('button', { name: /Danh sách buổi chụp/ }));
    await waitFor(() =>
      expect(screen.getByRole('table', { name: 'Danh sách lịch chụp của Lê Minh Đức' })).toBeInTheDocument(),
    );
  });
});

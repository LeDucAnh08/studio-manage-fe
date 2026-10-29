import api from './api';
import type { ApiResponse } from '../types';

export interface AssignedPhotographer {
  _id: string;
  name: string;
}
export interface PhotographerAvailability extends AssignedPhotographer {
  status: 'available' | 'busy' | 'unknown';
  conflicts: string[];
  schedules: Array<{
    _id: string;
    shootDate: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    conflicting: boolean;
  }>;
}
export interface AvailabilityResult {
  key: string;
  rows: PhotographerAvailability[];
}
export const availabilityKey = (
  startAt: string,
  endAt: string,
  bookingId: string,
  version: number,
) => JSON.stringify([startAt, endAt, bookingId, version]);
export interface PhotographerBlock {
  _id: string;
  photographer: string;
  startAt: string;
  endAt: string;
  note: string;
}
export type PhotographerBlockInput = Pick<PhotographerBlock, 'startAt' | 'endAt' | 'note'> & {
  photographerId?: string;
};
export const photographerService = {
  availability: (startAt: string, endAt: string, bookingId: string) =>
    api
      .get<
        ApiResponse<PhotographerAvailability[]>
      >('/photographers/availability', { params: { startAt, endAt, bookingId } })
      .then((r) => r.data.data),
  blocks: (photographerId: string) =>
    api
      .get<
        ApiResponse<PhotographerBlock[]>
      >('/photographers/unavailability', { params: { photographerId } })
      .then((r) => r.data.data),
  saveBlock: (data: PhotographerBlockInput, id?: string) =>
    (id
      ? api.put<ApiResponse<PhotographerBlock>>(`/photographers/unavailability/${id}`, data)
      : api.post<ApiResponse<PhotographerBlock>>('/photographers/unavailability', data)
    ).then((r) => r.data.data),
  deleteBlock: (id: string) => api.delete(`/photographers/unavailability/${id}`),
};

export const photographerWindow = (schedule: {
  shootDate: string;
  startTime?: string;
  endTime?: string;
}) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(schedule.shootDate));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  const day = `${part('year')}-${part('month')}-${part('day')}`;
  return {
    startAt: `${day}T${schedule.startTime}:00+07:00`,
    endAt: `${day}T${schedule.endTime}:00+07:00`,
  };
};

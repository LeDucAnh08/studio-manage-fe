import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleService } from '../services/scheduleService';
import PhotographerCalendarView from '../components/PhotographerCalendarView';

export default function PhotographerSchedulePage() {
  const { user } = useAuth();
  const loadEvents = useCallback(
    (from: string, to: string, signal: AbortSignal) =>
      scheduleService.myCalendar(from, to, signal),
    [],
  );

  return (
    <PhotographerCalendarView
      title="Lịch chụp của tôi"
      subtitle="Theo dõi các buổi chụp bạn được phân công."
      photographerLabel={user?.name || user?.username}
      requestIdentity={user?._id ?? 'me'}
      loadEvents={loadEvents}
    />
  );
}

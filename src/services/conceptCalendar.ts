// The studio calendar uses Vietnam time, regardless of the customer's device timezone.
export const studioDay = (value: number | string = Date.now()) =>
  new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10);
export const addCalendarDays = (day: string, count: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
export const calendarMonth = (day: string) => day.slice(0, 7) + '-01';
export const addCalendarMonths = (month: string, count: number) => {
  const date = new Date(`${month}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + count);
  return date.toISOString().slice(0, 10);
};
export const calendarDays = (month: string) =>
  Array.from(
    {
      length: new Date(
        `${addCalendarDays(addCalendarMonths(month, 1), -1)}T00:00:00Z`,
      ).getUTCDate(),
    },
    (_, index) => addCalendarDays(month, index),
  );
export const studioDateLabel = (day: string, year = false) =>
  new Date(`${day}T12:00:00+07:00`).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(year ? { year: 'numeric' as const } : {}),
  });
export const studioTime = (value: string) =>
  new Date(value).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
export const studioShortDateLabel = (day: string) =>
  new Date(`${day}T12:00:00+07:00`).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

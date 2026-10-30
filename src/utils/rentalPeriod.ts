const DAY_MS = 24 * 60 * 60 * 1000;

const calendarDay = (value: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : null;
};

export function rentalDayCount(receive: string, returned: string): number | null {
  const start = calendarDay(receive);
  const end = calendarDay(returned);
  if (start === null || end === null) return null;
  const days = (end - start) / DAY_MS + 1;
  return days >= 1 && days <= 366 ? days : null;
}

export function vietnamToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((item) => item.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function validateRentalPeriod(receive: string, returned: string): string {
  if (!receive || !returned) return 'Chọn đủ ngày nhận và ngày trả để xem hàng còn trống.';
  if (calendarDay(receive) === null || calendarDay(returned) === null)
    return 'Ngày nhận hoặc ngày trả không hợp lệ.';
  if (returned < receive) return 'Ngày trả phải từ ngày nhận trở đi.';
  if (receive < vietnamToday()) return 'Ngày nhận phải từ hôm nay trở đi.';
  if (rentalDayCount(receive, returned) === null) return 'Thời gian thuê tối đa 366 ngày.';
  return '';
}

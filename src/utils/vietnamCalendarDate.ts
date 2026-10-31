export const vietnamCalendarDate = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date)
    : '';
};

export const vietnamDisplayDate = (value?: string | null) => {
  const date = value ? vietnamCalendarDate(value) : '';
  return date ? date.split('-').reverse().join('/') : 'Chưa xác định';
};

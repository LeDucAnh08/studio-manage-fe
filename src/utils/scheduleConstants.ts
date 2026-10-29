export const MONTH_VN = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

export const DOW_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const MONTH_LABELS: Record<string, string> = {
  '01': 'T1',
  '02': 'T2',
  '03': 'T3',
  '04': 'T4',
  '05': 'T5',
  '06': 'T6',
  '07': 'T7',
  '08': 'T8',
  '09': 'T9',
  '10': 'T10',
  '11': 'T11',
  '12': 'T12',
};

export const shortLabel = (label: string) => {
  const [, mo] = label.split('-');
  return MONTH_LABELS[mo] ?? label;
};

export const SCHEDULE_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
};

export const SCHEDULE_STATUS_COLOR: Record<string, string> = {
  pending: 'staff-status--warning',
  confirmed: 'staff-status--info',
  completed: 'staff-status--success',
  cancelled: 'staff-status--danger',
};

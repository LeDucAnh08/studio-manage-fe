import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Badge,
  Button,
  Combobox,
  DataTable,
  PageLoader,
  SegmentedControl,
  type Column,
} from '@/components/ui';
import { ScheduleCalendar } from '@/components/organisms';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import type { UpcomingSchedule } from '../services/dashboardService';
import { formatCurrency } from '../utils/format';
import { SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from '../utils/scheduleConstants';
import '../styles/admin-dashboard.css';

const dateLabel = (date: string | Date) =>
  new Date(date)
    .toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
    })
    .replace(/-/g, '/');
const monthLabel = (date: string) => `${date.slice(5, 7)}/${date.slice(2, 4)}`;
const number = (value: number) => value.toLocaleString('vi-VN');

export default function AdminDashboardPage() {
  const dispatch = useAppDispatch();
  const { stats, error, loading } = useAppSelector((state) => state.dashboard);
  const people = useAppSelector((state) => state.users.list);
  const [person, setPerson] = useState('');
  const [chartView, setChartView] = useState<'day' | 'month'>('month');
  const [scheduleView, setScheduleView] = useState<'table' | 'calendar'>('table');
  const [now] = useState(() => new Date());
  const refresh = useCallback(
    () => dispatch(fetchDashboardStats({ userId: person || undefined })),
    [dispatch, person],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    void dispatch(fetchUsers());
  }, [dispatch]);
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [refresh]);
  const receipts = useMemo(() => {
    const groups = new Map<string, number>();
    for (const entry of stats?.daily || []) {
      const key = chartView === 'month' ? entry.label.slice(0, 7) : entry.label;
      groups.set(key, (groups.get(key) || 0) + entry.income);
    }
    return [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, income]) => ({
        name:
          chartView === 'month' ? monthLabel(label) : `${label.slice(8, 10)}/${label.slice(5, 7)}`,
        Thu: income,
      }));
  }, [stats?.daily, chartView]);
  const userSeries =
    stats?.users?.monthly.map((row) => ({ name: monthLabel(row.label), User: row.count })) || [];
  if (!stats)
    return error ? (
      <div role="alert" className="admin-dashboard__error">
        <p>Không tải được dashboard.</p>
        <Button variant="outline" onClick={() => void refresh()}>
          Thử lại
        </Button>
      </div>
    ) : (
      <PageLoader />
    );
  const users = stats.users;
  const asOf = users?.asOf || now.toISOString();
  const schedules = stats.upcomingSchedules;
  const columns: Column<UpcomingSchedule>[] = [
    {
      key: 'date',
      header: 'Ngày & giờ',
      render: (row) => (
        <>
          <strong>
            {new Date(row.shootDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
          </strong>
          <small>
            {row.startTime || 'Chưa có giờ'}
            {row.endTime ? ` – ${row.endTime}` : ''}
          </small>
        </>
      ),
    },
    {
      key: 'class',
      header: 'Lớp & trường',
      render: (row) => (
        <>
          <strong>{row.customer?.className || '—'}</strong>
          <small>{row.customer?.school || '—'}</small>
        </>
      ),
    },
    { key: 'location', header: 'Địa điểm', render: (row) => row.location || '—' },
    {
      key: 'photographer',
      header: 'Nhiếp ảnh chính',
      render: (row) =>
        row.leadPhotographer?.name || row.leadPhotographer?.username || 'Chưa phân công',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <Badge variant="outline" className={SCHEDULE_STATUS_COLOR[row.status]}>
          {SCHEDULE_STATUS_LABEL[row.status] || row.status}
        </Badge>
      ),
    },
  ];
  return (
    <div className="admin-dashboard" aria-busy={loading}>
      <header className="admin-dashboard__header">
        <h1>Tổng quan studio</h1>
        <p>
          {new Date(asOf).toLocaleDateString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </p>
      </header>
      {error && (
        <div role="alert" className="admin-dashboard__error">
          <p>Chưa cập nhật được số liệu. Đang hiển thị lần tải gần nhất.</p>
          <Button variant="outline" onClick={() => void refresh()}>
            Thử lại
          </Button>
        </div>
      )}
      <div className="admin-dashboard__filters">
        <label htmlFor="admin-dashboard-person">Nhân sự:</label>
        <Combobox
          id="admin-dashboard-person"
          aria-label="Xem theo người"
          options={[
            { value: '', label: 'Tất cả' },
            ...people.map((user) => ({ value: user._id, label: user.name || user.username })),
          ]}
          value={person}
          onChange={setPerson}
        />
        <p>Bộ lọc áp dụng cho tiền thu, lớp và lịch chụp.</p>
      </div>
      <div className="admin-dashboard__metrics">
        <Link
          to="/manage/finance"
          className="admin-dashboard__metric admin-dashboard__metric--receipts"
        >
          <span>Tiền đã thu</span>
          <strong>{formatCurrency(stats.totals.income)}</strong>
          <small>Theo giao dịch thu đã ghi nhận</small>
        </Link>
        <Link to="/customers" className="admin-dashboard__metric">
          <span>Lớp mới</span>
          <strong>{number(stats.customerCount)}</strong>
          <small>Xem chi tiết →</small>
        </Link>
        <Link to="/schedules" className="admin-dashboard__metric">
          <span>Lịch chụp kỉ yếu</span>
          <strong>{number(stats.scheduleCount)}</strong>
          <small>Xem chi tiết →</small>
        </Link>
        <Link to="/customers/users" className="admin-dashboard__metric">
          <span>Tổng tài khoản</span>
          <strong>{users ? number(users.total) : '—'}</strong>
          <small>Toàn hệ thống · hiện có</small>
        </Link>
      </div>
      <div className="admin-dashboard__charts">
        <section className="admin-dashboard__chart" aria-labelledby="admin-receipt-title">
          <div className="admin-dashboard__section-head">
            <h2 id="admin-receipt-title">
              Tiền đã thu theo {chartView === 'month' ? 'tháng' : 'ngày'}
            </h2>
            <SegmentedControl
              value={chartView}
              onChange={setChartView}
              items={[
                { value: 'day', label: 'Ngày' },
                { value: 'month', label: 'Tháng' },
              ]}
            />
          </div>
          <div className="admin-dashboard__chart-meta">
            <p className="admin-dashboard__chart-note">Đơn vị: triệu đồng</p>
          </div>
          {receipts.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={receipts} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => number(Number(value) / 1000000)}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Tiền đã thu']}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 8,
                  }}
                />
                <Bar
                  dataKey="Thu"
                  name="Tiền đã thu"
                  fill="var(--staff-chart-income)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={72}
                  label={
                    receipts.length <= 12
                      ? {
                          position: 'top',
                          fontSize: 12,
                          fill: 'var(--staff-success-ink)',
                          formatter: (value: unknown) => `${number(Number(value) / 1000000)} tr`,
                        }
                      : undefined
                  }
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="admin-dashboard__empty">Chưa có giao dịch thu trong khoảng này.</p>
          )}
          <table className="sr-only">
            <caption>Tiền đã thu theo {chartView === 'month' ? 'tháng' : 'ngày'}</caption>
            <thead>
              <tr>
                <th>Kỳ</th>
                <th>Tiền đã thu</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{formatCurrency(row.Thu)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="admin-dashboard__chart" aria-labelledby="admin-users-title">
          <div className="admin-dashboard__section-head">
            <h2 id="admin-users-title">User mới theo tháng</h2>
          </div>
          {users ? (
            <>
              <div className="admin-dashboard__chart-meta">
                <p className="admin-dashboard__growth">
                  <strong>{number(users.current)}</strong> user mới trong tháng{' '}
                  {new Date(users.asOf).toLocaleDateString('en-GB', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    month: 'numeric',
                  })}
                  <span className={users.difference < 0 ? 'staff-ink-danger' : 'staff-ink-success'}>
                    {users.difference > 0 ? '+' : ''}
                    {number(users.difference)} user
                    {users.percent !== null
                      ? ` (${users.percent > 0 ? '+' : ''}${number(users.percent)}%)`
                      : ''}
                  </span>
                </p>
                <p className="admin-dashboard__chart-note">
                  So với {dateLabel(users.previousFrom)} –{' '}
                  {dateLabel(new Date(Date.parse(users.previousTo) - 1))}
                  {users.previous === 0 ? ' · Kỳ trước chưa có user mới' : ''}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart
                  data={userSeries}
                  margin={{ top: 16, right: 12, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 6"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [number(Number(value)), 'User mới']}
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Bar
                    dataKey="User"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={64}
                    label={{
                      position: 'top',
                      fontSize: 12,
                      fill: 'hsl(var(--primary))',
                      formatter: (value: unknown) => number(Number(value)),
                    }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="admin-dashboard__chart-foot">
                Toàn hệ thống · theo ngày tạo · 6 tháng đến {dateLabel(users.asOf)}
              </p>
              <table className="sr-only">
                <caption>User mới theo tháng</caption>
                <thead>
                  <tr>
                    <th>Tháng</th>
                    <th>User mới</th>
                  </tr>
                </thead>
                <tbody>
                  {userSeries.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{number(row.User)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="admin-dashboard__empty">Chưa tải được thống kê user. Vui lòng thử lại.</p>
          )}
        </section>
      </div>
      {stats.showSchedules && (
        <section className="admin-dashboard__schedules" aria-labelledby="admin-schedule-title">
          <div className="admin-dashboard__section-head">
            <h2 id="admin-schedule-title">Lịch chụp sắp tới</h2>
            <div className="admin-dashboard__schedule-actions">
              <SegmentedControl
                value={scheduleView}
                onChange={setScheduleView}
                items={[
                  { value: 'table', label: 'Bảng' },
                  { value: 'calendar', label: 'Lịch' },
                ]}
              />
              <Link to="/schedules">Xem tất cả →</Link>
            </div>
          </div>
          {scheduleView === 'calendar' ? (
            <ScheduleCalendar
              items={schedules.map((row) => ({
                ...row,
                className: row.customer?.className || '—',
                leadName: row.leadPhotographer?.name || row.leadPhotographer?.username,
              }))}
              maxBadges={2}
            />
          ) : schedules.length ? (
            <div className="admin-dashboard__table">
              <DataTable<UpcomingSchedule>
                aria-label="Lịch chụp sắp tới"
                variant="plain"
                data={schedules}
                columns={columns}
                keyExtractor={(row) => row._id}
              />
            </div>
          ) : (
            <p className="admin-dashboard__empty">Không có lịch chụp nào sắp tới.</p>
          )}
        </section>
      )}
    </div>
  );
}

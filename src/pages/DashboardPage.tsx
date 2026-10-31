import { useEffect, useState, useMemo } from 'react';
import { Calendar, Table as TableIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { UpcomingSchedule } from '../services/dashboardService';
import { formatCurrency, formatDate } from '../utils/format';
import { SCHEDULE_STATUS_LABEL, SCHEDULE_STATUS_COLOR } from '../utils/scheduleConstants';
import { ScheduleCalendar } from '../components/organisms';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Combobox,
  DataTable,
  FormField,
  PageHeader,
  PageLoader,
  SegmentedControl,
  StatCard,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;
  const showTotalCustomers = user?.roles.some((r) => r === 0 || r === 1 || r === 2) ?? false;
  const showFinance = user?.roles.some((r) => r === 0 || r === 1 || r === 2 || r === 5) ?? false;

  const dispatch = useAppDispatch();
  const { stats, error } = useAppSelector((s) => s.dashboard);
  const { list: users } = useAppSelector((s) => s.users);
  const { selectedSeasonId, list: seasons } = useAppSelector((s) => s.seasons);

  const [scheduleViewMode, setScheduleViewMode] = useState<'table' | 'calendar'>('table');
  const [filterUserId, setFilterUserId] = useState('');
  const [chartView, setChartView] = useState<'day' | 'month'>('month');
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const selectedSeason = useMemo(
    () => seasons.find((s) => s._id === selectedSeasonId),
    [seasons, selectedSeasonId],
  );

  // Re-fetch whenever season or user filter changes
  useEffect(() => {
    const params: { userId?: string; season?: string } = {};
    if (filterUserId) params.userId = filterUserId;
    if (selectedSeasonId) params.season = selectedSeasonId;
    dispatch(fetchDashboardStats(params));
    if (isAdmin) dispatch(fetchUsers());
  }, [dispatch, isAdmin, filterUserId, selectedSeasonId]);

  const calendarItems = useMemo(
    () =>
      (stats?.upcomingSchedules ?? []).map((s) => ({
        _id: s._id,
        shootDate: s.shootDate,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        status: s.status,
        className: s.customer?.className ?? '—',
        leadName: s.leadPhotographer
          ? (s.leadPhotographer.name ?? s.leadPhotographer.username)
          : undefined,
      })),
    [stats?.upcomingSchedules],
  );

  const retryStats = () =>
    dispatch(
      fetchDashboardStats({
        userId: filterUserId || undefined,
        season: selectedSeasonId || undefined,
      }),
    );
  if (!stats)
    return error ? (
      <div role="alert" className="rounded-lg border bg-card p-4 space-y-3">
        <p>Không tải được dashboard.</p>
        <Button variant="outline" onClick={retryStats}>
          Thử lại
        </Button>
      </div>
    ) : (
      <PageLoader />
    );

  const { totals, daily, customerCount, scheduleCount, showSchedules, upcomingSchedules } = stats;

  const displayName = user?.name ?? user?.username ?? '';
  const selectedUserName = filterUserId
    ? (users.find((u) => u._id === filterUserId)?.name ??
      users.find((u) => u._id === filterUserId)?.username ??
      '')
    : '';

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartBaseData =
    chartView === 'day'
      ? daily
      : (() => {
          const byMonth: Record<string, { income: number; expense: number }> = {};
          for (const d of daily) {
            const key = d.label.slice(0, 7); // YYYY-MM
            if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
            byMonth[key].income += d.income;
            byMonth[key].expense += d.expense;
          }
          return Object.entries(byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([label, v]) => ({ label: `${label}-01`, ...v }));
        })();

  const formatChartLabel = (label: string) => {
    const parts = label.split('-');
    if (chartView === 'month') return `${parts[1]}/${parts[0].slice(2)}`;
    return `${parts[2]}/${parts[1]}`;
  };

  const chartData = chartBaseData.reduce<
    Array<{
      name: string;
      Thu: number;
      Chi: number;
      'Chênh lệch thu–chi': number;
      'Chênh lệch lũy kế': number;
    }>
  >((acc, d) => {
    const profit = d.income - d.expense;
    const cumulative = (acc[acc.length - 1]?.['Chênh lệch lũy kế'] ?? 0) + profit;
    acc.push({
      name: formatChartLabel(d.label),
      Thu: d.income,
      Chi: d.expense,
      'Chênh lệch thu–chi': profit,
      'Chênh lệch lũy kế': cumulative,
    });
    return acc;
  }, []);

  // ── Stat cards ───────────────────────────────────────────────────────────────
  const cards = [
    {
      label: 'Lớp mới',
      value: customerCount,
      color: 'text-foreground',
      link: '/customers',
      show: showTotalCustomers,
    },
    {
      label: 'Lịch chụp',
      value: scheduleCount,
      color: 'text-foreground',
      link: '/schedules',
      show: showSchedules,
    },
    {
      label: 'Tổng thu',
      value: formatCurrency(totals.income),
      color: 'staff-ink-success',
      link: '/manage/finance',
      show: showFinance,
    },
    {
      label: 'Tổng chi',
      value: formatCurrency(totals.expense),
      color: 'staff-ink-danger',
      link: '/manage/finance',
      show: showFinance,
    },
    {
      label: 'Chênh lệch thu–chi',
      value: formatCurrency(totals.profit),
      color: totals.profit >= 0 ? 'staff-ink-success' : 'staff-ink-danger',
      link: '/manage/finance',
      show: showFinance,
    },
  ];

  // ── Upcoming schedule columns ────────────────────────────────────────────────
  const upcomingColumns: Column<UpcomingSchedule>[] = [
    {
      key: 'date',
      header: 'Ngày chụp',
      className: 'font-medium',
      render: (s) => formatDate(s.shootDate),
    },
    {
      key: 'time',
      header: 'Giờ',
      className: 'text-muted-foreground',
      render: (s) => `${s.startTime ?? '—'}${s.endTime ? ` – ${s.endTime}` : ''}`,
    },
    {
      key: 'class',
      header: 'Lớp',
      render: (s) => (
        <>
          {s.customer?.className ?? '—'}
          {s.customer?.school && (
            <span className="text-xs text-muted-foreground/70 ml-1">({s.customer.school})</span>
          )}
        </>
      ),
    },
    {
      key: 'location',
      header: 'Địa điểm',
      className: 'text-muted-foreground',
      render: (s) => s.location ?? '—',
    },
    {
      key: 'lead',
      header: 'Nhiếp ảnh chính',
      className: 'text-muted-foreground',
      render: (s) =>
        s.leadPhotographer ? (s.leadPhotographer.name ?? s.leadPhotographer.username) : '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => (
        <Badge
          variant="outline"
          className={cn('border-transparent', SCHEDULE_STATUS_COLOR[s.status] ?? '')}
        >
          {SCHEDULE_STATUS_LABEL[s.status] ?? s.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg border bg-card p-4 space-y-3">
          <p>Chưa cập nhật được số liệu. Đang hiển thị lần tải gần nhất.</p>
          <Button variant="outline" onClick={retryStats}>
            Thử lại
          </Button>
        </div>
      )}
      {/* Header */}
      <div>
        <PageHeader
          as="h1"
          title={`Xin chào, ${displayName}!`}
          description="Chúc bạn một ngày làm việc tốt lành!"
          className="mb-1"
        />
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Season banner */}
      {selectedSeason ? (
        <div className="rounded-lg border bg-card px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-semibold">{selectedSeason.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(selectedSeason.startDate)} – {formatDate(selectedSeason.endDate)}
          </span>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Chưa chọn mùa chụp — đang hiển thị dữ liệu 12 tháng gần đây.
        </div>
      )}

      {/* Admin user filter */}
      {isAdmin && (
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <FormField
              label="Xem theo người"
              htmlFor="dashboard-user"
              className="w-full sm:max-w-xs"
            >
              <Combobox
                id="dashboard-user"
                options={users.map((u) => ({ value: u._id, label: u.name ?? u.username }))}
                value={filterUserId}
                onChange={setFilterUserId}
                placeholder="Tất cả"
              />
            </FormField>
            {selectedUserName && (
              <span className="text-sm text-muted-foreground font-medium">
                — {selectedUserName}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards
          .filter((c) => c.show)
          .map((c) => (
            <StatCard key={c.label} to={c.link} label={c.label} value={c.value} color={c.color} />
          ))}
      </div>

      {/* Finance chart */}
      {showFinance && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold">Biểu đồ thu chi</h2>
              <SegmentedControl
                value={chartView}
                onChange={setChartView}
                items={[
                  { value: 'day', label: 'Ngày' },
                  { value: 'month', label: 'Tháng' },
                ]}
              />
            </div>

            {/* Legend */}
            <div className="mb-3 flex flex-wrap items-center gap-4 px-1">
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="staff-chart-key staff-chart-key--income" />
                Thu
              </span>
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="staff-chart-key staff-chart-key--expense" />
                Chi
              </span>
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="staff-chart-key staff-chart-key--difference" />
                Chênh lệch thu–chi
              </span>
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="staff-chart-key staff-chart-key--cumulative" />
                Chênh lệch lũy kế
              </span>
            </div>

            {chartData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">
                Không có dữ liệu tài chính trong khoảng thời gian này.
              </p>
            ) : (
              <div
                className="staff-chart rounded-lg p-2 border"
                aria-label="Biểu đồ thu, chi, chênh lệch và chênh lệch lũy kế"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 12, right: 20, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 8"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickMargin={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickCount={5}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => {
                        const abs = Math.abs(v);
                        return abs >= 1_000_000
                          ? `${(abs / 1_000_000).toFixed(0)}M`
                          : abs >= 1_000
                            ? `${(abs / 1_000).toFixed(0)}K`
                            : String(abs);
                      }}
                    />
                    <ReferenceLine y={0} stroke="rgba(203,213,225,0.5)" strokeWidth={1.2} />
                    <Tooltip
                      formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name]}
                      itemSorter={(item) =>
                        (
                          ({
                            Thu: 0,
                            Chi: 1,
                            'Chênh lệch thu–chi': 2,
                            'Chênh lệch lũy kế': 3,
                          }) as Record<string, number>
                        )[String(item.name ?? '')] ?? 99
                      }
                      cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: 'var(--modal-shadow)',
                      }}
                      labelStyle={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar
                      dataKey="Thu"
                      fill="var(--staff-chart-income)"
                      isAnimationActive={!reducedMotion}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                    <Bar
                      dataKey="Chi"
                      fill="var(--staff-chart-expense)"
                      isAnimationActive={!reducedMotion}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                    <Line
                      type="monotone"
                      dataKey="Chênh lệch thu–chi"
                      stroke="var(--staff-chart-difference)"
                      isAnimationActive={!reducedMotion}
                      strokeWidth={2.5}
                      strokeDasharray="5 3"
                      dot={{
                        r: 3,
                        strokeWidth: 1.5,
                        stroke: 'var(--staff-chart-difference)',
                        fill: 'hsl(var(--card))',
                      }}
                      activeDot={{
                        r: 5,
                        strokeWidth: 2,
                        stroke: 'var(--staff-chart-difference)',
                        fill: 'hsl(var(--card))',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Chênh lệch lũy kế"
                      stroke="var(--staff-chart-cumulative)"
                      isAnimationActive={!reducedMotion}
                      strokeWidth={3}
                      dot={{
                        r: 3,
                        strokeWidth: 1.5,
                        stroke: 'var(--staff-chart-cumulative)',
                        fill: 'hsl(var(--card))',
                      }}
                      activeDot={{
                        r: 5,
                        strokeWidth: 2,
                        stroke: 'var(--staff-chart-cumulative)',
                        fill: 'hsl(var(--card))',
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming schedules */}
      {showSchedules && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Lịch chụp sắp tới</h2>
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl
                  value={scheduleViewMode}
                  onChange={setScheduleViewMode}
                  items={[
                    {
                      value: 'table',
                      label: 'Bảng',
                      icon: <TableIcon className="h-3.5 w-3.5" />,
                    },
                    {
                      value: 'calendar',
                      label: 'Lịch',
                      icon: <Calendar className="h-3.5 w-3.5" />,
                    },
                  ]}
                />
                <Link to="/schedules" className="text-sm text-primary hover:underline">
                  Xem tất cả →
                </Link>
              </div>
            </div>

            {scheduleViewMode === 'calendar' ? (
              <ScheduleCalendar items={calendarItems} maxBadges={2} />
            ) : upcomingSchedules.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có lịch chụp nào sắp tới.</p>
            ) : (
              <>
                <div className="min-w-0 overflow-x-auto">
                  <DataTable<UpcomingSchedule>
                    aria-label="Lịch chụp sắp tới"
                    variant="plain"
                    data={upcomingSchedules as UpcomingSchedule[]}
                    keyExtractor={(s) => s._id}
                    columns={upcomingColumns}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;

import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CalendarClock,
  Camera,
  ChevronRight,
  CircleCheck,
  ClockAlert,
  MessageSquare,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '../context/AuthContext';
import { useAppSelector } from '../store';
import { conceptBookingEnabled } from '../config/features';
import { vietnamCalendarDate, vietnamDisplayDate } from '../utils/vietnamCalendarDate';
import { bookingOrderStageLabels } from '../services/bookingWorkflowService';
import {
  photographerDashboardService,
  photographerMetricLabels,
  type DashboardOrderRow,
  type PhotographerMetric,
  type PhotographerPeriod,
  type PhotographerStats,
} from '../services/photographerDashboardService';
import '../styles/photographer-dashboard.css';

const metricHints: Record<PhotographerMetric, string> = {
  shoots: '',
  upcoming: 'Trong 7 ngày tới',
  editing: 'Cần xử lý ảnh',
  review: 'Đã bàn giao ảnh',
  completed: 'Hoàn tất trong kỳ đã chọn',
  overdue: 'Cần ưu tiên xử lý',
};
const metricIcons = {
  shoots: Camera,
  upcoming: CalendarClock,
  editing: SlidersHorizontal,
  review: MessageSquare,
  completed: CircleCheck,
  overdue: ClockAlert,
};
const roles = { lead: 'Thợ chính', support: 'Thợ phụ', editor: 'Hậu kỳ' };

export default function PhotographerDashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { selectedSeasonId } = useAppSelector((state) => state.seasons);
  const [params, setParams] = useSearchParams();
  const requestedPeriod = params.get('period') || 'month';
  const period = (
    ['month', 'previous', 'quarter', 'year'].includes(requestedPeriod) ? requestedPeriod : 'month'
  ) as PhotographerPeriod;
  const service =
    params.get('service') === 'yearbook' ||
    (params.get('service') === 'concept' && conceptBookingEnabled)
      ? params.get('service')!
      : '';
  const requestedMetric = params.get('metric') || '';
  const metric =
    requestedMetric === 'group' || Object.keys(photographerMetricLabels).includes(requestedMetric)
      ? requestedMetric
      : '';
  const group = Math.max(0, Math.min(4, Number(params.get('group')) || 0));
  const requestedPage = Number(params.get('page'));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000
      ? requestedPage
      : 1;
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: PhotographerStats;
    error?: boolean;
  } | null>(null);
  const key = `${user?._id}:${selectedSeasonId}:${period}:${service}:${metric}:${group}:${page}:${reload}`;
  const loading = result?.key !== key,
    data = !loading ? result?.data : undefined;
  const error = !loading && result?.error;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    photographerDashboardService
      .get(
        {
          period,
          service,
          season: selectedSeasonId || undefined,
          metric: metric || undefined,
          group: metric === 'group' ? group : undefined,
          page,
        },
        controller.signal,
      )
      .then(
        (value) => {
          if (active) setResult({ key, data: value });
        },
        () => {
          if (active) setResult({ key, error: true });
        },
      );
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, selectedSeasonId, period, service, metric, group, page]);
  useEffect(() => {
    const refresh = () => setReload((value) => value + 1);
    window.addEventListener('focus', refresh);
    const delay = Date.parse(data?.nextRefreshAt || '') - Date.now();
    const timer = Number.isFinite(delay)
      ? window.setTimeout(refresh, Math.max(1000, Math.min(delay, 2147483647)))
      : undefined;
    return () => {
      window.removeEventListener('focus', refresh);
      window.clearTimeout(timer);
    };
  }, [data?.nextRefreshAt]);

  const today = vietnamCalendarDate(data?.now || new Date().toISOString());
  const [year, month] = today.split('-').map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const periodNames: Record<PhotographerPeriod, string> = {
    month: `Tháng ${month}, ${year}`,
    previous: `Tháng ${previous.getUTCMonth() + 1}, ${previous.getUTCFullYear()}`,
    quarter: `Quý ${['I', 'II', 'III', 'IV'][Math.floor((month - 1) / 3)]}, ${year}`,
    year: `Năm ${year}`,
  };
  const update = (name: string, value: string) =>
    setParams((previousParams) => {
      const next = new URLSearchParams(previousParams);
      if (value) next.set(name, value);
      else next.delete(name);
      next.delete('page');
      if (name === 'period' && metric === 'group') {
        next.delete('metric');
        next.delete('group');
      }
      return next;
    });
  const openMetric = (value: string, bucket?: string) =>
    setParams((previousParams) => {
      const next = new URLSearchParams(previousParams);
      next.set('metric', value);
      next.delete('page');
      if (bucket !== undefined) next.set('group', bucket);
      else next.delete('group');
      return next;
    });
  const recordTo = (row: DashboardOrderRow) =>
    row.service === 'concept' ? `/concept-orders/${row._id}` : `/workflow-bookings/${row._id}`;
  const returnState = { bookingOrdersReturnTo: location.pathname + location.search };
  const deadline = (row: DashboardOrderRow) => {
    if (!row.deadline) return { text: 'Chưa có hạn bàn giao', kind: '' };
    const day = vietnamCalendarDate(row.deadline);
    if (!day) return { text: 'Chưa có hạn bàn giao', kind: '' };
    const days = Math.round((Date.parse(day) - Date.parse(today)) / 86400000);
    return {
      text: days < 0 ? `Quá hạn ${-days} ngày` : days === 0 ? 'Hạn hôm nay' : `Còn ${days} ngày`,
      kind: days < 0 ? ' yd-tag-danger' : ' yd-tag-warn',
    };
  };
  const detailTitle =
    metric === 'group'
      ? `Buổi chụp · ${data?.chart.find((bucket) => bucket.key === String(group))?.label || ''}`
      : photographerMetricLabels[metric as PhotographerMetric];
  const maximum = Math.max(
    4,
    Math.ceil(
      Math.max(0, ...(data?.chart || []).map((bucket) => bucket.concept + bucket.yearbook)) / 4,
    ) * 4,
  );

  return (
    <section id="yume-photographer-dashboard" aria-label="Thống kê công việc của tôi">
      {!!metric && (
        <button
          type="button"
          className="yd-back app-back-link"
          onClick={() =>
            setParams((previousParams) => {
              const next = new URLSearchParams(previousParams);
              next.delete('metric');
              next.delete('group');
              next.delete('page');
              return next;
            })
          }
        >
          <ArrowLeft aria-hidden="true" />
          Quay lại thống kê
        </button>
      )}
      <header className="yd-header">
        <h1>{metric ? detailTitle : 'Thống kê của tôi'}</h1>
        <p className="yd-subtitle">
          {metric
            ? `${periodNames[period]} · ${service === 'concept' ? 'Concept' : service === 'yearbook' ? 'Kỉ yếu' : 'Concept và kỉ yếu'}`
            : `Theo dõi công việc được phân công cho ${user?.name || user?.username || 'bạn'}.`}
        </p>
      </header>
      <div className="yd-toolbar">
        <label className="yd-field">
          Thời gian
          <select value={period} onChange={(event) => update('period', event.target.value)}>
            {Object.entries(periodNames).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="yd-field">
          Loại dịch vụ
          <select value={service} onChange={(event) => update('service', event.target.value)}>
            <option value="">Tất cả dịch vụ</option>
            {conceptBookingEnabled && <option value="concept">Concept</option>}
            <option value="yearbook">Kỉ yếu</option>
          </select>
        </label>
        <div className="yd-today">
          <Calendar aria-hidden="true" />
          {new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(new Date(today + 'T00:00:00+07:00'))}
        </div>
      </div>
      {loading && (
        <p className="yd-empty" role="status">
          Đang tải thống kê…
        </p>
      )}
      {error && (
        <div className="yd-error" role="alert">
          <p>Không tải được thống kê. Vui lòng thử lại.</p>
          <Button variant="outline" onClick={() => setReload((value) => value + 1)}>
            Thử lại
          </Button>
        </div>
      )}
      {data && !metric && (
        <div id="yd-overview">
          <section className="yd-stats" aria-label="Chỉ số công việc">
            {(Object.entries(photographerMetricLabels) as [PhotographerMetric, string][]).map(
              ([name, label]) => {
                const Icon = metricIcons[name];
                return (
                  <button
                    type="button"
                    className="yd-stat"
                    data-metric={name}
                    key={name}
                    onClick={() => openMetric(name)}
                  >
                    <span className="yd-stat-label">
                      {label}
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="yd-stat-value">
                      {data.counts[name]}
                      <span className="yd-stat-unit">
                        {name === 'shoots' || name === 'upcoming' ? 'buổi' : 'đơn'}
                      </span>
                    </span>
                    <span className="yd-stat-note">
                      {name === 'shoots'
                        ? `${data.breakdown.concept} concept · ${data.breakdown.yearbook} kỉ yếu`
                        : metricHints[name]}
                    </span>
                  </button>
                );
              },
            )}
          </section>
          <div className="yd-columns">
            <section className="yd-panel" aria-labelledby="yd-chart-title">
              <header className="yd-panel-head">
                <div>
                  <h2 id="yd-chart-title">Khối lượng chụp</h2>
                  <p className="yd-panel-sub">
                    {data.counts.shoots} buổi được phân công ·{' '}
                    {period === 'month' || period === 'previous'
                      ? 'Theo tuần trong tháng'
                      : period === 'quarter'
                        ? 'Theo tháng'
                        : 'Theo quý'}
                  </p>
                </div>
              </header>
              <div className="yd-chart">
                <div className="yd-chart-body">
                  <div className="yd-axis" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, index) => (
                      <span key={index} style={{ top: `${index * 25}%` }}>
                        {maximum - (index * maximum) / 4}
                      </span>
                    ))}
                  </div>
                  <div className="yd-chart-right">
                    <div
                      className="yd-plot"
                      role="group"
                      aria-label="Số buổi chụp theo thời gian, phân biệt concept và kỉ yếu"
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <span
                          key={`grid-${index}`}
                          className="yd-gridline"
                          style={{ top: `${index * 25}%` }}
                          aria-hidden="true"
                        />
                      ))}
                      {data.chart.map((bucket) => {
                        const total = bucket.concept + bucket.yearbook;
                        return (
                          <button
                            type="button"
                            className="yd-column"
                            key={bucket.key}
                            onClick={() => openMetric('group', bucket.key)}
                            aria-label={`${bucket.label}: ${total} buổi, ${bucket.concept} concept và ${bucket.yearbook} kỉ yếu`}
                          >
                            <span
                              className="yd-stack"
                              style={{ height: `${(total / maximum) * 100}%` }}
                            >
                              <span className="yd-stack-value">{total}</span>
                              <span
                                className="yd-bar-concept"
                                style={{ height: `${total ? (bucket.concept / total) * 100 : 0}%` }}
                              />
                              <span
                                className="yd-bar-yearbook"
                                style={{
                                  height: `${total ? (bucket.yearbook / total) * 100 : 0}%`,
                                }}
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="yd-chart-labels" aria-hidden="true">
                      {data.chart.map((bucket) => (
                        <span key={bucket.key}>{bucket.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="yd-legend">
                  <span>
                    <b className="yd-dot" aria-hidden="true" />
                    Concept
                  </span>
                  <span>
                    <b className="yd-dot yd-dot-yearbook" aria-hidden="true" />
                    Kỉ yếu
                  </span>
                </div>
              </div>
            </section>
            <section className="yd-panel" aria-labelledby="yd-priority-title">
              <header className="yd-panel-head">
                <div>
                  <h2 id="yd-priority-title">Cần xử lý</h2>
                  <p className="yd-panel-sub">Ưu tiên theo hạn bàn giao</p>
                </div>
                <button
                  type="button"
                  className="yd-text-button"
                  onClick={() => openMetric('editing')}
                >
                  Xem tất cả
                  <ArrowUpRight aria-hidden="true" />
                </button>
              </header>
              <div className="yd-tasks">
                {data.priority.length ? (
                  data.priority.map((row) => {
                    const due = deadline(row);
                    return (
                      <article className="yd-task" key={`${row.service}:${row._id}`}>
                        <div className="yd-task-top">
                          <Link className="yd-task-title" to={recordTo(row)} state={returnState}>
                            {row.title}
                          </Link>
                          <span className={`yd-tag${due.kind}`}>{due.text}</span>
                        </div>
                        <p className="yd-task-meta">
                          {row.service === 'concept' ? 'Concept' : 'Kỉ yếu'}
                          {row.deadline ? ` · Hạn ${vietnamDisplayDate(row.deadline)}` : ''}
                        </p>
                      </article>
                    );
                  })
                ) : (
                  <p className="yd-empty">Không có đơn cần xử lý trong kỳ này.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
      {data && !!metric && (
        <section className="yd-panel" aria-label="Chi tiết chỉ số">
          <header className="yd-panel-head">
            <div>
              <h2>
                {data.detail?.total || 0}{' '}
                {['shoots', 'upcoming', 'group'].includes(metric) ? 'buổi chụp' : 'đơn chụp ảnh'}
              </h2>
              <p className="yd-panel-sub">Được phân công cho {user?.name || user?.username}</p>
            </div>
          </header>
          <div className="yd-list">
            {data.detail?.rows.length ? (
              data.detail.rows.map((row) => (
                <article className="yd-shoot-row" key={`${row.service}:${row._id}`}>
                  <div className="yd-date-block">
                    <strong>{Number(vietnamCalendarDate(row.shootDate).slice(8))}</strong>
                    <small>Tháng {Number(vietnamCalendarDate(row.shootDate).slice(5, 7))}</small>
                  </div>
                  <div>
                    <div className="yd-shoot-title">
                      <Link className="yd-task-title" to={recordTo(row)} state={returnState}>
                        {row.title}
                      </Link>
                      <span className={`yd-tag yd-tag-${row.service}`}>
                        {row.service === 'concept' ? 'Concept' : 'Kỉ yếu'}
                      </span>
                    </div>
                    <p className="yd-shoot-meta">
                      {metric === 'review' ? 'Chờ nghiệm thu' : bookingOrderStageLabels[row.stage]}
                      {row.location ? ` · ${row.location}` : ''}
                      {row.deadline ? ` · Hạn ${vietnamDisplayDate(row.deadline)}` : ''}
                    </p>
                  </div>
                  <div className="yd-shoot-time">
                    {row.startTime
                      ? `${row.startTime}${row.endTime ? `–${row.endTime}` : ''}`
                      : 'Chưa chốt giờ'}
                    <small>{roles[row.role]}</small>
                  </div>
                  <Link
                    className="yd-icon-button"
                    to={recordTo(row)}
                    state={returnState}
                    aria-label={`Xem hồ sơ ${row.title}`}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </article>
              ))
            ) : (
              <p className="yd-empty">Chưa có công việc phù hợp.</p>
            )}
          </div>
          {!!data.detail?.total && (
            <div className="yd-pagination">
              <span>
                Trang {page} · {data.detail.total} kết quả
              </span>
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() =>
                  setParams((previousParams) => {
                    const next = new URLSearchParams(previousParams);
                    next.set('page', String(page - 1));
                    return next;
                  })
                }
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                disabled={page * 20 >= data.detail.total}
                onClick={() =>
                  setParams((previousParams) => {
                    const next = new URLSearchParams(previousParams);
                    next.set('page', String(page + 1));
                    return next;
                  })
                }
              >
                Trang sau
              </Button>
            </div>
          )}
        </section>
      )}
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ExternalLink, List } from 'lucide-react';
import { userService } from '../services/userService';
import { scheduleService, type PersonalSchedule } from '../services/scheduleService';
import type { ScheduleResponse, User } from '../types';
import { formatDate } from '../utils/format';
import { vietnamCalendarDate } from '../utils/vietnamCalendarDate';
import { SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from '../utils/scheduleConstants';
import PhotographerCalendarView from '../components/PhotographerCalendarView';
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  PageLoader,
  SegmentedControl,
  TableSkeleton,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

type ViewMode = 'calendar' | 'list';

const PhotographerManageDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const savedReturnTo = (location.state as { photographersReturnTo?: unknown } | null)
    ?.photographersReturnTo;
  const returnTo =
    typeof savedReturnTo === 'string' && savedReturnTo.startsWith('/staff/photographers')
      ? savedReturnTo
      : '/staff/photographers';

  const [photographer, setPhotographer] = useState<User | null>(null);
  const [userError, setUserError] = useState(false);
  const [reload, setReload] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [focusDayRequest, setFocusDayRequest] = useState<{
    day: string;
    eventId?: string | null;
    nonce: number;
  } | null>(null);

  const [allSchedules, setAllSchedules] = useState<ScheduleResponse[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setPhotographer(null);
    setUserError(false);
    setListLoading(true);
    setListError(false);

    userService.getOne(id).then(
      (result) => {
        if (!active) return;
        if (!result.roles?.includes(3)) {
          setUserError(true);
          return;
        }
        setPhotographer(result);
      },
      () => {
        if (active) setUserError(true);
      },
    );

    scheduleService.getAll({ photographer: id, limit: 100 }).then(
      (result) => {
        if (!active) return;
        setAllSchedules(result.data);
        setListLoading(false);
      },
      () => {
        if (!active) return;
        setListError(true);
        setListLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [id, reload]);

  const loadCalendarEvents = useCallback(
    (from: string, to: string, signal: AbortSignal) =>
      id ? scheduleService.photographerCalendar(id, from, to, signal) : Promise.resolve([]),
    [id],
  );

  const openOrderDetail = useCallback(
    (links: { workflowBooking?: string; conceptOrder?: string }) => {
      const state = {
        bookingOrdersReturnTo: location.pathname + location.search,
        photographersReturnTo: returnTo,
      };
      if (links.workflowBooking) {
        navigate(`/workflow-bookings/${links.workflowBooking}`, { state });
      } else if (links.conceptOrder) {
        navigate(`/concept-orders/${links.conceptOrder}`, { state });
      }
    },
    [location.pathname, location.search, navigate, returnTo],
  );

  const handleOpenCalendarOrder = useCallback(
    (event: PersonalSchedule) => openOrderDetail(event),
    [openOrderDetail],
  );

  const stats = useMemo(() => {
    const today = vietnamCalendarDate(new Date().toISOString());
    const active = allSchedules.filter((s) => s.status !== 'cancelled');
    const upcoming = active.filter(
      (s) => s.status !== 'completed' && vietnamCalendarDate(s.shootDate) >= today,
    );
    const completed = active.filter((s) => s.status === 'completed');
    return { total: active.length, upcoming: upcoming.length, completed: completed.length };
  }, [allSchedules]);

  if (userError) {
    return (
      <div role="alert" className="space-y-3">
        <Link
          to={returnTo}
          className="app-back-link inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quản lý thợ
        </Link>
        <p className="text-sm text-destructive">
          Không tìm thấy thông tin thợ chụp ảnh hoặc không thể tải dữ liệu.
        </p>
        <Button variant="outline" size="sm" onClick={() => setReload((v) => v + 1)}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!photographer) return <PageLoader />;

  const displayName = photographer.name?.trim() || photographer.username;

  const scheduleColumns: Column<ScheduleResponse>[] = [
    {
      key: 'date',
      header: 'Ngày chụp',
      render: (row) => (
        <div>
          <p className="font-medium">{formatDate(row.shootDate)}</p>
          <p className="text-xs text-muted-foreground">
            {row.startTime
              ? `${row.startTime}${row.endTime ? ` – ${row.endTime}` : ''}`
              : 'Chưa chốt giờ'}
          </p>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Buổi chụp',
      render: (row) => (
        <div>
          <p className="font-medium">
            {row.conceptOrder
              ? row.conceptTitle || 'Chụp concept'
              : row.customer?.className || row.package?.name || 'Chụp kỉ yếu'}
          </p>
          {row.customer?.school && (
            <p className="text-xs text-muted-foreground">{row.customer.school}</p>
          )}
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Dịch vụ',
      render: (row) => (
        <Badge variant="outline">{row.conceptOrder ? 'Chụp concept' : 'Chụp kỉ yếu'}</Badge>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò',
      render: (row) => {
        const isLead = String(row.leadPhotographer?._id || '') === String(photographer._id);
        return (
          <span className={cn('text-sm', isLead ? 'font-semibold' : 'text-muted-foreground')}>
            {isLead ? 'Thợ chính' : 'Thợ phụ'}
          </span>
        );
      },
    },
    {
      key: 'location',
      header: 'Địa điểm',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.location || 'Chưa chốt'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <Badge variant="outline" className={cn(SCHEDULE_STATUS_COLOR[row.status])}>
          {SCHEDULE_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFocusDayRequest({
                day: vietnamCalendarDate(row.shootDate),
                eventId: row._id,
                nonce: Date.now(),
              });
              setViewMode('calendar');
            }}
          >
            Xem trên lịch
          </Button>
          {(row.workflowBooking || row.conceptOrder) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => openOrderDetail(row)}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Đơn chụp
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={returnTo}
          className="app-back-link text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quản lý thợ
        </Link>
      </div>

      <Card>
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <Badge
                variant="outline"
                className={
                  photographer.isActive
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-500/30 bg-slate-500/10 text-muted-foreground'
                }
              >
                {photographer.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              @{photographer.username}
              {photographer.email ? ` · ${photographer.email}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="rounded-lg border px-3 py-2 text-center min-w-[5.5rem]">
              <p className="text-xs text-muted-foreground">Sắp tới</p>
              <p className="text-lg font-semibold">{stats.upcoming}</p>
            </div>
            <div className="rounded-lg border px-3 py-2 text-center min-w-[5.5rem]">
              <p className="text-xs text-muted-foreground">Đã chụp</p>
              <p className="text-lg font-semibold">{stats.completed}</p>
            </div>
            <div className="rounded-lg border px-3 py-2 text-center min-w-[5.5rem]">
              <p className="text-xs text-muted-foreground">Tổng lịch</p>
              <p className="text-lg font-semibold">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<ViewMode>
          value={viewMode}
          onChange={setViewMode}
          items={[
            {
              value: 'calendar',
              label: 'Lịch theo tháng',
              icon: <CalendarDays className="h-4 w-4" aria-hidden="true" />,
            },
            {
              value: 'list',
              label: `Danh sách buổi chụp (${allSchedules.length})`,
              icon: <List className="h-4 w-4" aria-hidden="true" />,
            },
          ]}
        />
      </div>

      {viewMode === 'calendar' ? (
        <PhotographerCalendarView
          title={`Lịch chụp của ${displayName}`}
          subtitle="Theo dõi toàn bộ lịch chụp kỉ yếu và concept được phân công."
          photographerLabel={displayName}
          requestIdentity={photographer._id}
          loadEvents={loadCalendarEvents}
          emptyDayText="Thợ này chưa có buổi chụp nào trong ngày đã chọn."
          rolePrefix="Vai trò"
          onOpenOrder={handleOpenCalendarOrder}
          focusDayRequest={focusDayRequest}
        />
      ) : listError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3"
        >
          <p className="text-sm text-destructive font-medium">
            Không tải được danh sách buổi chụp của thợ.
          </p>
          <Button variant="outline" size="sm" onClick={() => setReload((v) => v + 1)}>
            Thử lại
          </Button>
        </div>
      ) : listLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : allSchedules.length === 0 ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center space-y-2">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Chưa có lịch chụp</p>
          <p className="text-sm text-muted-foreground">
            Thợ này chưa được phân công buổi chụp nào.
          </p>
        </div>
      ) : (
        <DataTable
          columns={scheduleColumns}
          data={allSchedules}
          keyExtractor={(row) => row._id}
          aria-label={`Danh sách lịch chụp của ${displayName}`}
        />
      )}
    </div>
  );
};

export default PhotographerManageDetailPage;

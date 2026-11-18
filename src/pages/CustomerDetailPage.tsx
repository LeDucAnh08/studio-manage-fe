import { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { customerService } from '../services/customerService';
import { scheduleService } from '../services/scheduleService';
import { formatDate } from '../utils/format';
import type { Customer, ScheduleResponse } from '../types';
import { SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from '../utils/scheduleConstants';
import { Badge, Button, Card, CardContent, DataTable, PageLoader } from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';
import ClassStudents from '../components/ClassStudents';
import { useAuth } from '../context/AuthContext';

const crewName = (person: ScheduleResponse['leadPhotographer']) =>
  person?.name?.trim() || person?.username || 'Chưa phân công';

const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canOpenOrders = !!user?.roles.some((role) => [0, 1, 3, 5].includes(role));
  const savedReturnTo = location.state?.classListReturnTo;
  const returnTo =
    typeof savedReturnTo === 'string' && savedReturnTo.startsWith('/customers?')
      ? savedReturnTo
      : '/customers';
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [scheduleState, setScheduleState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!id) return;
    let active = true;
    setCustomer(null);
    setError(false);
    setScheduleState('loading');
    customerService.getOne(id).then(
      (result) => {
        if (active) setCustomer(result);
      },
      () => {
        if (active) setError(true);
      },
    );
    scheduleService.getAll({ customer: id, limit: 100 }).then(
      (result) => {
        if (!active) return;
        setSchedules(result.data);
        setScheduleState('ready');
      },
      () => {
        if (active) setScheduleState('error');
      },
    );
    return () => {
      active = false;
    };
  }, [id, reload]);

  if (error)
    return (
      <div role="alert" className="space-y-3">
        <Link to={returnTo} className="app-back-link inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Danh sách lớp
        </Link>
        <p>Không tải được thông tin lớp. Vui lòng thử lại.</p>
        <Button variant="outline" onClick={() => setReload((value) => value + 1)}>
          Thử lại
        </Button>
      </div>
    );
  if (!customer) return <PageLoader />;
  const orderState = {
    bookingOrdersReturnTo: location.pathname,
    classListReturnTo: returnTo,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={returnTo}
          className="app-back-link text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách lớp
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-1">{customer.className}</h1>
          <p className="text-muted-foreground">{customer.school}</p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Liên hệ:</span>{' '}
              <span className="font-medium">{customer.contactName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">SĐT:</span>{' '}
              <span className="font-medium">{customer.contactPhone}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Địa chỉ:</span>{' '}
              <span className="font-medium">{customer.contactAddress}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sĩ số:</span>{' '}
              <span className="font-medium">{customer.total}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nam:</span>{' '}
              <span className="font-medium">{customer.totalMale ?? 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nữ:</span>{' '}
              <span className="font-medium">{customer.totalFemale ?? 0}</span>
            </div>
          </div>
          {customer.notes && <p className="mt-3 text-sm text-muted-foreground">{customer.notes}</p>}
        </CardContent>
      </Card>

      <ClassStudents key={customer._id} customerId={customer._id} />

      {scheduleState === 'error' && (
        <p role="status" className="text-sm text-muted-foreground">
          Chưa tải được lịch chụp của lớp.
        </p>
      )}
      {scheduleState === 'ready' && (
        <>
          {/* Schedules */}
          <DataTable<ScheduleResponse>
            title="Lịch chụp"
            data={schedules}
            keyExtractor={(s) => s._id}
            emptyTitle="Chưa có lịch"
            onRowClick={
              canOpenOrders
                ? (schedule) => {
                    if (schedule.workflowBooking)
                      navigate(
                        `/workflow-bookings/${encodeURIComponent(schedule.workflowBooking)}`,
                        { state: orderState },
                      );
                  }
                : undefined
            }
            rowClassName={(schedule) => (schedule.workflowBooking ? '' : '!cursor-default')}
            columns={[
              {
                key: 'date',
                header: 'Ngày',
                render: (s) =>
                  s.workflowBooking && canOpenOrders ? (
                    <Link
                      to={`/workflow-bookings/${encodeURIComponent(s.workflowBooking)}`}
                      state={orderState}
                      className="font-medium text-primary hover:underline"
                      aria-label={`Xem đơn chụp ngày ${formatDate(s.shootDate)}`}
                    >
                      {formatDate(s.shootDate)}
                    </Link>
                  ) : (
                    formatDate(s.shootDate)
                  ),
              },
              {
                key: 'time',
                header: 'Giờ',
                render: (s) => (
                  <span className="text-muted-foreground">
                    {s.startTime}
                    {s.endTime ? ` – ${s.endTime}` : ''}
                  </span>
                ),
              },
              {
                key: 'location',
                header: 'Địa điểm',
                render: (s) => <span className="text-muted-foreground">{s.location}</span>,
              },
              {
                key: 'crew',
                header: 'Ekip',
                render: (s) => (
                  <div className="min-w-[180px] text-muted-foreground">
                    <p>Chính: {crewName(s.leadPhotographer)}</p>
                    {s.supportPhotographers.length > 0 && (
                      <p className="mt-1 text-xs">
                        Hỗ trợ: {s.supportPhotographers.map(crewName).join(', ')}
                      </p>
                    )}
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: (s) => (
                  <Badge
                    variant="outline"
                    className={cn('border-transparent', SCHEDULE_STATUS_COLOR[s.status])}
                  >
                    {SCHEDULE_STATUS_LABEL[s.status]}
                  </Badge>
                ),
              } satisfies Column<ScheduleResponse>,
            ]}
          />
        </>
      )}
    </div>
  );
};

export default CustomerDetailPage;

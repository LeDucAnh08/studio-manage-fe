import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button, DataTable, PageHeader, type Column } from '@/components/ui';
import { useAuth } from '../context/AuthContext';
import { conceptBookingEnabled } from '../config/features';
import { bookingOrderStageLabels } from '../services/bookingWorkflowService';
import {
  photographerOrdersService,
  type PhotographerOrder,
} from '../services/photographerOrdersService';
import { useShootWindowRefresh } from '../components/customer/useShootWindowRefresh';

const date = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const roles = { lead: 'Thợ chính', support: 'Thợ phụ', editor: 'Hậu kỳ' };

export default function PhotographerOrdersPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const requestedService = params.get('service') || '';
  const service =
    requestedService === 'yearbook' || (requestedService === 'concept' && conceptBookingEnabled)
      ? requestedService
      : '';
  const requestedStage = params.get('view') || '';
  const stage = Object.keys(bookingOrderStageLabels).includes(requestedStage) ? requestedStage : '';
  const requestedPage = Number(params.get('page') || 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000
      ? requestedPage
      : 1;
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    rows: PhotographerOrder[];
    total: number;
    error: string;
  } | null>(null);
  const key = `${user?._id}:${page}:${service}:${stage}:${reload}`;
  const loading = result?.key !== key;
  const rows = !loading && result ? result.rows : [];
  const error = !loading && result?.error;
  useShootWindowRefresh(rows, setReload);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    photographerOrdersService.list(page, service, stage, controller.signal).then(
      (response) => {
        if (active)
          setResult({ key, rows: response.data, total: response.pagination.total, error: '' });
      },
      () => {
        if (active)
          setResult({
            key,
            rows: [],
            total: 0,
            error: 'Không tải được danh sách đơn chụp ảnh. Vui lòng thử lại.',
          });
      },
    );
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, page, service, stage]);

  const changeFilter = (name: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(name, value);
      else next.delete(name);
      next.delete('page');
      return next;
    });
  const columns: Column<PhotographerOrder>[] = [
    {
      key: 'order',
      header: 'Đơn chụp',
      className: 'min-w-[180px]',
      render: (item) => (
        <div>
          <Link
            className="font-medium text-primary hover:underline"
            to={
              item.service === 'concept'
                ? `/concept-orders/${item._id}`
                : `/workflow-bookings/${item._id}`
            }
            state={{
              bookingOrdersReturnTo: `/workflow-bookings${params.toString() ? `?${params}` : ''}`,
            }}
          >
            {item.title || item.packageName}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">#{item._id.slice(-6)}</p>
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Loại dịch vụ',
      render: (item) => (
        <Badge variant="secondary">{item.service === 'concept' ? 'Concept' : 'Kỉ yếu'}</Badge>
      ),
    },
    {
      key: 'package',
      header: 'Gói dịch vụ',
      className: 'min-w-[160px]',
      render: (item) => item.packageName,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'min-w-[150px]',
      render: (item) => (
        <Badge
          variant={
            ['cancelled', 'rejected'].includes(item.stage)
              ? 'destructive'
              : item.stage === 'pending'
                ? 'warning'
                : 'secondary'
          }
        >
          {bookingOrderStageLabels[item.stage]}
        </Badge>
      ),
    },
    {
      key: 'shoot',
      header: 'Ngày chụp',
      className: 'whitespace-nowrap',
      render: (item) =>
        item.shootDate
          ? `${date(item.shootDate)}${item.startTime ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ''}` : ''}`
          : 'Chưa chốt lịch',
    },
    { key: 'role', header: 'Vai trò của bạn', render: (item) => roles[item.role] },
    {
      key: 'updated',
      header: 'Cập nhật',
      className: 'whitespace-nowrap',
      render: (item) => date(item.updatedAt),
    },
  ];
  return (
    <section className="space-y-6 min-w-0">
      <PageHeader
        as="h1"
        title="Đơn chụp ảnh"
        description="Theo dõi đơn concept và kỉ yếu được phân công cho bạn."
        action={
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => setReload((value) => value + 1)}
          >
            Tải lại
          </Button>
        }
      />
      <div className="staff-toolbar flex flex-wrap gap-4 rounded-lg border bg-card p-4">
        <label className="flex flex-wrap items-center gap-3 text-sm font-medium">
          Loại dịch vụ
          <select
            className="h-9 rounded-md border bg-background px-3"
            value={service}
            onChange={(event) => changeFilter('service', event.target.value)}
          >
            <option value="">Tất cả</option>
            {conceptBookingEnabled && <option value="concept">Concept</option>}
            <option value="yearbook">Kỉ yếu</option>
          </select>
        </label>
        <label className="flex flex-wrap items-center gap-3 text-sm font-medium">
          Trạng thái đơn
          <select
            className="h-9 rounded-md border bg-background px-3"
            value={stage}
            onChange={(event) => changeFilter('view', event.target.value)}
          >
            <option value="">Tất cả</option>
            {Object.entries(bookingOrderStageLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <section className="rounded-lg border border-destructive/30 p-4" role="alert">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => setReload((value) => value + 1)}
          >
            Thử lại
          </Button>
        </section>
      ) : (
        <DataTable
          aria-label="Đơn chụp ảnh"
          columns={columns}
          data={rows}
          keyExtractor={(item) => `${item.service}:${item._id}`}
          loading={loading}
          emptyTitle="Chưa có đơn chụp ảnh phù hợp"
          emptyDescription="Đơn được phân công cho bạn sẽ xuất hiện tại đây. Bạn có thể đổi bộ lọc để xem các đơn khác."
          pagination={{
            serverSide: true,
            page,
            pageSize: 20,
            total: !loading && result ? result.total : 0,
            hidePageSize: true,
            onPageChange: (next) =>
              setParams((previous) => {
                const updated = new URLSearchParams(previous);
                updated.set('page', String(next));
                return updated;
              }),
          }}
        />
      )}
    </section>
  );
}

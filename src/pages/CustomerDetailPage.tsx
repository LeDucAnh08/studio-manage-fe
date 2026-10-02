import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { customerService } from '../services/customerService';
import { scheduleService } from '../services/scheduleService';
import { transactionService } from '../services/transactionService';
import { formatDate, formatCurrency } from '../utils/format';
import type { Customer, ScheduleResponse, TransactionResponse } from '../types';
import { SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from '../utils/scheduleConstants';
import { Badge, Card, CardContent, DataTable, PageLoader } from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      customerService.getOne(id),
      scheduleService.getAll({ customer: id, limit: 100 }),
      transactionService.getAll({ customer: id, limit: 100 }),
    ]).then(([c, s, t]) => {
      setCustomer(c);
      setSchedules(s.data);
      setTransactions(t.data);
    });
  }, [id]);

  if (!customer) return <PageLoader />;

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/customers"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách lớp
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-1">{customer.className}</h2>
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

      {/* Finance summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Tổng thu</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Tổng chi</p>
            <p className="text-xl font-bold text-rose-600">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Lợi nhuận</p>
            <p
              className={cn(
                'text-xl font-bold',
                profit >= 0 ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {formatCurrency(profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Schedules */}
      <DataTable<ScheduleResponse>
        title="Lịch chụp"
        data={schedules}
        keyExtractor={(s) => s._id}
        emptyTitle="Chưa có lịch"
        columns={[
          { key: 'date', header: 'Ngày', render: (s) => formatDate(s.shootDate) },
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
              <span className="text-muted-foreground">
                {s.leadPhotographer?.username ?? '—'}
                {s.supportPhotographers.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground/70">
                    (+{s.supportPhotographers.length})
                  </span>
                )}
              </span>
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

      {/* Transactions */}
      <DataTable<TransactionResponse>
        title="Thu chi"
        data={transactions}
        keyExtractor={(t) => t._id}
        emptyTitle="Chưa có giao dịch"
        columns={[
          { key: 'date', header: 'Ngày', render: (t) => formatDate(t.date) },
          {
            key: 'type',
            header: 'Loại',
            render: (t) => (
              <Badge
                variant="outline"
                className={cn(
                  'border-transparent',
                  t.type === 'income'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
                )}
              >
                {t.type === 'income' ? 'Thu' : 'Chi'}
              </Badge>
            ),
          },
          {
            key: 'category',
            header: 'Danh mục',
            render: (t) => (
              <span className="text-muted-foreground">{t.categoryId?.name ?? '—'}</span>
            ),
          },
          {
            key: 'description',
            header: 'Mô tả',
            render: (t) => <span className="text-muted-foreground">{t.description}</span>,
          },
          {
            key: 'amount',
            header: 'Số tiền',
            align: 'right',
            render: (t) => (
              <span
                className={cn(
                  'font-medium',
                  t.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {t.type === 'expense' ? '-' : '+'}
                {formatCurrency(t.amount)}
              </span>
            ),
          } satisfies Column<TransactionResponse>,
        ]}
      />
    </div>
  );
};

export default CustomerDetailPage;

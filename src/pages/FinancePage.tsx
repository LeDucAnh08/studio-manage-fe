import { useEffect, useState } from 'react';
import { School, UserCircle2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { transactionService } from '../services/transactionService';
import { formatDate, formatCurrency } from '../utils/format';
import type { Transaction, TransactionResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchTransactions,
  fetchTransactionSummary,
  patchTransaction,
} from '../store/slices/transactionsSlice';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchCategories } from '../store/slices/categoriesSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  ConfirmDialog,
  DataTable,
  DatePicker,
  FormField,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableSkeleton,
  Textarea,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

interface FilterState {
  type: string;
  customer: string;
  categoryId: string;
  createdBy: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilter: FilterState = {
  type: '',
  customer: '',
  categoryId: '',
  createdBy: '',
  dateFrom: '',
  dateTo: '',
};

const ALL = '__all__';

const FinancePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;
  const canRefund = user?.roles.some((r) => r === 5) ?? false;

  const dispatch = useAppDispatch();
  const { list: transactions, total, summary, loading } = useAppSelector((s) => s.transactions);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: categories } = useAppSelector((s) => s.categories);
  const { list: users } = useAppSelector((s) => s.users);
  const { list: seasons, selectedSeasonId } = useAppSelector((s) => s.seasons);
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [appliedFilter, setAppliedFilter] = useState<FilterState>(defaultFilter);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tab, setTab] = useState<'list' | 'summary'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionResponse | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { isSubmitting },
  } = useForm<Partial<Transaction>>();

  const selectedType = watch('type');

  const buildListParams = (
    f: FilterState,
    p: number,
    l: number,
  ): Record<string, string | number> => {
    const params: Record<string, string | number> = { page: p, limit: l };
    if (f.type) params.type = f.type;
    if (f.customer) params.customer = f.customer;
    if (f.categoryId) params.categoryId = f.categoryId;
    if (f.createdBy) params.createdBy = f.createdBy;
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    if (selectedSeasonId) params.season = selectedSeasonId;
    return params;
  };

  useEffect(() => {
    dispatch(fetchTransactions(buildListParams(appliedFilter, page, pageSize)));
  }, [dispatch, appliedFilter, page, pageSize, selectedSeasonId]);

  useEffect(() => {
    dispatch(
      fetchTransactionSummary({
        dateFrom: appliedFilter.dateFrom,
        dateTo: appliedFilter.dateTo,
      }),
    );
  }, [dispatch, appliedFilter.dateFrom, appliedFilter.dateTo]);

  useEffect(() => {
    dispatch(
      fetchCustomers(selectedSeasonId ? { limit: 200, season: selectedSeasonId } : { limit: 200 }),
    );
    dispatch(fetchCategories());
    if (canRefund) dispatch(fetchUsers());
  }, [dispatch, canRefund, selectedSeasonId]);

  const openCreate = () => {
    setEditing(null);
    reset({
      type: 'income',
      date: new Date().toISOString().slice(0, 10),
      season: selectedSeasonId || undefined,
    });
    setModalOpen(true);
  };

  const openEdit = (t: TransactionResponse) => {
    setEditing(t);
    reset({
      ...t,
      customer: t.customer?._id ?? '',
      categoryId: t.categoryId._id,
      date: t.date.slice(0, 10),
      createdBy: t.createdBy?._id ?? '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: Partial<Transaction>) => {
    const payload = { ...data, customer: data.customer || null };
    try {
      if (editing) {
        await transactionService.update(editing._id, payload);
        toast.success('Cập nhật giao dịch thành công!');
      } else {
        await transactionService.create(payload);
        toast.success('Thêm giao dịch thành công!');
      }
      setModalOpen(false);
      dispatch(fetchTransactions(buildListParams(appliedFilter, page, pageSize)));
      dispatch(
        fetchTransactionSummary({
          dateFrom: appliedFilter.dateFrom,
          dateTo: appliedFilter.dateTo,
        }),
      );
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const toggleRefund = async (t: TransactionResponse, value: boolean) => {
    dispatch(patchTransaction({ id: t._id, changes: { accountantRefunded: value } }));
    try {
      await transactionService.update(t._id, { accountantRefunded: value });
    } catch {
      dispatch(patchTransaction({ id: t._id, changes: { accountantRefunded: !value } }));
      toast.error('Không thể cập nhật trạng thái hoàn tiền.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await transactionService.remove(confirmId);
      toast.success('Đã xoá giao dịch.');
      dispatch(fetchTransactions(buildListParams(appliedFilter, page, pageSize)));
      dispatch(
        fetchTransactionSummary({
          dateFrom: appliedFilter.dateFrom,
          dateTo: appliedFilter.dateTo,
        }),
      );
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const applyFilter = () => {
    setPage(1);
    setAppliedFilter(filter);
  };
  const resetFilter = () => {
    setFilter(defaultFilter);
    setAppliedFilter(defaultFilter);
    setPage(1);
  };

  const filteredCategories = categories.filter((c) => !selectedType || c.type === selectedType);

  const grandTotal = summary.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      expense: acc.expense + r.expense,
      profit: acc.profit + r.profit,
    }),
    { income: 0, expense: 0, profit: 0 },
  );

  const txColumns: Column<TransactionResponse>[] = [
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
      className: 'text-muted-foreground',
      render: (t) => t.categoryId?.name ?? '—',
    },
    {
      key: 'class',
      header: 'Lớp',
      className: 'text-muted-foreground',
      render: (t) => t.customer?.className ?? '—',
    },
    {
      key: 'description',
      header: 'Mô tả',
      className: 'text-muted-foreground',
      render: (t) => t.description,
    },
    {
      key: 'createdBy',
      header: 'Người thực hiện',
      className: 'text-muted-foreground',
      render: (t) => t.createdBy?.name ?? t.createdBy?.username ?? '—',
    },
    {
      key: 'amount',
      header: 'Số tiền',
      align: 'right',
      render: (t) => (
        <span
          className={cn('font-medium', t.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}
        >
          {t.type === 'expense' ? '-' : '+'}
          {formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: 'refund',
      header: 'KT hoàn tiền',
      align: 'center',
      render: (t) => (
        <Checkbox
          checked={!!t.accountantRefunded}
          disabled={!canRefund}
          onCheckedChange={(c) => toggleRefund(t, !!c)}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => (
        <span className="space-x-2">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => openEdit(t)}
          >
            Sửa
          </Button>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-destructive"
            onClick={() => setConfirmId(t._id)}
          >
            Xoá
          </Button>
        </span>
      ),
    },
  ];

  type SummaryRow = (typeof summary)[number];
  const summaryColumns: Column<SummaryRow>[] = [
    {
      key: 'class',
      header: 'Lớp',
      className: 'font-medium',
      render: (row) => row.customer?.className ?? '(Không có lớp)',
    },
    {
      key: 'school',
      header: 'Trường',
      className: 'text-muted-foreground',
      render: (row) => row.customer?.school,
    },
    {
      key: 'income',
      header: <span className="text-emerald-600">Tổng thu</span>,
      align: 'right',
      render: (row) => <span className="text-emerald-600">{formatCurrency(row.income)}</span>,
    },
    {
      key: 'expense',
      header: <span className="text-rose-600">Tổng chi</span>,
      align: 'right',
      render: (row) => <span className="text-rose-600">{formatCurrency(row.expense)}</span>,
    },
    {
      key: 'profit',
      header: 'Lợi nhuận',
      align: 'right',
      render: (row) => (
        <span className={cn('font-medium', row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
          {formatCurrency(row.profit)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="Finance"
        title="Quản lý Thu Chi"
        description="Theo dõi thu chi, lọc theo lớp, danh mục và khoảng thời gian."
        action={
          <Button variant="gradient" onClick={openCreate}>
            + Thêm giao dịch
          </Button>
        }
      />

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <FormField label="Loại giao dịch">
            <Select
              value={filter.type || ALL}
              onValueChange={(v) => setFilter((f) => ({ ...f, type: v === ALL ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả loại</SelectItem>
                <SelectItem value="income">Thu</SelectItem>
                <SelectItem value="expense">Chi</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Lớp">
            <Combobox
              options={[
                { value: '', label: 'Tất cả lớp' },
                ...customers.map((c) => ({
                  value: c._id,
                  label: `${c.className} - ${c.school}`,
                })),
              ]}
              value={filter.customer}
              onChange={(v) => setFilter((f) => ({ ...f, customer: v }))}
              placeholder="Tất cả lớp"
            />
          </FormField>
          <FormField label="Danh mục" className="col-span-2 md:col-span-1">
            <Combobox
              options={[
                { value: '', label: 'Tất cả danh mục' },
                ...categories.map((c) => ({ value: c._id, label: c.name })),
              ]}
              value={filter.categoryId}
              onChange={(v) => setFilter((f) => ({ ...f, categoryId: v }))}
              placeholder="Tất cả danh mục"
            />
          </FormField>
        </div>

        {canRefund && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Người thực hiện">
              <Combobox
                options={[
                  { value: '', label: 'Tất cả người thực hiện' },
                  ...users.map((u) => ({ value: u._id, label: u.name ?? u.username })),
                ]}
                value={filter.createdBy}
                onChange={(v) => setFilter((f) => ({ ...f, createdBy: v }))}
                placeholder="Tất cả người thực hiện"
              />
            </FormField>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 items-end">
          <FormField label="Từ ngày">
            <DatePicker
              value={filter.dateFrom}
              onChange={(v) => setFilter((f) => ({ ...f, dateFrom: v ?? '' }))}
              placeholder="Từ ngày"
            />
          </FormField>
          <FormField label="Đến ngày">
            <DatePicker
              value={filter.dateTo}
              onChange={(v) => setFilter((f) => ({ ...f, dateTo: v ?? '' }))}
              placeholder="Đến ngày"
            />
          </FormField>
          <div className="flex gap-2 md:justify-end">
            <Button
              variant="gradient"
              onClick={applyFilter}
              className="flex-1 md:flex-none min-w-[96px]"
            >
              Lọc
            </Button>
            <Button
              variant="outline"
              onClick={resetFilter}
              className="flex-1 md:flex-none min-w-[88px]"
            >
              Xóa bộ lọc
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button variant={tab === 'list' ? 'gradient' : 'outline'} onClick={() => setTab('list')}>
          Danh sách
        </Button>
        <Button
          variant={tab === 'summary' ? 'gradient' : 'outline'}
          onClick={() => setTab('summary')}
        >
          Tổng hợp theo lớp
        </Button>
      </div>

      {tab === 'list' &&
        (loading ? (
          <TableSkeleton cols={8} />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable<TransactionResponse>
                data={transactions}
                keyExtractor={(t) => t._id}
                emptyTitle="Chưa có dữ liệu"
                columns={txColumns}
                pagination={{
                  serverSide: true,
                  page,
                  pageSize,
                  total,
                  onPageChange: setPage,
                  onPageSizeChange: (size: number) => {
                    setPageSize(size);
                    setPage(1);
                  },
                }}
              />
            </div>

            <div className="md:hidden space-y-3">
              {transactions.map((t) => (
                <div key={t._id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <div className="text-sm text-muted-foreground">{formatDate(t.date)}</div>
                      <div className="text-sm font-medium mt-0.5">{t.categoryId?.name ?? '—'}</div>
                      {t.customer && (
                        <div className="text-xs text-muted-foreground">{t.customer.className}</div>
                      )}
                      {t.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                      )}
                      {t.createdBy && (
                        <div className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
                          <UserCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{t.createdBy.name ?? t.createdBy.username}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
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
                      <div
                        className={cn(
                          'font-semibold text-sm mt-1',
                          t.type === 'income' ? 'text-emerald-500' : 'text-rose-500',
                        )}
                      >
                        {t.type === 'expense' ? '-' : '+'}
                        {formatCurrency(t.amount)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2 border-t items-center">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground mr-auto">
                      <Checkbox
                        checked={!!t.accountantRefunded}
                        disabled={!canRefund}
                        onCheckedChange={(c) => toggleRefund(t, !!c)}
                      />
                      KT hoàn tiền
                    </label>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => openEdit(t)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-destructive"
                      onClick={() => setConfirmId(t._id)}
                    >
                      Xoá
                    </Button>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
                  Chưa có dữ liệu
                </div>
              )}
            </div>
          </>
        ))}

      {tab === 'summary' && (
        <>
          <div className="hidden md:block">
            <DataTable<SummaryRow>
              data={summary}
              keyExtractor={(row) => row._id ?? 'unknown'}
              emptyTitle="Chưa có dữ liệu"
              columns={summaryColumns}
              pagination
              footer={
                summary.length > 0 ? (
                  <tr className="border-t bg-muted/40 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>
                      Tổng cộng
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      {formatCurrency(grandTotal.income)}
                    </td>
                    <td className="px-3 py-2 text-right text-rose-600">
                      {formatCurrency(grandTotal.expense)}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2 text-right',
                        grandTotal.profit >= 0 ? 'text-emerald-600' : 'text-rose-600',
                      )}
                    >
                      {formatCurrency(grandTotal.profit)}
                    </td>
                  </tr>
                ) : undefined
              }
            />
          </div>

          <div className="md:hidden space-y-3">
            {summary.map((row) => (
              <div key={row._id ?? 'unknown'} className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-0.5">
                  {row.customer?.className ?? '(Không có lớp)'}
                </div>
                {row.customer?.school && (
                  <div className="text-sm text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                    <School className="h-4 w-4 text-sky-500" />
                    <span>{row.customer.school}</span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Thu</div>
                    <div className="text-emerald-500 font-medium">{formatCurrency(row.income)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Chi</div>
                    <div className="text-rose-500 font-medium">{formatCurrency(row.expense)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Lợi nhuận</div>
                    <div
                      className={cn(
                        'font-semibold',
                        row.profit >= 0 ? 'text-emerald-500' : 'text-rose-500',
                      )}
                    >
                      {formatCurrency(row.profit)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {summary.length > 0 && (
              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="font-semibold mb-2">Tổng cộng</div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Thu</div>
                    <div className="text-emerald-500 font-semibold">
                      {formatCurrency(grandTotal.income)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Chi</div>
                    <div className="text-rose-500 font-semibold">
                      {formatCurrency(grandTotal.expense)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Lợi nhuận</div>
                    <div
                      className={cn(
                        'font-semibold',
                        grandTotal.profit >= 0 ? 'text-emerald-500' : 'text-rose-500',
                      )}
                    >
                      {formatCurrency(grandTotal.profit)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {summary.length === 0 && (
              <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa giao dịch' : 'Thêm giao dịch'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Loại" required>
              <Controller
                name="type"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value ?? 'income'} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Thu</SelectItem>
                      <SelectItem value="expense">Chi</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Danh mục" required>
              <Controller
                name="categoryId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => {
                  const value =
                    typeof field.value === 'object' && field.value !== null
                      ? (field.value as { _id: string })._id
                      : ((field.value as string | undefined) ?? '');
                  return (
                    <Combobox
                      options={filteredCategories.map((c) => ({ value: c._id, label: c.name }))}
                      value={value}
                      onChange={field.onChange}
                      placeholder="-- Chọn danh mục --"
                    />
                  );
                }}
              />
            </FormField>
            <FormField label="Số tiền" required htmlFor="amount">
              <Input
                id="amount"
                type="number"
                {...register('amount', { required: true, valueAsNumber: true, min: 0 })}
              />
            </FormField>
            <FormField label="Ngày" required htmlFor="date">
              <Controller
                name="date"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Chọn ngày"
                  />
                )}
              />
            </FormField>
            <FormField label="Lớp (tuỳ chọn)" className="sm:col-span-2">
              <Controller
                name="customer"
                control={control}
                render={({ field }) => {
                  const value =
                    typeof field.value === 'object' && field.value !== null
                      ? (field.value as { _id: string })._id
                      : ((field.value as string | undefined) ?? '');
                  return (
                    <Combobox
                      options={customers.map((c) => ({
                        value: c._id,
                        label: `${c.className} – ${c.school}`,
                      }))}
                      value={value}
                      onChange={(v) => field.onChange(v || undefined)}
                      placeholder="-- Không có lớp --"
                    />
                  );
                }}
              />
            </FormField>
            {isAdmin && (
              <FormField label="Người thực hiện" className="sm:col-span-2">
                <Controller
                  name="createdBy"
                  control={control}
                  render={({ field }) => {
                    const value =
                      typeof field.value === 'object' && field.value !== null
                        ? (field.value as { _id: string })._id
                        : ((field.value as string | undefined) ?? '');
                    return (
                      <Combobox
                        options={users.map((u) => ({
                          value: u._id,
                          label: u.name ?? u.username,
                        }))}
                        value={value}
                        onChange={(v) => field.onChange(v || undefined)}
                        placeholder="-- Mặc định (tôi) --"
                      />
                    );
                  }}
                />
              </FormField>
            )}
            <FormField label="Mùa chụp">
              <Controller
                name="season"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn mùa --" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Mô tả" htmlFor="description" className="sm:col-span-2">
              <Textarea id="description" rows={2} {...register('description')} />
            </FormField>
            {canRefund && (
              <div className="sm:col-span-2">
                <Controller
                  name="accountantRefunded"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(c) => field.onChange(!!c)}
                      />
                      <Label className="cursor-pointer">Kế toán đã hoàn tiền</Label>
                    </label>
                  )}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá giao dịch này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default FinancePage;

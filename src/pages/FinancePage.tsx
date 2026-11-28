import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Clock3,
  CheckCircle2,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { transactionService } from '../services/transactionService';
import { formatDate, formatCurrency } from '../utils/format';
import type { Transaction, TransactionResponse, TransactionTotals } from '../types';
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
  search: string;
  refundStatus: '' | 'unrefunded';
  sort: 'date_desc' | 'date_asc';
}

const defaultFilter: FilterState = {
  type: '',
  customer: '',
  categoryId: '',
  createdBy: '',
  dateFrom: '',
  dateTo: '',
  search: '',
  refundStatus: '',
  sort: 'date_desc',
};

const AVATAR_TONES = [
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
];

const shortName = (name?: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
};

const avatarTone = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
};

const computeFallbackTotals = (items: TransactionResponse[]): TransactionTotals => {
  let income = 0;
  let incomeCount = 0;
  let expense = 0;
  let expenseCount = 0;
  let unrefundedAmount = 0;
  let unrefundedCount = 0;
  for (const t of items) {
    if (t.type === 'income') {
      income += t.amount;
      incomeCount += 1;
    } else {
      expense += t.amount;
      expenseCount += 1;
      if (!t.accountantRefunded) {
        unrefundedAmount += t.amount;
        unrefundedCount += 1;
      }
    }
  }
  return {
    income,
    incomeCount,
    expense,
    expenseCount,
    profit: income - expense,
    unrefundedAmount,
    unrefundedCount,
  };
};

const FinancePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;
  const canRefund = isAdmin;

  const dispatch = useAppDispatch();
  const {
    list: transactions,
    total,
    totals: serverTotals,
    summary,
    loading,
    error,
  } = useAppSelector((s) => s.transactions);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: categories } = useAppSelector((s) => s.categories);
  const { list: users } = useAppSelector((s) => s.users);

  const [appliedFilter, setAppliedFilter] = useState<FilterState>(defaultFilter);
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tab, setTab] = useState<'list' | 'summary'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionResponse | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { isSubmitting, errors },
  } = useForm<Partial<Transaction>>();

  const selectedType = watch('type');

  const buildListParams = useCallback(
    (f: FilterState, p: number, l: number): Record<string, string | number> => {
      const params: Record<string, string | number> = { page: p, limit: l };
      if (f.type) params.type = f.type;
      if (f.customer) params.customer = f.customer;
      if (f.categoryId) params.categoryId = f.categoryId;
      if (f.createdBy) params.createdBy = f.createdBy;
      if (f.dateFrom) params.dateFrom = f.dateFrom;
      if (f.dateTo) params.dateTo = f.dateTo;
      if (f.search.trim()) params.search = f.search.trim();
      if (f.refundStatus) params.refundStatus = f.refundStatus;
      if (f.sort !== 'date_desc') params.sort = f.sort;
      return params;
    },
    [],
  );

  useEffect(() => {
    dispatch(fetchTransactions(buildListParams(appliedFilter, page, pageSize)));
  }, [dispatch, appliedFilter, page, pageSize, buildListParams]);

  useEffect(() => {
    dispatch(
      fetchTransactionSummary({
        dateFrom: appliedFilter.dateFrom,
        dateTo: appliedFilter.dateTo,
      }),
    );
  }, [dispatch, appliedFilter.dateFrom, appliedFilter.dateTo]);

  useEffect(() => {
    dispatch(fetchCustomers({ limit: 200 }));
    dispatch(fetchCategories());
    if (canRefund) dispatch(fetchUsers());
  }, [dispatch, canRefund]);

  const updateFilter = (patch: Partial<FilterState>) => {
    setPage(1);
    setAppliedFilter((prev) => ({ ...prev, ...patch }));
  };

  const resetFilter = () => {
    setSearchDraft('');
    setPage(1);
    setAppliedFilter(defaultFilter);
  };

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        appliedFilter.type ||
        appliedFilter.customer ||
        appliedFilter.categoryId ||
        appliedFilter.createdBy ||
        appliedFilter.dateFrom ||
        appliedFilter.dateTo ||
        appliedFilter.search.trim() ||
        appliedFilter.refundStatus,
      ),
    [appliedFilter],
  );

  const totals = useMemo(
    () => serverTotals ?? computeFallbackTotals(transactions),
    [serverTotals, transactions],
  );

  const profitMargin = useMemo(() => {
    if (totals.income <= 0) return null;
    const pct = (totals.profit / totals.income) * 100;
    return `${pct.toFixed(1).replace('.', ',')}%`;
  }, [totals.income, totals.profit]);

  const openCreate = () => {
    setEditing(null);
    reset({
      type: 'income',
      date: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  const openEdit = (t: TransactionResponse) => {
    setEditing(t);
    reset({
      ...t,
      customer: t.customer?._id ?? '',
      categoryId: t.categoryId?._id ?? '',
      date: t.date.slice(0, 10),
      createdBy: t.createdBy?._id ?? '',
    });
    setModalOpen(true);
  };

  const reloadData = () => {
    dispatch(fetchTransactions(buildListParams(appliedFilter, page, pageSize)));
    dispatch(
      fetchTransactionSummary({
        dateFrom: appliedFilter.dateFrom,
        dateTo: appliedFilter.dateTo,
      }),
    );
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
      reloadData();
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const toggleRefund = async (t: TransactionResponse, value: boolean) => {
    dispatch(patchTransaction({ id: t._id, changes: { accountantRefunded: value } }));
    try {
      await transactionService.update(t._id, { accountantRefunded: value });
      reloadData();
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
      reloadData();
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await transactionService.getAll(buildListParams(appliedFilter, 1, 5000));
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Tài chính');
      sheet.columns = [
        { header: 'Ngày', key: 'date', width: 14 },
        { header: 'Loại', key: 'type', width: 10 },
        { header: 'Danh mục', key: 'category', width: 24 },
        { header: 'Lớp', key: 'customer', width: 18 },
        { header: 'Mô tả', key: 'description', width: 34 },
        { header: 'Người thực hiện', key: 'createdBy', width: 22 },
        { header: 'Số tiền (VND)', key: 'amount', width: 18 },
        { header: 'KT hoàn tiền', key: 'refunded', width: 16 },
      ];
      for (const t of response.data) {
        sheet.addRow({
          date: formatDate(t.date),
          type: t.type === 'income' ? 'Thu' : 'Chi',
          category: t.categoryId?.name ?? '',
          customer: t.customer?.className ?? '',
          description: t.description ?? '',
          createdBy: t.createdBy?.name ?? t.createdBy?.username ?? '',
          amount: t.type === 'expense' ? -t.amount : t.amount,
          refunded: t.type === 'expense' ? (t.accountantRefunded ? 'Đã hoàn' : 'Chưa hoàn') : '—',
        });
      }
      sheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tai-chinh-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file Excel.');
    } catch {
      toast.error('Không thể xuất file Excel.');
    } finally {
      setExporting(false);
    }
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

  const transactionDescription = (t: TransactionResponse) =>
    [formatDate(t.date), t.categoryId?.name, formatCurrency(t.amount)].filter(Boolean).join(' · ');

  const pagination = {
    page,
    pageSize,
    total,
    onPageChange: setPage,
    onPageSizeChange: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };

  const txColumns: Column<TransactionResponse>[] = [
    {
      key: 'date',
      header: (
        <button
          type="button"
          className="inline-flex items-center gap-1 font-semibold hover:text-foreground"
          onClick={() =>
            updateFilter({ sort: appliedFilter.sort === 'date_desc' ? 'date_asc' : 'date_desc' })
          }
        >
          Ngày
          {appliedFilter.sort === 'date_desc' ? (
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      ),
      render: (t) => <span className="tabular-nums text-muted-foreground">{formatDate(t.date)}</span>,
    },
    {
      key: 'category',
      header: 'Danh mục',
      render: (t) => (
        <div className="inline-flex items-center gap-2 max-w-[190px]">
          <span
            aria-hidden="true"
            className={cn(
              'h-2 w-2 rounded-full shrink-0',
              t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500',
            )}
          />
          <span className="truncate font-medium">{t.categoryId?.name ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Lớp',
      render: (t) =>
        t.customer?.className ? (
          <span className="font-medium">{t.customer.className}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (t) => (
        <span className="text-muted-foreground line-clamp-1">{t.description || '—'}</span>
      ),
    },
    {
      key: 'createdBy',
      header: 'Người thực hiện',
      render: (t) => {
        const displayName = t.createdBy?.name ?? t.createdBy?.username;
        if (!displayName) return <span className="text-muted-foreground">—</span>;
        const short = shortName(displayName) || displayName;
        const initial = short[0]?.toUpperCase() || '?';
        return (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold shrink-0',
                avatarTone(displayName),
              )}
            >
              {initial}
            </span>
            <span className="text-sm">{short}</span>
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Số tiền',
      align: 'right',
      render: (t) => (
        <span
          className={cn(
            'font-semibold tabular-nums whitespace-nowrap',
            t.type === 'income' ? 'staff-ink-success' : 'staff-ink-danger',
          )}
        >
          {t.type === 'expense' ? '-' : '+'}
          {formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: 'refund',
      header: 'KT hoàn',
      align: 'center',
      render: (t) => {
        if (t.type === 'income') {
          return (
            <div className="inline-flex items-center justify-center gap-1.5">
              <span className="text-muted-foreground">—</span>
              <Checkbox
                className="sr-only"
                aria-label={`Đã hoàn tiền: ${transactionDescription(t)}`}
                checked={!!t.accountantRefunded}
                disabled={!canRefund}
                onCheckedChange={(c) => toggleRefund(t, !!c)}
              />
            </div>
          );
        }
        const refunded = !!t.accountantRefunded;
        return (
          <label
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors',
              canRefund ? 'cursor-pointer' : 'opacity-70',
              refunded
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
            )}
          >
            <Checkbox
              className="sr-only"
              aria-label={`Đã hoàn tiền: ${transactionDescription(t)}`}
              checked={refunded}
              disabled={!canRefund}
              onCheckedChange={(c) => toggleRefund(t, !!c)}
            />
            {refunded ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{refunded ? 'Đã hoàn' : 'Chưa hoàn'}</span>
          </label>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => (
        <span className="staff-row-actions inline-flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label={`Sửa giao dịch ${transactionDescription(t)}`}
            onClick={() => openEdit(t)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            aria-label={`Xoá giao dịch ${transactionDescription(t)}`}
            onClick={() => setConfirmId(t._id)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
      header: <span className="staff-ink-success">Tổng thu</span>,
      align: 'right',
      render: (row) => <span className="staff-ink-success">{formatCurrency(row.income)}</span>,
    },
    {
      key: 'expense',
      header: <span className="staff-ink-danger">Tổng chi</span>,
      align: 'right',
      render: (row) => <span className="staff-ink-danger">{formatCurrency(row.expense)}</span>,
    },
    {
      key: 'profit',
      header: 'Lợi nhuận',
      align: 'right',
      render: (row) => (
        <span
          className={cn('font-medium', row.profit >= 0 ? 'staff-ink-success' : 'staff-ink-danger')}
        >
          {formatCurrency(row.profit)}
        </span>
      ),
    },
  ];

  return (
    <div className="staff-finance space-y-5">
      {/* Header matching mockup */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tài chính</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} giao dịch</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateFilter({ search: searchDraft });
            }}
            className="relative w-full sm:w-56"
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={searchDraft}
              onChange={(e) => {
                const value = e.target.value;
                setSearchDraft(value);
                if (!value && appliedFilter.search) updateFilter({ search: '' });
              }}
              placeholder="Tìm mô tả..."
              aria-label="Tìm mô tả"
              className="pl-9 pr-8 h-9"
            />
            {searchDraft && (
              <button
                type="button"
                aria-label="Xoá từ khoá tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchDraft('');
                  updateFilter({ search: '' });
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </form>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={exporting}
            onClick={() => void handleExportExcel()}
          >
            <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
            {exporting ? 'Đang xuất…' : 'Xuất Excel'}
          </Button>

          <Button variant="gradient" size="sm" className="h-9" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />+ Thêm giao dịch
          </Button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Tổng thu</p>
          <p className="mt-1 text-2xl font-bold tabular-nums staff-ink-success">
            {formatCurrency(totals.income)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{totals.incomeCount} giao dịch</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Tổng chi</p>
          <p className="mt-1 text-2xl font-bold tabular-nums staff-ink-danger">
            {formatCurrency(totals.expense)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{totals.expenseCount} giao dịch</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Lợi nhuận</p>
          <p
            className={cn(
              'mt-1 text-2xl font-bold tabular-nums',
              totals.profit >= 0 ? 'staff-ink-success' : 'staff-ink-danger',
            )}
          >
            {formatCurrency(totals.profit)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {profitMargin ? `Biên lợi nhuận ${profitMargin}` : 'Chưa có doanh thu'}
          </p>
        </div>

        <button
          type="button"
          aria-pressed={appliedFilter.refundStatus === 'unrefunded'}
          onClick={() =>
            updateFilter({
              refundStatus: appliedFilter.refundStatus === 'unrefunded' ? '' : 'unrefunded',
              type: appliedFilter.refundStatus === 'unrefunded' ? appliedFilter.type : '',
            })
          }
          className={cn(
            'rounded-xl border bg-card p-4 text-left transition-colors flex items-center justify-between gap-2 hover:bg-muted/40',
            appliedFilter.refundStatus === 'unrefunded' &&
              'border-amber-500 ring-2 ring-amber-500/20',
          )}
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Chưa hoàn tiền</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(totals.unrefundedAmount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totals.unrefundedCount} khoản ·{' '}
              {appliedFilter.refundStatus === 'unrefunded' ? 'Đang lọc · Bấm để bỏ' : 'Bấm để lọc'}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border bg-card p-4">
          <p>Chưa tải được dữ liệu thu chi mới.</p>
          <Button className="mt-3" variant="outline" onClick={reloadData}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Compact filter & view toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-card p-0.5">
          <Button
            type="button"
            size="sm"
            variant={tab === 'list' ? 'default' : 'ghost'}
            aria-pressed={tab === 'list'}
            onClick={() => setTab('list')}
            className="h-8 px-3"
          >
            Danh sách
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'summary' ? 'default' : 'ghost'}
            aria-pressed={tab === 'summary'}
            onClick={() => setTab('summary')}
            className="h-8 px-3"
          >
            Tổng hợp theo lớp
          </Button>
        </div>

        <div className="inline-flex rounded-lg border bg-card p-0.5">
          {[
            { value: '', label: 'Tất cả', dot: '' },
            { value: 'income', label: 'Thu', dot: 'bg-emerald-500' },
            { value: 'expense', label: 'Chi', dot: 'bg-rose-500' },
          ].map((item) => {
            const active = appliedFilter.type === item.value;
            return (
              <button
                key={item.value || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => updateFilter({ type: item.value })}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.dot && <span className={cn('h-1.5 w-1.5 rounded-full', item.dot)} />}
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="w-44">
          <Combobox
            id="finance-filter-class"
            aria-label="Lọc theo lớp"
            options={[
              { value: '', label: 'Tất cả lớp' },
              ...customers.map((c) => ({
                value: c._id,
                label: `${c.className} - ${c.school}`,
              })),
            ]}
            value={appliedFilter.customer}
            onChange={(v) => updateFilter({ customer: v })}
            placeholder="Tất cả lớp"
          />
        </div>

        <div className="w-44">
          <Combobox
            id="finance-filter-category"
            aria-label="Lọc theo danh mục"
            options={[
              { value: '', label: 'Tất cả danh mục' },
              ...categories.map((c) => ({ value: c._id, label: c.name })),
            ]}
            value={appliedFilter.categoryId}
            onChange={(v) => updateFilter({ categoryId: v })}
            placeholder="Tất cả danh mục"
          />
        </div>

        {canRefund && (
          <div className="w-44">
            <Combobox
              id="finance-filter-user"
              aria-label="Lọc theo người thực hiện"
              options={[
                { value: '', label: 'Tất cả người thực hiện' },
                ...users.map((u) => ({ value: u._id, label: u.name ?? u.username })),
              ]}
              value={appliedFilter.createdBy}
              onChange={(v) => updateFilter({ createdBy: v })}
              placeholder="Tất cả người thực hiện"
            />
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <DatePicker
            id="finance-filter-from"
            aria-label="Từ ngày"
            value={appliedFilter.dateFrom}
            onChange={(v) => updateFilter({ dateFrom: v ?? '' })}
            placeholder="Từ ngày"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <DatePicker
            id="finance-filter-to"
            aria-label="Đến ngày"
            value={appliedFilter.dateTo}
            onChange={(v) => updateFilter({ dateTo: v ?? '' })}
            placeholder="Đến ngày"
          />
        </div>

        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={resetFilter} className="h-8">
            <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {tab === 'list' &&
        (loading ? (
          <TableSkeleton cols={8} />
        ) : (
          <div className="min-w-0 space-y-2">
            <DataTable<TransactionResponse>
              aria-label="Danh sách giao dịch"
              className="staff-finance-table"
              data={transactions}
              keyExtractor={(t) => t._id}
              emptyTitle="Chưa có dữ liệu"
              columns={txColumns}
              pagination={{
                serverSide: true,
                ...pagination,
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-muted-foreground">Theo bộ lọc:</span>
                <span className="font-semibold staff-ink-success">
                  Thu +{formatCurrency(totals.income)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold staff-ink-danger">
                  Tổng chi -{formatCurrency(totals.expense)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Chi chưa hoàn -{formatCurrency(totals.unrefundedAmount)}
                </span>
              </div>
              <span className="text-muted-foreground tabular-nums">
                {total > 0
                  ? `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} trên ${total}`
                  : '0 giao dịch'}
              </span>
            </div>
          </div>
        ))}

      {tab === 'summary' && (
        <div className="min-w-0">
          <DataTable<SummaryRow>
            aria-label="Tổng hợp thu chi theo lớp"
            data={summary}
            keyExtractor={(row) => row._id ?? 'unknown'}
            emptyTitle="Chưa có dữ liệu"
            columns={summaryColumns}
            pagination
            tableFooter={
              summary.length > 0 ? (
                <tr className="border-t bg-muted/40 font-semibold">
                  <td className="px-3 py-2" colSpan={2}>
                    Tổng cộng
                  </td>
                  <td className="px-3 py-2 text-right staff-ink-success">
                    {formatCurrency(grandTotal.income)}
                  </td>
                  <td className="px-3 py-2 text-right staff-ink-danger">
                    {formatCurrency(grandTotal.expense)}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 text-right',
                      grandTotal.profit >= 0 ? 'staff-ink-success' : 'staff-ink-danger',
                    )}
                  >
                    {formatCurrency(grandTotal.profit)}
                  </td>
                </tr>
              ) : undefined
            }
          />
        </div>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa giao dịch' : 'Thêm giao dịch'}
        description="Ngày, danh mục và số tiền của giao dịch; giữ nguyên liên kết hồ sơ hiện có."
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Loại" required htmlFor="finance-type">
              <Controller
                name="type"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value ?? 'income'} onValueChange={field.onChange}>
                    <SelectTrigger id="finance-type" aria-required="true">
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
            <FormField
              label="Danh mục"
              required
              htmlFor="finance-category"
              error={errors.categoryId ? 'Vui lòng chọn danh mục.' : undefined}
            >
              {(controlProps) => (
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
                        {...controlProps}
                        ref={field.ref}
                        options={filteredCategories.map((c) => ({ value: c._id, label: c.name }))}
                        value={value}
                        onChange={field.onChange}
                        placeholder="-- Chọn danh mục --"
                      />
                    );
                  }}
                />
              )}
            </FormField>
            <FormField
              label="Số tiền"
              required
              htmlFor="amount"
              error={errors.amount ? 'Vui lòng nhập số tiền không âm.' : undefined}
            >
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  className="pr-8"
                  {...register('amount', { required: true, valueAsNumber: true, min: 0 })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  đ
                </span>
              </div>
            </FormField>
            <FormField
              label="Ngày"
              required
              htmlFor="date"
              error={errors.date ? 'Vui lòng chọn ngày.' : undefined}
            >
              {(controlProps) => (
                <Controller
                  name="date"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <DatePicker
                      {...controlProps}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Chọn ngày"
                    />
                  )}
                />
              )}
            </FormField>
            <FormField label="Lớp (tuỳ chọn)" htmlFor="finance-class" className="sm:col-span-2">
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
                      id="finance-class"
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
              <FormField label="Người thực hiện" htmlFor="finance-user" className="sm:col-span-2">
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
                        id="finance-user"
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
                      <Label className="cursor-pointer">Đã hoàn tiền</Label>
                    </label>
                  )}
                />
              </div>
            )}
          </div>
          <div className="staff-modal-footer flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu…' : 'Lưu'}
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

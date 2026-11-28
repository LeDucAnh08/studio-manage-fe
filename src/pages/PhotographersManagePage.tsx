import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Camera } from 'lucide-react';
import { userService, type PhotographerManageItem } from '../services/userService';
import {
  Badge,
  Button,
  DataTable,
  PageHeader,
  SearchInput,
  SegmentedControl,
  TableSkeleton,
} from '@/components/ui';
import type { Column } from '@/components/ui';

type StatusFilter = 'all' | 'active' | 'inactive';

const PhotographersManagePage = () => {
  const [params, setParams] = useSearchParams();
  const appliedSearch = params.get('search') || '';
  const statusParam = params.get('status');
  const statusFilter: StatusFilter =
    statusParam === 'active' || statusParam === 'inactive' ? statusParam : 'all';

  const [search, setSearch] = useState(appliedSearch);
  const [photographers, setPhotographers] = useState<PhotographerManageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => setSearch(appliedSearch), [appliedSearch]);

  const loadPhotographers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await userService.getPhotographersManage();
      setPhotographers(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPhotographers();
  }, [loadPhotographers]);

  const updateParam = (key: string, value: string) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const applySearch = (value: string) => updateParam('search', value.trim());

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return photographers.filter((item) => {
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;
      if (!q) return true;
      return (
        (item.name || '').toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q)
      );
    });
  }, [photographers, appliedSearch, statusFilter]);

  const detailState = {
    photographersReturnTo: '/staff/photographers' + (params.size ? '?' + params.toString() : ''),
  };

  const columns: Column<PhotographerManageItem>[] = [
    {
      key: 'name',
      header: 'Thợ chụp ảnh',
      render: (row) => (
        <div className="min-w-0">
          <Link
            to={`/staff/photographers/${row._id}`}
            state={detailState}
            className="font-medium text-primary hover:underline"
          >
            {row.name?.trim() || row.username}
          </Link>
          <p className="text-xs text-muted-foreground">@{row.username}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-muted-foreground">{row.email || '—'}</span>,
    },
    {
      key: 'upcoming',
      header: 'Sắp tới',
      render: (row) => <span className="font-medium">{row.scheduleStats.upcoming}</span>,
    },
    {
      key: 'total',
      header: 'Tổng lịch chụp',
      render: (row) => <span>{row.scheduleStats.total}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <Badge
          variant="outline"
          className={
            row.isActive
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-slate-500/30 bg-slate-500/10 text-muted-foreground'
          }
        >
          {row.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Lịch chụp',
      render: (row) => (
        <Link
          to={`/staff/photographers/${row._id}`}
          state={detailState}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Xem lịch chụp
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý thợ"
        description="Danh sách thợ chụp ảnh trong studio. Chọn tên thợ để xem lịch chụp chi tiết."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          onSearch={() => applySearch(search)}
          onClear={() => applySearch('')}
          placeholder="Tìm theo tên, tài khoản hoặc email..."
          aria-label="Tìm thợ chụp ảnh"
          className="w-full sm:w-80"
        />
        <SegmentedControl<StatusFilter>
          value={statusFilter}
          onChange={(value) => updateParam('status', value === 'all' ? '' : value)}
          items={[
            { value: 'all', label: `Tất cả (${photographers.length})` },
            {
              value: 'active',
              label: `Đang hoạt động (${photographers.filter((p) => p.isActive).length})`,
            },
            {
              value: 'inactive',
              label: `Tạm khóa (${photographers.filter((p) => !p.isActive).length})`,
            },
          ]}
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3"
        >
          <p className="text-sm text-destructive font-medium">
            Không tải được danh sách thợ chụp ảnh.
          </p>
          <Button variant="outline" size="sm" onClick={() => void loadPhotographers()}>
            Thử lại
          </Button>
        </div>
      ) : loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center space-y-2">
          <Camera className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Không có thợ chụp ảnh phù hợp</p>
          <p className="text-sm text-muted-foreground">
            {photographers.length === 0
              ? 'Chưa có tài khoản nào được cấp vai trò Thợ chụp ảnh.'
              : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.'}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(row) => row._id}
          aria-label="Danh sách thợ chụp ảnh"
        />
      )}
    </div>
  );
};

export default PhotographersManagePage;

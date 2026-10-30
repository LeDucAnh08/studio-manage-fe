import type { Column } from '@/components/ui';
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
  Modal,
  PageHeader,
  Pagination,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableSkeleton,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Calendar,
  Check,
  Clock,
  Delete,
  Edit,
  MapPin,
  Mars,
  Paperclip,
  Search,
  Shirt,
  StickyNote,
  Table as TableIcon,
  Users as UsersIcon,
  Venus,
  VenusAndMars,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ScheduleCalendar } from '../components/organisms';
import { costumeService } from '../services/costumeService';
import { scheduleService } from '../services/scheduleService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchPackages } from '../store/slices/packagesSlice';
import { fetchSchedules } from '../store/slices/schedulesSlice';
import { fetchPhotographers, fetchSales } from '../store/slices/usersSlice';
import type { CostumeResponse, ScheduleResponse } from '../types';
import { ROLE_LABELS } from '../types';
import { formatDate } from '../utils/format';
import ScheduleCostumeReservations, {
  type ReservationDraft,
} from '../components/ScheduleCostumeReservations';
import { vietnamCalendarDate } from '../utils/vietnamCalendarDate';
import {
  SCHEDULE_STATUS_COLOR as statusColor,
  SCHEDULE_STATUS_LABEL as statusLabel,
} from '../utils/scheduleConstants';

interface FilterState {
  status: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
}

interface ContractFormValues {
  shootDate: string;
  startTime: string;
  endTime: string;
  location: string;
  contactName: string;
  contactPhone: string;
  contactAddress: string;
  total: number;
  totalMale: number;
  totalFemale: number;
  notes: string;
}

const defaultFilter: FilterState = { status: '', dateFrom: '', dateTo: '', customer: '' };
const ALL = '__all__';

const getInitials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const UserAvatar = ({ name, size = 32 }: { name: string; size?: number }) => {
  return (
    <span className="staff-person-avatar" style={{ width: size, height: size }} aria-hidden="true">
      {getInitials(name)}
    </span>
  );
};

const GENDER_META: Record<
  'male' | 'female' | 'unisex',
  { label: string; icon: React.ReactNode; cls: string }
> = {
  male: {
    label: 'Nam',
    icon: <Mars className="h-3 w-3" />,
    cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  female: {
    label: 'Nữ',
    icon: <Venus className="h-3 w-3" />,
    cls: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  },
  unisex: {
    label: 'Unisex',
    icon: <VenusAndMars className="h-3 w-3" />,
    cls: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  },
};

interface CostumePickerProps {
  costumes: CostumeResponse[];
  selected: string[];
  onChange: (next: string[]) => void;
  showError?: boolean;
}

const CostumePicker = ({ costumes, selected, onChange, showError }: CostumePickerProps) => {
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'unisex'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return costumes.filter((c) => {
      if (genderFilter !== 'all' && c.gender !== genderFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.type?.name?.toLowerCase().includes(q) ?? false);
    });
  }, [costumes, search, genderFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; items: CostumeResponse[] }>();
    for (const c of filtered) {
      const id = c.type?._id ?? '__none__';
      const name = c.type?.name ?? 'Khác';
      if (!map.has(id)) map.set(id, { id, name, items: [] });
      map.get(id)!.items.push(c);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const toggle = (id: string, on: boolean) => {
    onChange(on ? [...selected, id] : selected.filter((x) => x !== id));
  };

  const toggleGroup = (groupItems: CostumeResponse[], allSelected: boolean) => {
    const ids = groupItems.map((c) => c._id);
    if (allSelected) {
      onChange(selected.filter((id) => !ids.includes(id)));
    } else {
      onChange(Array.from(new Set([...selected, ...ids])));
    }
  };

  if (costumes.length === 0) {
    return (
      <div>
        <div className="text-sm font-medium mb-1.5">
          Trang phục <span className="text-destructive">*</span>
        </div>
        <div className="rounded-lg border border-dashed border-destructive/50 bg-destructive/5 px-4 py-6 text-center">
          <Shirt className="mx-auto h-6 w-6 text-destructive mb-2" />
          <p className="text-sm text-destructive font-medium">
            Gói chụp này chưa có trang phục nào được liên kết.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-costume-picker">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <Shirt className="h-4 w-4 text-primary" />
          Trang phục <span className="text-destructive">*</span>
          {selected.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              {selected.length}/{costumes.length} đã chọn
            </span>
          )}
        </div>
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            onClick={() => onChange([])}
          >
            <X className="h-3 w-3 mr-1" /> Bỏ chọn tất cả
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-2.5 py-2 border-b">
          <div className="relative flex-1 min-w-[10rem]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              aria-label="Tìm trang phục trong gói"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm trang phục..."
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="inline-flex rounded-lg border overflow-hidden text-xs">
            {(['all', 'male', 'female', 'unisex'] as const).map((g) => {
              const active = genderFilter === g;
              const labels: Record<typeof g, string> = {
                all: 'Tất cả',
                male: 'Nam',
                female: 'Nữ',
                unisex: 'Unisex',
              };
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGenderFilter(g)}
                  className={cn(
                    'px-2.5 py-1.5 transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {labels[g]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-3">
          {groups.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Không tìm thấy trang phục phù hợp.
            </div>
          ) : (
            groups.map((g) => {
              const allSelected = g.items.every((c) => selected.includes(c._id));
              const someSelected = g.items.some((c) => selected.includes(c._id));
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {g.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {g.items.length}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => toggleGroup(g.items, allSelected)}
                    >
                      {allSelected
                        ? 'Bỏ chọn nhóm'
                        : someSelected
                          ? 'Chọn hết nhóm'
                          : 'Chọn tất cả'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {g.items.map((c) => {
                      const checked = selected.includes(c._id);
                      const meta = GENDER_META[c.gender];
                      return (
                        <label
                          key={c._id}
                          className={cn(
                            'group flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-all',
                            checked
                              ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                              : 'border-border hover:border-primary/50 hover:bg-muted',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={(e) => toggle(c._id, e.target.checked)}
                          />
                          <span
                            className={cn(
                              'shrink-0 w-4 h-4 rounded border inline-flex items-center justify-center transition-colors',
                              checked
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground/40 group-hover:border-primary',
                            )}
                          >
                            {checked && <Check className="h-2.5 w-2.5" />}
                          </span>
                          <span className="text-sm truncate flex-1">{c.name}</span>
                          <span
                            className={cn(
                              'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium',
                              meta.cls,
                            )}
                            title={meta.label}
                          >
                            {meta.icon}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showError && (
        <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
          <X className="h-3 w-3" /> Vui lòng chọn ít nhất một trang phục.
        </p>
      )}
    </div>
  );
};

interface ScheduleFormValues {
  customer: string;
  package?: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  leadPhotographer?: string;
  bookedBy?: string;
  notes?: string;
  season?: string | null;
}

const SchedulesPage = () => {
  const dispatch = useAppDispatch();
  const { list: schedules, total, loading, error } = useAppSelector((s) => s.schedules);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: packages } = useAppSelector((s) => s.packages);
  const { photographers, sales: salesUsers } = useAppSelector((s) => s.users);
  const { list: seasons, selectedSeasonId } = useAppSelector((s) => s.seasons);
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [appliedFilter, setAppliedFilter] = useState<FilterState>(defaultFilter);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [allCostumes, setAllCostumes] = useState<CostumeResponse[]>([]);
  const [selectedCostumes, setSelectedCostumes] = useState<string[]>([]);
  const [reservationRows, setReservationRows] = useState<ReservationDraft[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleResponse | null>(null);
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [detail, setDetail] = useState<ScheduleResponse | null>(null);
  const [costumeTouched, setCostumeTouched] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [contractSchedule, setContractSchedule] = useState<ScheduleResponse | null>(null);
  const [contractDocUrl, setContractDocUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
    watch,
  } = useForm<ScheduleFormValues>();

  const {
    register: registerContract,
    handleSubmit: handleContractSubmitForm,
    reset: resetContract,
    control: contractControl,
    formState: { isSubmitting: isContractSubmitting },
  } = useForm<ContractFormValues>();

  const buildFilterParams = (
    f: FilterState,
    p: number,
    l: number,
  ): Record<string, string | number> => {
    const params: Record<string, string | number> = { page: p, limit: l };
    if (f.status) params.status = f.status;
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    if (f.customer) params.customer = f.customer;
    if (selectedSeasonId) params.season = selectedSeasonId;
    return params;
  };

  const selectedPackageId = watch('package');
  const selectedPackage = packages.find((p) => p._id === selectedPackageId);
  const packageTypeIds = useMemo(
    () => new Set((selectedPackage?.costumes ?? []).map((ct) => ct._id)),
    [selectedPackage],
  );
  const availableCostumes = useMemo(
    () => allCostumes.filter((c) => c.type && packageTypeIds.has(c.type._id)),
    [allCostumes, packageTypeIds],
  );

  useEffect(() => {
    dispatch(fetchSchedules(buildFilterParams(appliedFilter, page, pageSize)));
    dispatch(
      fetchCustomers(selectedSeasonId ? { limit: 200, season: selectedSeasonId } : { limit: 200 }),
    );
    dispatch(fetchPackages());
    dispatch(fetchPhotographers());
    dispatch(fetchSales());
    costumeService.getAll().then(setAllCostumes);
  }, [dispatch, appliedFilter, page, pageSize, selectedSeasonId]);

  const openCreate = () => {
    setEditing(null);
    setSupportIds([]);
    setSelectedCostumes([]);
    setReservationRows([]);
    setCostumeTouched(false);
    reset({ status: 'pending', season: selectedSeasonId || null });
    setModalOpen(true);
  };

  const openEdit = (s: ScheduleResponse) => {
    if (s.workflowBooking) {
      toast.error(
        'Lịch này đã liên kết đơn chụp ảnh. Quản trị viên xử lý thay đổi trong Đơn chụp ảnh.',
      );
      return;
    }
    setEditing(s);
    const leadId = s.leadPhotographer?._id ?? '';
    const supIds = s.supportPhotographers.map((u) => u._id);
    setSupportIds(supIds);
    setSelectedCostumes(s.costumes?.map((c) => c._id) ?? []);
    setReservationRows(
      (s.costumeReservations ?? []).map((row) => ({
        ...row,
        quantity: String(row.quantity),
        receiveDate: vietnamCalendarDate(row.receiveDate),
        returnDate: vietnamCalendarDate(row.returnDate),
      })),
    );
    setCostumeTouched(false);
    reset({
      customer: s.customer._id,
      package: s.package?._id ?? '',
      shootDate: vietnamCalendarDate(s.shootDate),
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      status: s.status,
      notes: s.notes,
      leadPhotographer: leadId,
      bookedBy: s.bookedBy?._id ?? '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: ScheduleFormValues) => {
    if (selectedCostumes.length === 0) {
      setCostumeTouched(true);
      toast.error('Vui lòng chọn ít nhất một trang phục.');
      return;
    }
    const reservations = reservationRows.filter((row) => selectedCostumes.includes(row.costume));
    const keys = reservations.map((row) => `${row.costume}:${row.size}`);
    if (
      data.status !== 'cancelled' &&
      (selectedCostumes.some((id) => !reservations.some((row) => row.costume === id)) ||
        new Set(keys).size !== keys.length ||
        reservations.some(
          (row) =>
            !row.size ||
            !Number.isSafeInteger(Number(row.quantity)) ||
            Number(row.quantity) < 1 ||
            Number(row.quantity) > 10000 ||
            !row.receiveDate ||
            !row.returnDate ||
            row.receiveDate > data.shootDate ||
            row.returnDate < data.shootDate ||
            row.receiveDate > row.returnDate,
        ))
    ) {
      toast.error(
        'Đối soát đủ mẫu, kích cỡ và số lượng; ngày nhận–trả phải bao gồm ngày chụp. Mỗi mẫu và kích cỡ chỉ có một dòng.',
      );
      return;
    }
    const payload = {
      ...data,
      costumes: selectedCostumes,
      costumeReservations: reservations.map((row) => ({ ...row, quantity: Number(row.quantity) })),
      leadPhotographer: data.leadPhotographer || undefined,
      bookedBy: data.bookedBy || undefined,
      supportPhotographers: supportIds,
    };
    try {
      const isEditing = !!editing;
      // create đợi backend tạo folder Drive xong mới trả về, nên getOne đã có
      // driveFolderUrl đầy đủ → mở thẳng modal chi tiết.
      const saved = isEditing
        ? await scheduleService.update(editing!._id, payload)
        : await scheduleService.create(payload);
      toast.success(isEditing ? 'Cập nhật lịch chụp thành công!' : 'Thêm lịch chụp thành công!');
      setModalOpen(false);
      dispatch(fetchSchedules(buildFilterParams(appliedFilter, page, pageSize)));

      setDetail(await scheduleService.getOne(saved._id));
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Có lỗi xảy ra, vui lòng thử lại.',
      );
    }
  };

  const handleDelete = (id: string) => {
    if (schedules.find((schedule) => schedule._id === id)?.workflowBooking) {
      toast.error('Lịch có hồ sơ dịch vụ cần được hủy qua đề xuất và xác nhận của khách.');
      return;
    }
    setConfirmId(id);
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await scheduleService.remove(confirmId);
      toast.success('Đã xoá lịch chụp.');
      dispatch(fetchSchedules(buildFilterParams(appliedFilter, page, pageSize)));
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const handleDownloadContract = (s: ScheduleResponse) => {
    setContractSchedule(s);
    setContractDocUrl(s.contractUrl ?? null);
    resetContract({
      shootDate: s.shootDate ? s.shootDate.slice(0, 10) : '',
      startTime: s.startTime ?? '',
      endTime: s.endTime ?? '',
      location: s.location ?? '',
      contactName: s.customer?.contactName ?? '',
      contactPhone: s.customer?.contactPhone ?? '',
      contactAddress: s.customer?.contactAddress ?? '',
      total: s.customer?.total ?? 0,
      totalMale: s.customer?.totalMale ?? 0,
      totalFemale: s.customer?.totalFemale ?? 0,
      notes: s.notes ?? '',
    });
  };

  const handleContractSubmit = async (formData: ContractFormValues) => {
    if (!contractSchedule) return;
    const payload = { ...contractSchedule, ...formData };
    try {
      const res = await fetch(
        'https://script.google.com/macros/s/AKfycbzgl6HRhrlbo_nf_ZgmIXxeWRGgd7OlGMdMm2JQ0QISTQ0Z_ZHTb0E6W-DS1LRFSmw/exec',
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (json.document_url) {
        setContractDocUrl(json.document_url);
        await scheduleService.update(contractSchedule._id, { contractUrl: json.document_url });
        dispatch(fetchSchedules(buildFilterParams(appliedFilter, page, pageSize)));
        toast.success(json.message ?? 'Tạo hợp đồng thành công!');
      } else {
        toast.error('Không nhận được link hợp đồng.');
      }
    } catch {
      toast.error('Tạo hợp đồng thất bại, vui lòng thử lại.');
    }
  };

  // const handleSendContract = async () => {
  //   if (!contractDocUrl) return;
  //   await navigator.clipboard.writeText(contractDocUrl);
  //   toast.success('Đã copy link hợp đồng!');
  //   setContractSchedule(null);
  //   setContractDocUrl(null);
  // };

  const applyFilter = () => {
    setPage(1);
    setAppliedFilter(filter);
  };
  const resetFilter = () => {
    setFilter(defaultFilter);
    setAppliedFilter(defaultFilter);
    setPage(1);
  };

  const calendarItems = useMemo(
    () =>
      schedules.map((s) => ({
        _id: s._id,
        shootDate: s.shootDate,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        status: s.status,
        notes: s.notes,
        className: s.customer?.className ?? '—',
        leadName: s.leadPhotographer?.name ?? s.leadPhotographer?.username,
      })),
    [schedules],
  );

  const scheduleDescription = (s: ScheduleResponse) =>
    `${s.customer?.className ?? 'Chưa có lớp'} · ${formatDate(s.shootDate)}`;
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

  const scheduleColumns: Column<ScheduleResponse>[] = [
    {
      key: 'date',
      header: 'Ngày chụp',
      className: 'font-medium',
      render: (s) => (
        <div className="flex flex-col">
          <span>{formatDate(s.shootDate)} </span>
          <span className="text-muted-foreground text-xs whitespace-nowrap break-keep">{`${s.startTime ?? ''}${s.endTime ? ` – ${s.endTime}` : ''}`}</span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Lớp',
      render: (s) => (
        <div className="flex flex-col">
          <button
            type="button"
            className="staff-schedule-open font-medium text-primary text-left"
            onClick={() => setDetail(s)}
            aria-label={`Xem lịch ${scheduleDescription(s)}`}
          >
            {s.customer?.className ?? '—'}
          </button>
          <span className="text-muted-foreground text-xs">{s.customer?.school ?? ''}</span>
        </div>
      ),
    },
    {
      key: 'package',
      header: 'Gói chụp',
      className: 'text-muted-foreground',
      render: (s) => s.package?.name ?? '—',
    },
    {
      key: 'sale',
      header: 'Sale',
      render: (s) => {
        const fullName = s.bookedBy?.name ?? s.bookedBy?.username;
        if (!fullName) return '—';
        return <span>{fullName}</span>;
      },
    },
    {
      key: 'leader',
      header: 'Leader',
      render: (s) => {
        const fullName = s.leadPhotographer?.name ?? s.leadPhotographer?.username;
        if (!fullName) return '—';
        return <span>{fullName}</span>;
      },
    },
    {
      key: 'support',
      header: 'Support',
      render: (s) => {
        const names = s.supportPhotographers
          .map((u) => u.name ?? u.username)
          .filter(Boolean) as string[];
        if (names.length === 0) return '—';
        return (
          <details className="staff-crew-disclosure" onClick={(event) => event.stopPropagation()}>
            <summary className="staff-small-disclosure">{names.length} người</summary>
            <span className="block space-y-1 mt-2">
              {names.map((n, i) => (
                <span key={i} className="block">
                  {n}
                </span>
              ))}
            </span>
          </details>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => (
        <Badge variant="outline" className={cn('border-transparent', statusColor[s.status])}>
          {statusLabel[s.status]}
        </Badge>
      ),
    },
    {
      key: 'notes',
      header: 'Ghi chú',
      render: (s) => (
        <span className="block text-muted-foreground whitespace-pre-line" title={s.notes || ''}>
          {s.notes || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (s) => (
        <span className="staff-row-actions">
          <Button
            variant="link"
            size="sm"
            className="staff-icon-action"
            aria-label={`Hợp đồng lịch ${scheduleDescription(s)}`}
            title="Hợp đồng"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadContract(s);
            }}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="link"
            size="sm"
            className="staff-icon-action"
            aria-label={`Sửa lịch ${scheduleDescription(s)}`}
            title="Sửa lịch"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(s);
            }}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="link"
            size="sm"
            className="staff-icon-action text-destructive"
            aria-label={`Xoá lịch ${scheduleDescription(s)}`}
            title="Xoá lịch"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(s._id);
            }}
          >
            <Delete className="h-3.5 w-3.5" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="staff-schedules">
      <PageHeader
        as="h1"
        title="Lịch chụp"
        description="Theo dõi và sắp xếp lịch chụp ảnh theo ngày."
        action={
          <div className="flex items-center gap-2 justify-between w-full md:w-auto">
            <SegmentedControl
              value={viewMode}
              onChange={(v) => setViewMode(v as 'table' | 'calendar')}
              items={[
                { value: 'table', label: 'Bảng', icon: <TableIcon className="h-3.5 w-3.5" /> },
                { value: 'calendar', label: 'Lịch', icon: <Calendar className="h-3.5 w-3.5" /> },
              ]}
            />
            <Button onClick={openCreate}>+ Thêm lịch</Button>
          </div>
        }
      />

      {error && (
        <div role="alert" className="rounded-lg border bg-card p-4 mb-4">
          <p>Không tải được lịch chụp.</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() =>
              dispatch(fetchSchedules(buildFilterParams(appliedFilter, page, pageSize)))
            }
          >
            Thử lại
          </Button>
        </div>
      )}

      <div className="staff-toolbar rounded-lg border bg-card p-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[8rem]">
            <Select
              value={filter.status || ALL}
              onValueChange={(v) => setFilter((f) => ({ ...f, status: v === ALL ? '' : v }))}
            >
              <SelectTrigger aria-label="Lọc trạng thái lịch chụp">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
                {Object.entries(statusLabel).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[8rem]">
            <Combobox
              aria-label="Lọc theo lớp"
              options={[
                { value: '', label: 'Tất cả lớp' },
                ...customers.map((c) => ({ value: c._id, label: c.className })),
              ]}
              value={filter.customer}
              onChange={(v) => setFilter((f) => ({ ...f, customer: v }))}
              placeholder="Tất cả lớp"
            />
          </div>
          <DatePicker
            aria-label="Lọc từ ngày"
            value={filter.dateFrom}
            onChange={(v) => setFilter((f) => ({ ...f, dateFrom: v ?? '' }))}
            placeholder="Từ ngày"
            className="flex-1 min-w-[8rem]"
          />
          <DatePicker
            aria-label="Lọc đến ngày"
            value={filter.dateTo}
            onChange={(v) => setFilter((f) => ({ ...f, dateTo: v ?? '' }))}
            placeholder="Đến ngày"
            className="flex-1 min-w-[8rem]"
          />
          <Button onClick={applyFilter}>Lọc</Button>
          <Button variant="outline" onClick={resetFilter}>
            Xoá lọc
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={11} />
      ) : viewMode === 'calendar' ? (
        <div className="rounded-xl border bg-card p-4">
          <ScheduleCalendar
            items={calendarItems}
            onEdit={(id) => {
              const s = schedules.find((x) => x._id === id);
              if (s) openEdit(s);
            }}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable<ScheduleResponse>
              aria-label="Danh sách lịch chụp"
              className="staff-schedules-table"
              data={schedules}
              keyExtractor={(s) => s._id}
              emptyTitle="Chưa có dữ liệu"
              columns={scheduleColumns}
              onRowClick={(s) => setDetail(s)}
              pagination={{
                serverSide: true,
                ...pagination,
              }}
            />
          </div>

          <div className="md:hidden space-y-3">
            {schedules.map((s) => {
              const customer = s.customer;
              const leadName = s.leadPhotographer?.name ?? s.leadPhotographer?.username ?? null;
              const bookedByName = s.bookedBy?.name ?? s.bookedBy?.username ?? null;
              const supports = s.supportPhotographers.map((u) => u.name ?? u.username).join(', ');
              return (
                <div key={s._id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <button
                      type="button"
                      className="min-w-0 text-left staff-schedule-open"
                      onClick={() => setDetail(s)}
                      aria-label={`Xem lịch ${scheduleDescription(s)}`}
                    >
                      <div className="font-semibold">{formatDate(s.shootDate)}</div>
                      <div className="text-primary text-sm mt-0.5 break-words">
                        {customer?.className ?? '—'}
                        {customer?.school && (
                          <span className="text-muted-foreground"> · {customer.school}</span>
                        )}
                      </div>
                    </button>
                    <Badge
                      variant="outline"
                      className={cn('border-transparent shrink-0', statusColor[s.status])}
                    >
                      {statusLabel[s.status]}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {(s.startTime || s.endTime) && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0 text-primary" />
                        <span>
                          {s.startTime}
                          {s.endTime ? ` – ${s.endTime}` : ''}
                        </span>
                      </div>
                    )}
                    {s.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{s.location}</span>
                      </div>
                    )}
                    {leadName && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Leader:</span> <span className="text-foreground">{leadName}</span>
                      </div>
                    )}
                    {supports && (
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Support:</span> <span className="text-foreground">{supports}</span>
                      </div>
                    )}
                    {s.notes && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border bg-muted/40 text-sm px-3 py-2 whitespace-pre-line">
                        <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{s.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t">
                    <Button
                      variant="link"
                      size="sm"
                      className="staff-row-action"
                      aria-label={`Hợp đồng lịch ${scheduleDescription(s)}`}
                      onClick={() => handleDownloadContract(s)}
                    >
                      Hợp đồng
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="staff-row-action"
                      aria-label={`Sửa lịch ${scheduleDescription(s)}`}
                      onClick={() => openEdit(s)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="staff-row-action text-destructive"
                      aria-label={`Xoá lịch ${scheduleDescription(s)}`}
                      onClick={() => handleDelete(s._id)}
                    >
                      Xoá
                    </Button>
                    {bookedByName && (
                      <span className="ml-auto bg-primary/15 text-primary text-xs font-medium px-2 py-0.5 rounded-full border border-primary/30">
                        {bookedByName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {schedules.length === 0 && (
              <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            )}
            {schedules.length > 0 && (
              <Pagination {...pagination} className="rounded-lg border bg-card" />
            )}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa lịch chụp' : 'Thêm lịch chụp'}
        description="Lớp, gói chụp, ekip và phân bổ trang phục của buổi chụp."
        size="lg"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          aria-busy={isSubmitting}
          className="staff-form space-y-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <FormField label="Lớp" required htmlFor="schedule-customer">
              <Controller
                name="customer"
                control={control}
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <>
                    <Combobox
                      id="schedule-customer"
                      ref={field.ref}
                      aria-required="true"
                      aria-invalid={fieldState.error ? true : undefined}
                      aria-describedby={fieldState.error ? 'schedule-customer-error' : undefined}
                      options={customers.map((c) => ({
                        value: c._id,
                        label: `${c.className} – ${c.school}`,
                      }))}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="-- Chọn lớp --"
                    />
                    {fieldState.error && (
                      <p
                        id="schedule-customer-error"
                        role="alert"
                        className="text-xs text-destructive mt-1"
                      >
                        Vui lòng chọn lớp.
                      </p>
                    )}
                  </>
                )}
              />
            </FormField>
            <FormField label="Gói chụp" required htmlFor="schedule-package">
              <Controller
                name="package"
                control={control}
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <>
                    <Combobox
                      id="schedule-package"
                      ref={field.ref}
                      aria-required="true"
                      aria-invalid={fieldState.error ? true : undefined}
                      aria-describedby={fieldState.error ? 'schedule-package-error' : undefined}
                      options={packages.map((p) => ({
                        value: p._id,
                        label: `${p.name} – ${p.pricePerMember.toLocaleString('vi-VN')}₫/thành viên`,
                      }))}
                      value={field.value ?? ''}
                      onChange={(v) => field.onChange(v || undefined)}
                      placeholder="-- Chọn gói chụp --"
                    />
                    {fieldState.error && (
                      <p
                        id="schedule-package-error"
                        role="alert"
                        className="text-xs text-destructive mt-1"
                      >
                        Vui lòng chọn gói chụp.
                      </p>
                    )}
                  </>
                )}
              />
            </FormField>
            <FormField label="Trạng thái" htmlFor="schedule-status">
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'pending'} onValueChange={field.onChange}>
                    <SelectTrigger id="schedule-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabel).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {selectedPackageId && (
              <div className="lg:col-span-3">
                <CostumePicker
                  costumes={availableCostumes}
                  selected={selectedCostumes}
                  onChange={(selected) => {
                    setSelectedCostumes(selected);
                    setReservationRows((rows) =>
                      rows.filter((row) => !row.costume || selected.includes(row.costume)),
                    );
                  }}
                  showError={costumeTouched && selectedCostumes.length === 0}
                />
              </div>
            )}
            {selectedCostumes.length > 0 && (
              <div className="lg:col-span-3">
                <ScheduleCostumeReservations
                  costumes={allCostumes.filter((costume) => selectedCostumes.includes(costume._id))}
                  rows={reservationRows}
                  shootDate={watch('shootDate') ?? ''}
                  onChange={setReservationRows}
                />
              </div>
            )}
            <FormField label="Ngày chụp" required htmlFor="shootDate">
              <Controller
                name="shootDate"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <DatePicker
                    id="shootDate"
                    aria-required="true"
                    aria-invalid={errors.shootDate ? true : undefined}
                    aria-describedby={errors.shootDate ? 'schedule-date-error' : undefined}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Chọn ngày chụp"
                  />
                )}
              />
              {errors.shootDate && (
                <p id="schedule-date-error" role="alert" className="text-xs text-destructive mt-1">
                  Vui lòng chọn ngày chụp.
                </p>
              )}
            </FormField>
            <FormField label="Giờ bắt đầu" htmlFor="startTime">
              <Input id="startTime" type="time" {...register('startTime')} />
            </FormField>
            <FormField label="Giờ kết thúc" htmlFor="endTime">
              <Input id="endTime" type="time" {...register('endTime')} />
            </FormField>
            <FormField label="Địa điểm" htmlFor="location" className="lg:col-span-3">
              <Input id="location" {...register('location')} />
            </FormField>
            <FormField label="Người chốt lớp (Sale)" htmlFor="schedule-sale">
              <Controller
                name="bookedBy"
                control={control}
                render={({ field }) => (
                  <Combobox
                    id="schedule-sale"
                    options={salesUsers.map((u) => ({
                      value: u._id,
                      label: u.username + (u.name ? ` (${u.name})` : ''),
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không chỉ định --"
                  />
                )}
              />
            </FormField>
            <FormField label="Thợ leader" htmlFor="schedule-leader" className="lg:col-span-2">
              <Controller
                name="leadPhotographer"
                control={control}
                render={({ field }) => (
                  <Combobox
                    id="schedule-leader"
                    options={photographers.map((u) => ({
                      value: u._id,
                      label: `${u.username}${u.name ? ` (${u.name})` : ''} – ${ROLE_LABELS[3]}`,
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không chỉ định --"
                  />
                )}
              />
            </FormField>
            {watch('leadPhotographer') && (
              <FormField label="Thợ support" className="lg:col-span-3">
                <div className="border rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                  {photographers
                    .filter((u) => u._id !== watch('leadPhotographer'))
                    .map((u) => (
                      <label
                        key={u._id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted px-1 py-0.5 rounded"
                      >
                        <Checkbox
                          checked={supportIds.includes(u._id)}
                          onCheckedChange={(c) =>
                            setSupportIds((prev) =>
                              c ? [...prev, u._id] : prev.filter((id) => id !== u._id),
                            )
                          }
                        />
                        <span className="text-sm">
                          {u.username}
                          {u.name ? ` (${u.name})` : ''}
                        </span>
                        <span className="text-xs text-muted-foreground">— {ROLE_LABELS[3]}</span>
                      </label>
                    ))}
                  {photographers.length === 0 && (
                    <p className="text-sm text-muted-foreground px-1">
                      Không có người dùng phù hợp
                    </p>
                  )}
                </div>
              </FormField>
            )}
            <FormField label="Mùa chụp" htmlFor="schedule-season">
              <Controller
                name="season"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger id="schedule-season">
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
            <FormField label="Ghi chú" htmlFor="notes" className="lg:col-span-3">
              <Textarea id="notes" rows={2} {...register('notes')} />
            </FormField>
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
        message="Bạn có chắc muốn xoá lịch chụp này? Thao tác sẽ xoá luôn folder ảnh trên Google Drive và dòng tương ứng trong Google Sheet quản lý."
        onConfirm={doDelete}
      />

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        title="Chi tiết lịch chụp"
        size="lg"
      >
        {detail && (
          <div className="space-y-6">
            <section className="staff-detail-summary">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <Badge variant="outline" className={statusColor[detail.status]}>
                    {statusLabel[detail.status]}
                  </Badge>
                  <h3 className="text-xl font-semibold break-words">
                    {detail.customer?.className ?? '—'}
                  </h3>
                  <p className="text-sm text-muted-foreground">{detail.customer?.school}</p>
                  <p className="text-sm tabular-nums">
                    {formatDate(detail.shootDate)}
                    {detail.startTime ? ' · ' + detail.startTime : ''}
                    {detail.endTime ? ' – ' + detail.endTime : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => handleDownloadContract(detail)}>
                    Hợp đồng
                  </Button>
                  <Button
                    onClick={() => {
                      setDetail(null);
                      openEdit(detail);
                    }}
                  >
                    Sửa
                  </Button>
                </div>
              </div>
            </section>
            <section className="space-y-3">
              <h3 className="text-lg font-semibold">Thông tin buổi chụp</h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Địa điểm</dt>
                  <dd className="mt-1 break-words">{detail.location || 'Chưa có'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Gói chụp</dt>
                  <dd className="mt-1">
                    {detail.package?.name || 'Chưa có'}
                    {typeof detail.package?.pricePerMember === 'number' && (
                      <span className="block text-sm tabular-nums text-muted-foreground">
                        {detail.package.pricePerMember.toLocaleString('vi-VN')}₫/thành viên
                      </span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Folder ảnh</dt>
                  <dd className="mt-1">
                    {detail.driveFolderUrl ? (
                      <a
                        href={detail.driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        Mở folder trên Google Drive
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Đang tạo folder…</span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>
            <section className="space-y-3">
              <h3 className="text-lg font-semibold">Đội ngũ phụ trách</h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    label: 'Sale',
                    people: detail.bookedBy
                      ? [detail.bookedBy.name ?? detail.bookedBy.username]
                      : [],
                  },
                  {
                    label: 'Leader',
                    people: detail.leadPhotographer
                      ? [detail.leadPhotographer.name ?? detail.leadPhotographer.username]
                      : [],
                  },
                  {
                    label: 'Support',
                    people: detail.supportPhotographers.map(
                      (person) => person.name ?? person.username,
                    ),
                  },
                ].map((group) => (
                  <div key={group.label}>
                    <dt className="text-sm text-muted-foreground">{group.label}</dt>
                    <dd className="mt-2 space-y-2">
                      {group.people.length
                        ? group.people.map((name, index) => (
                            <span key={index} className="flex items-center gap-2">
                              <UserAvatar name={name} size={28} />
                              <span>{name}</span>
                            </span>
                          ))
                        : 'Chưa có'}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
            {detail.notes && (
              <section className="rounded-lg border bg-muted/40 p-4 space-y-2">
                <h3 className="font-semibold">Ghi chú</h3>
                <p className="text-sm whitespace-pre-line break-words">{detail.notes}</p>
              </section>
            )}
            <div className="staff-modal-footer flex justify-end">
              <Button
                variant="link"
                className="text-destructive"
                onClick={() => {
                  const id = detail._id;
                  setDetail(null);
                  handleDelete(id);
                }}
              >
                Xoá lịch chụp
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={!!contractSchedule}
        onOpenChange={(o) => !o && setContractSchedule(null)}
        title="Xác nhận thông tin hợp đồng"
        size="lg"
      >
        {contractSchedule && (
          <form onSubmit={handleContractSubmitForm(handleContractSubmit)} className="space-y-5">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {contractSchedule.customer?.className}
              {contractSchedule.customer?.school ? ` — ${contractSchedule.customer.school}` : ''}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Ngày chụp" required htmlFor="contract-date">
                <Controller
                  name="shootDate"
                  control={contractControl}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <DatePicker
                      id="contract-date"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Chọn ngày chụp"
                    />
                  )}
                />
              </FormField>
              <FormField label="Địa điểm" htmlFor="contract-location">
                <Input
                  id="contract-location"
                  placeholder="Địa điểm chụp"
                  {...registerContract('location')}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Giờ bắt đầu" htmlFor="contract-start">
                <Input id="contract-start" type="time" {...registerContract('startTime')} />
              </FormField>
              <FormField label="Giờ kết thúc" htmlFor="contract-end">
                <Input id="contract-end" type="time" {...registerContract('endTime')} />
              </FormField>
            </div>

            <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Người liên hệ" required htmlFor="contract-contact">
                <Input
                  id="contract-contact"
                  placeholder="Họ tên"
                  {...registerContract('contactName')}
                />
              </FormField>
              <FormField label="Số điện thoại" htmlFor="contract-phone">
                <Input
                  id="contract-phone"
                  placeholder="SĐT"
                  {...registerContract('contactPhone')}
                />
              </FormField>
            </div>

            <FormField label="Địa chỉ" htmlFor="contract-address">
              <Input
                id="contract-address"
                placeholder="Địa chỉ liên hệ"
                {...registerContract('contactAddress')}
              />
            </FormField>

            <div className="grid grid-cols-3 gap-4">
              <FormField label="Tổng học sinh" htmlFor="contract-total">
                <Input
                  id="contract-total"
                  type="number"
                  min={0}
                  {...registerContract('total', { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="Nam" htmlFor="contract-male">
                <Input
                  id="contract-male"
                  type="number"
                  min={0}
                  {...registerContract('totalMale', { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="Nữ" htmlFor="contract-female">
                <Input
                  id="contract-female"
                  type="number"
                  min={0}
                  {...registerContract('totalFemale', { valueAsNumber: true })}
                />
              </FormField>
            </div>

            <FormField label="Ghi chú" htmlFor="contract-notes">
              <Textarea
                id="contract-notes"
                rows={3}
                placeholder="Ghi chú hợp đồng..."
                {...registerContract('notes')}
              />
            </FormField>

            {contractDocUrl && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Hợp đồng</p>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm overflow-hidden">
                  <a
                    href={contractDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={contractDocUrl}
                    className="flex-1 min-w-0 truncate text-primary underline underline-offset-2"
                  >
                    {(() => {
                      const idx = contractDocUrl.indexOf('/open');
                      return idx !== -1 ? contractDocUrl.slice(0, idx + 5) + '...' : contractDocUrl;
                    })()}
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(contractDocUrl);
                      toast.success('Đã copy link hợp đồng!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setContractSchedule(null);
                  setContractDocUrl(null);
                }}
              >
                Đóng
              </Button>
              {/* {!contractDocUrl && ( */}
              <Button type="submit" disabled={isContractSubmitting}>
                {isContractSubmitting ? 'Đang tạo...' : 'Tạo hợp đồng'}
              </Button>
              {/* )} */}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default SchedulesPage;

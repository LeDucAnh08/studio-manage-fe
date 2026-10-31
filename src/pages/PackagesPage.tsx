import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { packageService } from '../services/packageService';
import { costumeTypeService } from '../services/costumeTypeService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchPackages } from '../store/slices/packagesSlice';
import type { CostumeType, Package } from '../types';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  Label,
  Modal,
  MultiSelect,
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

const editingScopeLabel: Record<string, string> = {
  full: 'Toàn bộ',
  partial: 'Một phần',
};

const durationLabel: Record<string, string> = {
  full_day: '1 ngày',
  half_day: '1/2 ngày',
  two_thirds_day: '2/3 ngày',
};

const NO_DURATION = '__none__';

interface PackageFormValues {
  name: string;
  pricePerMember: number;
  depositPercent: number;
  depositHoldHours: number;
  duration?: 'full_day' | 'half_day' | 'two_thirds_day';
  costumes?: string[];
  crewRatio?: string;
  editingScope?: 'full' | 'partial';
  deliveryDays?: number;
  studentsPerCrew?: number;
  description?: string;
  isPopular?: boolean;
}

const PackagesPage = () => {
  const dispatch = useAppDispatch();
  const { list: packages, loading, error } = useAppSelector((s) => s.packages);
  const [allCostumes, setAllCostumes] = useState<CostumeType[]>([]);
  const [selectedCostumes, setSelectedCostumes] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
  } = useForm<PackageFormValues>();

  useEffect(() => {
    dispatch(fetchPackages());
    costumeTypeService.getAll().then(setAllCostumes);
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setSelectedCostumes([]);
    reset({ editingScope: 'full', depositPercent: 30, depositHoldHours: 24 });
    setModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    const costumeIds = (pkg.costumes ?? []).map((c) => c._id);
    setSelectedCostumes(costumeIds);
    reset({
      name: pkg.name,
      pricePerMember: pkg.pricePerMember,
      depositPercent: pkg.depositPercent ?? 30,
      depositHoldHours: pkg.depositHoldHours ?? 24,
      duration: pkg.duration,
      costumes: costumeIds,
      crewRatio: pkg.crewRatio,
      editingScope: pkg.editingScope ?? 'full',
      deliveryDays: pkg.deliveryDays,
      studentsPerCrew: pkg.studentsPerCrew,
      description: pkg.description,
      isPopular: pkg.isPopular ?? false,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: PackageFormValues) => {
    try {
      const payload = { ...data, costumes: selectedCostumes };
      if (editing) {
        await packageService.update(editing._id, payload);
        toast.success('Cập nhật gói chụp thành công!');
      } else {
        await packageService.create(payload);
        toast.success('Thêm gói chụp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchPackages());
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await packageService.remove(confirmId);
      toast.success('Đã xoá gói chụp.');
      dispatch(fetchPackages());
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const columns: Column<Package>[] = [
    {
      key: 'name',
      header: 'Tên gói',
      render: (pkg) => (
        <span className="font-medium inline-flex items-center gap-2">
          {pkg.name}
          {pkg.isPopular && (
            <Badge variant="warning" className="text-[10px] uppercase tracking-wider">
              Phổ biến
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Giá/thành viên',
      align: 'right',
      className: 'whitespace-nowrap tabular-nums',
      render: (pkg) => `${pkg.pricePerMember.toLocaleString('vi-VN')}₫`,
    },
    {
      key: 'duration',
      header: 'Thời gian',
      render: (pkg) => (
        <span className="text-muted-foreground">
          {pkg.duration ? durationLabel[pkg.duration] : '—'}
        </span>
      ),
    },
    {
      key: 'crew',
      header: 'Ekip (hs/thợ)',
      render: (pkg) => (
        <span className="text-muted-foreground">
          {pkg.studentsPerCrew != null ? `${pkg.studentsPerCrew} hs/thợ` : '—'}
        </span>
      ),
    },
    {
      key: 'costumes',
      header: 'Trang phục',
      render: (pkg) => (
        <span className="text-muted-foreground">
          {pkg.costumes && pkg.costumes.length > 0
            ? pkg.costumes.map((c) => c.name).join(', ')
            : '—'}
        </span>
      ),
    },
    {
      key: 'editingScope',
      header: 'Chỉnh sửa',
      render: (pkg) => (
        <span className="text-muted-foreground">
          {pkg.editingScope ? editingScopeLabel[pkg.editingScope] : '—'}
        </span>
      ),
    },
    {
      key: 'deliveryDays',
      header: 'Trả file tối đa (ngày)',
      render: (pkg) => (
        <span className="text-muted-foreground">
          {pkg.deliveryDays != null ? `tối đa ${pkg.deliveryDays} ngày` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (pkg) => (
        <span className="staff-row-actions">
          <Button asChild variant="link" size="sm" className="staff-row-action">
            <Link
              to={`/settings/packages/${pkg._id}/content`}
              aria-label={`Nội dung chi tiết gói ${pkg.name}`}
            >
              Nội dung chi tiết
            </Link>
          </Button>
          <Button
            variant="link"
            size="sm"
            className="staff-row-action"
            aria-label={`Sửa gói ${pkg.name}`}
            onClick={() => openEdit(pkg)}
          >
            Sửa
          </Button>
          <Button
            variant="link"
            size="sm"
            className="staff-row-action text-destructive"
            aria-label={`Xoá gói ${pkg.name}`}
            onClick={() => setConfirmId(pkg._id)}
          >
            Xoá
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="staff-packages">
      <PageHeader
        as="h1"
        title="Gói chụp"
        description="Cấu hình các gói chụp ảnh và thời lượng."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm gói
          </Button>
        }
      />

      {error && (
        <div role="alert" className="rounded-lg border bg-card p-4 mb-4">
          <p>Không tải được gói chụp.</p>
          <Button className="mt-3" variant="outline" onClick={() => dispatch(fetchPackages())}>
            Thử lại
          </Button>
        </div>
      )}

      {loading ? (
        <TableSkeleton cols={8} />
      ) : (
        <>
          <div className="min-w-0">
            <DataTable<Package>
              aria-label="Gói chụp"
              className="staff-packages-table"
              data={packages}
              keyExtractor={(pkg) => pkg._id}
              emptyTitle="Chưa có gói chụp nào"
              columns={columns}
            />
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa gói chụp' : 'Thêm gói chụp'}
        description="Giá theo thành viên, nội dung gói và các loại trang phục đã bao gồm."
      >
        <form onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Tên gói"
              required
              htmlFor="pkgName"
              error={errors.name ? 'Vui lòng nhập tên gói.' : undefined}
              className="sm:col-span-2"
            >
              <Input
                id="pkgName"
                placeholder="VD: Gói cơ bản, Gói nâng cao..."
                {...register('name', { required: true })}
              />
            </FormField>
            <FormField
              label="Giá/thành viên (₫)"
              required
              htmlFor="price"
              error={errors.pricePerMember ? 'Vui lòng nhập giá/thành viên.' : undefined}
            >
              <Input
                id="price"
                type="number"
                min={0}
                placeholder="VD: 150000"
                {...register('pricePerMember', { required: true, valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Tiền cọc (%)"
              htmlFor="package-deposit-percent"
              hint="Tính theo tổng giá gói khi khách đặt."
            >
              <Input
                id="package-deposit-percent"
                type="number"
                min={1}
                max={100}
                step={1}
                {...register('depositPercent', {
                  required: true,
                  valueAsNumber: true,
                  min: 1,
                  max: 100,
                  validate: Number.isSafeInteger,
                })}
              />
            </FormField>
            <FormField
              label="Giữ lịch chờ cọc (giờ)"
              htmlFor="package-hold-hours"
              hint="Tính từ lúc duyệt; hết hạn chưa đủ cọc sẽ tự hủy."
            >
              <Input
                id="package-hold-hours"
                type="number"
                min={1}
                max={168}
                step={1}
                {...register('depositHoldHours', {
                  required: true,
                  valueAsNumber: true,
                  min: 1,
                  max: 168,
                  validate: Number.isSafeInteger,
                })}
              />
            </FormField>
            <FormField label="Thời gian" htmlFor="package-duration">
              <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || NO_DURATION}
                    onValueChange={(v) => field.onChange(v === NO_DURATION ? undefined : v)}
                  >
                    <SelectTrigger id="package-duration">
                      <SelectValue placeholder="-- Không xác định --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_DURATION}>-- Không xác định --</SelectItem>
                      <SelectItem value="half_day">1/2 ngày</SelectItem>
                      <SelectItem value="two_thirds_day">2/3 ngày</SelectItem>
                      <SelectItem value="full_day">1 ngày</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Ekip (số học sinh / 1 thợ)" htmlFor="studentsPerCrew">
              <Input
                id="studentsPerCrew"
                type="number"
                min={1}
                placeholder="Ví dụ: 20"
                {...register('studentsPerCrew', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Trang phục" htmlFor="package-costumes">
              <MultiSelect
                id="package-costumes"
                options={allCostumes.map((c) => ({
                  value: c._id,
                  label: c.name + (c.description ? ` — ${c.description}` : ''),
                }))}
                value={selectedCostumes}
                onChange={setSelectedCostumes}
                placeholder={
                  allCostumes.length === 0
                    ? 'Chưa có loại trang phục nào'
                    : 'Chọn loại trang phục...'
                }
                disabled={allCostumes.length === 0}
              />
            </FormField>
            <FormField label="Chỉnh sửa ảnh" htmlFor="package-editing">
              <Controller
                name="editingScope"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'full'} onValueChange={field.onChange}>
                    <SelectTrigger id="package-editing">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Toàn bộ file</SelectItem>
                      <SelectItem value="partial">Một phần</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Trả file sau tối đa (ngày)" htmlFor="deliveryDays">
              <Input
                id="deliveryDays"
                type="number"
                min={1}
                placeholder="VD: 7"
                {...register('deliveryDays', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Mô tả thêm" htmlFor="pkgDesc" className="sm:col-span-2">
              <Textarea
                id="pkgDesc"
                rows={2}
                placeholder="Thông tin bổ sung..."
                {...register('description')}
              />
            </FormField>
            <div className="sm:col-span-2">
              <Controller
                name="isPopular"
                control={control}
                render={({ field }) => (
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={(v) => field.onChange(!!v)}
                    />
                    <Label className="cursor-pointer">
                      Đánh dấu là gói <strong>phổ biến</strong> (hiển thị nổi bật trên trang giới
                      thiệu)
                    </Label>
                  </label>
                )}
              />
            </div>
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
        message="Bạn có chắc muốn xoá gói chụp này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default PackagesPage;

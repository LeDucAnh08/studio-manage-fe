import { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { isAxiosError } from 'axios';
import { toast } from 'react-toastify';
import { costumeService } from '../services/costumeService';
import { costumeTypeService } from '../services/costumeTypeService';
import type { Costume, CostumeInventory, CostumeResponse, CostumeType } from '../types';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

interface CostumeFormValues {
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'unisex';
  type?: string;
  itemKind: 'clothing' | 'accessory';
  isRentalItem: boolean;
  rentalPrice: number;
  inventory: CostumeInventory[];
}

const SIZE_OPTIONS = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'FREE',
  ...Array.from({ length: 10 }, (_, i) => String(i + 36)),
];
const CONDITION_LABEL: Record<CostumeInventory['condition'], string> = {
  good: 'Tốt',
  repair: 'Cần sửa',
  damaged: 'Hư hỏng',
  retired: 'Ngưng sử dụng',
};
const ITEM_KIND_LABEL: Record<CostumeFormValues['itemKind'], string> = {
  clothing: 'Trang phục',
  accessory: 'Phụ kiện',
};
const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;
const summarizeInventory = (inventory: CostumeInventory[] = []) => {
  const ready = inventory.filter((entry) => entry.condition === 'good' && entry.quantity > 0);
  const needsCare = inventory
    .filter((entry) => entry.condition !== 'good' && entry.quantity > 0)
    .reduce((sum, entry) => sum + entry.quantity, 0);
  return { ready, needsCare };
};

const GENDER_LABEL: Record<Costume['gender'], string> = {
  male: 'Nam',
  female: 'Nữ',
  unisex: 'Nam / Nữ',
};

const NO_TYPE = '__none__';

const getTypeId = (type: CostumeType | undefined): string => type?._id ?? '';
const getTypeName = (type: CostumeType | undefined): string => type?.name ?? '—';

const CostumesPage = () => {
  const [costumes, setCostumes] = useState<CostumeResponse[]>([]);
  const [costumeTypes, setCostumeTypes] = useState<CostumeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostumeResponse | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<CostumeFormValues>({ mode: 'onBlur' });
  const { fields: inventoryFields, append, remove } = useFieldArray({ control, name: 'inventory' });
  const isRentalEnabled = watch('isRentalItem');

  const load = async () => {
    try {
      const data = await costumeService.getAll();
      setCostumes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    costumeTypeService.getAll().then(setCostumeTypes);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setSubmitError('');
    reset({
      name: '',
      description: '',
      gender: 'unisex',
      type: '',
      itemKind: 'clothing',
      isRentalItem: false,
      rentalPrice: 0,
      inventory: [],
    });
    setModalOpen(true);
  };

  const openEdit = (costume: CostumeResponse) => {
    setEditing(costume);
    setSubmitError('');
    reset({
      name: costume.name,
      description: costume.description ?? '',
      gender: costume.gender ?? 'unisex',
      type: getTypeId(costume.type),
      itemKind: costume.itemKind ?? 'clothing',
      isRentalItem: costume.isRentalItem ?? false,
      rentalPrice: costume.rentalPrice ?? 0,
      inventory: costume.inventory ?? [],
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: CostumeFormValues) => {
    setSubmitError('');
    const payload = {
      ...data,
      rentalPrice:
        Number.isSafeInteger(data.rentalPrice) && data.rentalPrice >= 0 ? data.rentalPrice : 0,
    };
    try {
      if (editing) {
        await costumeService.update(editing._id, payload);
        toast.success('Cập nhật trang phục thành công!');
      } else {
        await costumeService.create(payload);
        toast.success('Thêm mặt hàng thành công!');
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setSubmitError(message || 'Không lưu được dữ liệu. Kiểm tra lại thông tin rồi thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await costumeService.remove(confirmId);
      toast.success('Đã xoá trang phục.');
      await load();
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const columns: Column<CostumeResponse>[] = [
    {
      key: 'product',
      header: 'Mặt hàng',
      render: (c) => (
        <div className="min-w-48 space-y-1.5">
          <p className="font-semibold leading-tight">{c.name}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{ITEM_KIND_LABEL[c.itemKind ?? 'clothing']}</Badge>
            {c.type && <Badge variant="outline">{getTypeName(c.type)}</Badge>}
            <span className="text-xs text-muted-foreground">{GENDER_LABEL[c.gender] ?? '—'}</span>
          </div>
          {c.description && (
            <p className="line-clamp-1 text-xs text-muted-foreground">{c.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'rental',
      header: 'Cho thuê',
      render: (c) => (
        <div className="min-w-28 space-y-1.5">
          <Badge variant={c.isRentalItem ? 'default' : 'outline'}>
            {c.isRentalItem ? 'Đang mở' : 'Nội bộ'}
          </Badge>
          <p className="text-xs font-medium">
            {c.isRentalItem ? (c.rentalPrice ? formatVnd(c.rentalPrice) : 'Chưa báo giá') : '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'inventory',
      header: 'Kích cỡ sẵn sàng',
      render: (c) => (
        <div className="min-w-40 space-y-1">
          {(() => {
            const summary = summarizeInventory(c.inventory);
            return (
              <>
                <p className="text-xs text-muted-foreground">
                  {summary.ready.length
                    ? summary.ready.map((entry) => `${entry.size} × ${entry.quantity}`).join(' · ')
                    : 'Chưa có cỡ sẵn sàng'}
                </p>
                {summary.needsCare > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {summary.needsCare} sản phẩm cần xử lý
                  </p>
                )}
              </>
            );
          })()}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (c) => (
        <span className="space-x-2">
          <Button variant="outline" size="sm" className="min-h-10 px-3" onClick={() => openEdit(c)}>
            Sửa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-10 px-3 text-destructive"
            onClick={() => setConfirmId(c._id)}
          >
            Xoá
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="Settings"
        title="Trang phục & phụ kiện"
        description="Quản lý danh mục dùng trong buổi chụp và thông tin cho thuê."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm mặt hàng
          </Button>
        }
      />

      <div className="hidden md:block">
        <DataTable<CostumeResponse>
          loading={loading}
          data={costumes}
          keyExtractor={(c) => c._id}
          emptyTitle="Chưa có mặt hàng nào"
          columns={columns}
          dense
          textSize="sm"
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
            Đang tải…
          </div>
        ) : costumes.length === 0 ? (
          <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
            Chưa có mặt hàng nào
          </div>
        ) : (
          costumes.map((c) => {
            const genderStyle =
              c.gender === 'male'
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                : c.gender === 'female'
                  ? 'bg-pink-500/15 text-pink-600 dark:text-pink-400'
                  : 'bg-purple-500/15 text-purple-600 dark:text-purple-400';
            return (
              <div key={c._id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{c.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="outline" className={cn('border-transparent', genderStyle)}>
                        {GENDER_LABEL[c.gender] ?? '—'}
                      </Badge>
                      {c.type && <Badge variant="outline">{getTypeName(c.type)}</Badge>}
                      <Badge variant="outline">{ITEM_KIND_LABEL[c.itemKind ?? 'clothing']}</Badge>
                      <Badge variant={c.isRentalItem ? 'default' : 'outline'}>
                        {c.isRentalItem ? 'Cho thuê' : 'Dùng nội bộ'}
                      </Badge>
                    </div>
                  </div>
                </div>
                {c.isRentalItem && (
                  <p className="text-sm font-medium">
                    Giá thuê: {c.rentalPrice ? formatVnd(c.rentalPrice) : 'Liên hệ báo giá'}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.inventory?.length
                    ? c.inventory
                        .map(
                          (entry) =>
                            `${entry.size}: ${entry.quantity} (${CONDITION_LABEL[entry.condition]})`,
                        )
                        .join(', ')
                    : 'Chưa cập nhật tồn kho'}
                </p>
                {c.description && (
                  <p className="text-sm text-muted-foreground italic">{c.description}</p>
                )}
                <div className="flex justify-end gap-3 mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 flex-1"
                    onClick={() => openEdit(c)}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 min-w-11 text-destructive"
                    aria-label={`Xóa ${c.name}`}
                    onClick={() => setConfirmId(c._id)}
                  >
                    Xoá
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSubmitError('');
        }}
        title={editing ? 'Sửa trang phục / phụ kiện' : 'Thêm trang phục / phụ kiện'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {submitError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {submitError}
            </p>
          )}
          <section
            className="space-y-4 rounded-xl border bg-muted/20 p-4"
            aria-labelledby="costume-info-title"
          >
            <div>
              <h3 id="costume-info-title" className="font-semibold">
                Thông tin mặt hàng
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Nhận diện sản phẩm trong danh mục và lịch chụp.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Tên mặt hàng" required htmlFor="name" error={errors.name?.message}>
                <Input
                  id="name"
                  placeholder="VD: Đồng phục trường, Áo dài, Tự do..."
                  {...register('name', {
                    required: 'Nhập tên mặt hàng.',
                    maxLength: { value: 120, message: 'Tên không được vượt quá 120 ký tự.' },
                  })}
                />
              </FormField>
              <FormField label="Giới tính" required htmlFor="costume-gender">
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? 'unisex'} onValueChange={field.onChange}>
                      <SelectTrigger id="costume-gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Nam</SelectItem>
                        <SelectItem value="female">Nữ</SelectItem>
                        <SelectItem value="unisex">Nam / Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Danh mục" htmlFor="costume-category">
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || NO_TYPE}
                      onValueChange={(v) => field.onChange(v === NO_TYPE ? '' : v)}
                    >
                      <SelectTrigger id="costume-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TYPE}>-- Không phân loại --</SelectItem>
                        {costumeTypes.map((t) => (
                          <SelectItem key={t._id} value={t._id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Nhóm mặt hàng" required htmlFor="costume-item-kind">
                <Controller
                  name="itemKind"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? 'clothing'} onValueChange={field.onChange}>
                      <SelectTrigger id="costume-item-kind">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clothing">Trang phục</SelectItem>
                        <SelectItem value="accessory">Phụ kiện</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Mô tả" htmlFor="description" className="sm:col-span-2">
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Mô tả chất liệu, màu sắc hoặc thông tin cần biết..."
                  {...register('description')}
                />
              </FormField>
            </div>
          </section>
          <section
            className="space-y-3 rounded-xl border p-4"
            aria-labelledby="costume-rental-title"
          >
            <div>
              <h3 id="costume-rental-title" className="font-semibold">
                Cho thuê
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Mặt hàng cần được bật để xuất hiện trong catalog công khai.
              </p>
            </div>
            <Controller
              name="isRentalItem"
              control={control}
              render={({ field }) => (
                <label
                  htmlFor="isRentalItem"
                  className="flex min-h-11 items-center gap-3 rounded-md border p-3 text-sm"
                >
                  <Checkbox
                    id="isRentalItem"
                    checked={field.value ?? false}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  Đưa mặt hàng vào danh mục cho thuê
                </label>
              )}
            />
            <FormField
              label="Giá thuê (đồng)"
              htmlFor="rentalPrice"
              hint={isRentalEnabled ? undefined : 'Bật cho thuê để nhập giá.'}
              error={errors.rentalPrice?.message}
            >
              <Input
                id="rentalPrice"
                type="number"
                min="0"
                step="1"
                disabled={!isRentalEnabled}
                {...register('rentalPrice', {
                  valueAsNumber: true,
                  validate: (value) =>
                    !isRentalEnabled ||
                    (Number.isSafeInteger(value) && value >= 0) ||
                    'Nhập giá thuê là số nguyên không âm.',
                })}
              />
            </FormField>
          </section>
          <section
            className="space-y-3 rounded-xl border p-4"
            aria-labelledby="costume-stock-title"
          >
            <div>
              <h3 id="costume-stock-title" className="font-semibold">
                Tồn kho
              </h3>
              <p className="text-xs text-muted-foreground">
                Nhập số lượng theo kích cỡ và tình trạng.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium">Cỡ và số lượng</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => append({ size: 'M', quantity: 0, condition: 'good' })}
                >
                  <Plus /> Thêm cỡ
                </Button>
              </div>
              {inventoryFields.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  Chưa nhập tồn kho.
                </p>
              ) : (
                <div className="space-y-2">
                  {inventoryFields.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <FormField label="Kích cỡ" htmlFor={`inventory-size-${index}`}>
                        <Controller
                          name={`inventory.${index}.size`}
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger id={`inventory-size-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SIZE_OPTIONS.map((size) => (
                                  <SelectItem key={size} value={size}>
                                    {size}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormField>
                      <FormField
                        label="Số lượng"
                        htmlFor={`inventory-quantity-${index}`}
                        error={errors.inventory?.[index]?.quantity?.message}
                      >
                        <Input
                          id={`inventory-quantity-${index}`}
                          type="number"
                          min="0"
                          step="1"
                          {...register(`inventory.${index}.quantity`, {
                            valueAsNumber: true,
                            min: { value: 0, message: 'Số lượng không thể âm.' },
                            validate: (value) =>
                              Number.isSafeInteger(value) || 'Nhập số lượng là số nguyên không âm.',
                          })}
                        />
                      </FormField>
                      <FormField label="Tình trạng" htmlFor={`inventory-condition-${index}`}>
                        <Controller
                          name={`inventory.${index}.condition`}
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger id={`inventory-condition-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(CONDITION_LABEL).map(([condition, label]) => (
                                  <SelectItem key={condition} value={condition}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormField>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11 min-w-11 self-end text-destructive"
                        aria-label={`Xóa dòng tồn kho ${index + 1}`}
                        onClick={() => remove(index)}
                      >
                        Xoá
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setModalOpen(false)}
            >
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" className="min-h-11" disabled={isSubmitting}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá mặt hàng"
        message="Bạn có chắc muốn xoá mặt hàng này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default CostumesPage;

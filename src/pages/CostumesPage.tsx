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

interface CostumeFormValues {
  name: string;
  description?: string;
  gender: 'male' | 'female' | 'unisex';
  type?: string;
  itemKind: 'clothing' | 'accessory';
  isRentalItem: boolean;
  rentalPrice: number;
  rentalDailyPrice: number | null;
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
  const [loadError, setLoadError] = useState(false);
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
    setLoading(true);
    setLoadError(false);
    try {
      const data = await costumeService.getAll();
      setCostumes(data);
    } catch {
      setLoadError(true);
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
      rentalDailyPrice: null,
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
      rentalDailyPrice: costume.rentalDailyPrice ?? null,
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
      rentalDailyPrice:
        data.rentalDailyPrice === undefined
          ? (editing?.rentalDailyPrice ?? null)
          : data.rentalDailyPrice,
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
          {c.imageUrl && (
            <img
              src={c.imageUrl}
              alt={c.name}
              width={80}
              height={80}
              loading="lazy"
              className="h-20 w-20 rounded-md object-contain bg-muted"
            />
          )}
          <p className="font-semibold leading-tight">{c.name}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{ITEM_KIND_LABEL[c.itemKind ?? 'clothing']}</Badge>
            {c.type && <Badge variant="outline">{getTypeName(c.type)}</Badge>}
            <span className="text-xs text-muted-foreground">{GENDER_LABEL[c.gender] ?? '—'}</span>
          </div>
          {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
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
          <p className="text-sm font-medium tabular-nums">
            {c.isRentalItem
              ? c.rentalDailyPrice
                ? `${formatVnd(c.rentalDailyPrice)}/ngày`
                : 'Chưa có giá/ngày'
              : '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'inventory',
      header: 'Tồn tốt theo kích cỡ',
      render: (c) => (
        <div className="min-w-40 space-y-1">
          {(() => {
            const summary = summarizeInventory(c.inventory);
            return (
              <>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {summary.ready.length
                    ? summary.ready.map((entry) => `${entry.size} × ${entry.quantity}`).join(' · ')
                    : 'Chưa có tồn tốt'}
                </p>
                {summary.needsCare > 0 && (
                  <p className="text-sm staff-ink-warning">
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
      header: 'Thao tác',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (c) => (
        <span className="staff-row-actions">
          <Button
            variant="link"
            size="sm"
            className="staff-row-action"
            aria-label={`Sửa mặt hàng ${c.name}`}
            onClick={() => openEdit(c)}
          >
            Sửa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="staff-row-action text-destructive"
            aria-label={`Xoá mặt hàng ${c.name}`}
            onClick={() => setConfirmId(c._id)}
          >
            Xoá
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="staff-inventory">
      <PageHeader
        as="h1"
        title="Trang phục & phụ kiện"
        description="Quản lý mặt hàng, giá thuê/ngày và tồn theo tình trạng. Tồn tốt chưa trừ các phần giữ theo ngày."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm mặt hàng
          </Button>
        }
      />

      {loadError && (
        <div role="alert" className="rounded-lg border bg-card p-4 mb-4">
          <p>Không tải được danh sách mặt hàng.</p>
          <Button className="mt-3" variant="outline" onClick={load}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="min-w-0">
        <DataTable<CostumeResponse>
          aria-label="Kho trang phục và phụ kiện"
          className="staff-inventory-table"
          loading={loading}
          data={costumes}
          keyExtractor={(c) => c._id}
          emptyTitle="Chưa có mặt hàng nào"
          columns={columns}
          dense
          textSize="sm"
        />
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSubmitError('');
        }}
        title={editing ? 'Sửa trang phục / phụ kiện' : 'Thêm trang phục / phụ kiện'}
        description="Thông tin mặt hàng, giá thuê và tồn kho. Số lượng giữ theo kỳ được kiểm tra khi phân bổ."
        size="lg"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-busy={isSubmitting}
          className="staff-form space-y-4"
        >
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
              label="Giá thuê kỳ cũ (đồng)"
              htmlFor="rentalPrice"
              hint="Giữ giá kỳ cũ cho dữ liệu cũ; không dùng làm giá/ngày."
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
            <FormField
              label="Giá thuê/ngày (đồng)"
              htmlFor="rentalDailyPrice"
              hint="Áp dụng cho đơn mới. Để trống nếu studio cần báo giá theo ngày."
              error={errors.rentalDailyPrice?.message}
            >
              <Input
                id="rentalDailyPrice"
                type="number"
                min="1"
                step="1"
                disabled={!isRentalEnabled}
                {...register('rentalDailyPrice', {
                  setValueAs: (value) => (value === '' || value === null ? null : Number(value)),
                  validate: (value) =>
                    !isRentalEnabled ||
                    value === null ||
                    (Number.isSafeInteger(value) && value > 0) ||
                    'Nhập giá/ngày là số nguyên dương hoặc để trống.',
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
          <div className="staff-modal-footer flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setModalOpen(false)}
            >
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" className="min-h-11" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu…' : 'Lưu'}
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

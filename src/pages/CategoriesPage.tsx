import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { categoryService } from '../services/categoryService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCategories } from '../store/slices/categoriesSlice';
import type { Category } from '../types';
import {
  Button,
  ConfirmDialog,
  Badge,
  DataTable,
  type Column,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

const CategoriesPage = () => {
  const dispatch = useAppDispatch();
  const { list: categories, loading, error } = useAppSelector((s) => s.categories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
  } = useForm<Partial<Category>>();

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    reset({ type: 'income' });
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    reset(c);
    setModalOpen(true);
  };

  const onSubmit = async (data: Partial<Category>) => {
    try {
      if (editing) {
        await categoryService.update(editing._id, data);
        toast.success('Cập nhật danh mục thành công!');
      } else {
        await categoryService.create(data);
        toast.success('Thêm danh mục thành công!');
      }
      setModalOpen(false);
      dispatch(fetchCategories());
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await categoryService.remove(confirmId);
      toast.success('Đã xoá danh mục.');
      dispatch(fetchCategories());
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Tên danh mục',
      render: (c) => <span className="font-medium">{c.name}</span>,
    },
    {
      key: 'type',
      header: 'Loại',
      render: (c) => (
        <Badge variant={c.type === 'income' ? 'success' : 'destructive'}>
          {c.type === 'income' ? 'Khoản thu' : 'Khoản chi'}
        </Badge>
      ),
    },
    {
      key: 'default',
      header: 'Thiết lập',
      render: (c) => (c.isDefault ? <Badge variant="secondary">Mặc định</Badge> : 'Tùy chỉnh'),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (c) => (
        <div className="staff-row-actions">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="staff-icon-action text-primary"
            aria-label={'Sửa danh mục ' + c.name}
            onClick={() => openEdit(c)}
            title="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!c.isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="staff-icon-action text-destructive"
              aria-label={'Xoá danh mục ' + c.name}
              onClick={() => setConfirmId(c._id)}
              title="Xoá"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        as="h1"
        title="Danh mục thu / chi"
        description="Quản lý các danh mục khoản thu và khoản chi."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm danh mục
          </Button>
        }
      />

      {error && (
        <div role="alert" className="rounded-lg border bg-card p-4 mb-4">
          <p>Không tải được danh mục.</p>
          <Button className="mt-3" variant="outline" onClick={() => dispatch(fetchCategories())}>
            Thử lại
          </Button>
        </div>
      )}

      <DataTable
        aria-label="Danh mục thu chi"
        data={categories}
        columns={columns}
        loading={loading}
        keyExtractor={(c) => c._id}
        emptyTitle="Chưa có danh mục"
        pagination
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}
        description="Phân loại khoản thu và khoản chi."
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting} className="space-y-4">
          <FormField
            label="Tên danh mục"
            required
            htmlFor="name"
            error={errors.name ? 'Vui lòng nhập tên danh mục.' : undefined}
          >
            <Input id="name" {...register('name', { required: true })} />
          </FormField>
          <FormField
            label="Loại"
            required
            htmlFor="category-type"
            error={errors.type ? 'Vui lòng chọn loại.' : undefined}
          >
            <Controller
              name="type"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="category-type"
                    aria-required="true"
                    aria-invalid={errors.type ? true : undefined}
                  >
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
        message="Bạn có chắc muốn xoá danh mục này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default CategoriesPage;

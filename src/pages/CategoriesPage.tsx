import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { ArrowDown, ArrowUp, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { categoryService } from '../services/categoryService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCategories } from '../store/slices/categoriesSlice';
import type { Category } from '../types';
import {
  Button,
  ConfirmDialog,
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
import { cn } from '@/lib/utils';

const CategoriesPage = () => {
  const dispatch = useAppDispatch();
  const { list: categories, error } = useAppSelector((s) => s.categories);
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

  const income = categories.filter((c) => c.type === 'income');
  const expense = categories.filter((c) => c.type === 'expense');

  const groups = [
    {
      key: 'income',
      label: 'Khoản thu',
      list: income,
      icon: <ArrowDown className="h-4 w-4" />,
      classes: {
        bg: 'staff-status--success',
        text: '',
        ring: '',
        dot: 'bg-current staff-ink-success',
      },
    },
    {
      key: 'expense',
      label: 'Khoản chi',
      list: expense,
      icon: <ArrowUp className="h-4 w-4" />,
      classes: {
        bg: 'staff-status--danger',
        text: '',
        ring: '',
        dot: 'bg-current staff-ink-danger',
      },
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

      <div className="grid md:grid-cols-2 gap-6">
        {groups.map(({ key, label, list, icon, classes }) => (
          <div key={key} className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1',
                    classes.bg,
                    classes.text,
                    classes.ring,
                  )}
                >
                  {icon}
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{label}</h2>
                  <p className="text-xs text-muted-foreground">{list.length} danh mục</p>
                </div>
              </div>
            </div>

            <ul className="divide-y">
              {list.map((c) => (
                <li
                  key={c._id}
                  className="group flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0', classes.dot)} />
                    <span className="text-sm font-medium break-words">{c.name}</span>
                    {c.isDefault && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <div className="staff-row-actions shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="staff-icon-action text-primary"
                      aria-label={`Sửa danh mục ${c.name}`}
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
                        aria-label={`Xoá danh mục ${c.name}`}
                        onClick={() => setConfirmId(c._id)}
                        title="Xoá"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
              {list.length === 0 && (
                <li className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-muted-foreground">
                  <FolderOpen className="h-6 w-6 opacity-60" />
                  <span className="text-sm">Chưa có danh mục</span>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

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

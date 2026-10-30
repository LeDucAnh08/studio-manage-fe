import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { costumeTypeService } from '../services/costumeTypeService';
import type { CostumeType } from '../types';
import {
  Button,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  Modal,
  PageHeader,
  Textarea,
} from '@/components/ui';
import type { Column } from '@/components/ui';

interface CostumeTypeFormValues {
  name: string;
  description?: string;
}

const CostumeTypesPage = () => {
  const [types, setTypes] = useState<CostumeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CostumeType | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<CostumeTypeFormValues>();

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await costumeTypeService.getAll();
      setTypes(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (t: CostumeType) => {
    setEditing(t);
    reset({ name: t.name, description: t.description ?? '' });
    setModalOpen(true);
  };

  const onSubmit = async (data: CostumeTypeFormValues) => {
    try {
      if (editing) {
        await costumeTypeService.update(editing._id, data);
        toast.success('Cập nhật loại trang phục thành công!');
      } else {
        await costumeTypeService.create(data);
        toast.success('Thêm loại trang phục thành công!');
      }
      setModalOpen(false);
      await load();
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await costumeTypeService.remove(confirmId);
      toast.success('Đã xoá loại trang phục.');
      await load();
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const columns: Column<CostumeType>[] = [
    {
      key: 'name',
      header: 'Tên loại',
      render: (t) => <span className="font-medium">{t.name}</span>,
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (t) => <span className="text-muted-foreground">{t.description ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (t) => (
        <span className="staff-row-actions">
          <Button
            variant="link"
            size="sm"
            className="staff-row-action"
            aria-label={`Sửa loại ${t.name}`}
            onClick={() => openEdit(t)}
          >
            Sửa
          </Button>
          <Button
            variant="link"
            size="sm"
            className="staff-row-action text-destructive"
            aria-label={`Xoá loại ${t.name}`}
            onClick={() => setConfirmId(t._id)}
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
        as="h1"
        title="Loại trang phục"
        description="Phân loại trang phục theo nhóm và kiểu dáng."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm loại
          </Button>
        }
      />

      {loadError && (
        <div role="alert" className="rounded-lg border bg-card p-4 mb-4">
          <p>Không tải được loại trang phục.</p>
          <Button className="mt-3" variant="outline" onClick={load}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="hidden md:block">
        <DataTable<CostumeType>
          aria-label="Loại trang phục"
          loading={loading}
          data={types}
          keyExtractor={(t) => t._id}
          emptyTitle="Chưa có loại trang phục nào"
          columns={columns}
          onRowClick={openEdit}
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
            Đang tải…
          </div>
        ) : types.length === 0 ? (
          <div className="rounded-xl border bg-card py-10 text-center text-muted-foreground">
            Chưa có loại trang phục nào
          </div>
        ) : (
          types.map((t) => (
            <div key={t._id} className="rounded-xl border bg-card p-4">
              <div className="font-semibold">{t.name}</div>
              {t.description && (
                <p className="text-sm text-muted-foreground italic mt-1">{t.description}</p>
              )}
              <div className="flex justify-end gap-3 mt-3 pt-3 border-t">
                <Button
                  variant="link"
                  size="sm"
                  className="staff-row-action"
                  aria-label={`Sửa loại ${t.name}`}
                  onClick={() => openEdit(t)}
                >
                  Sửa
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="staff-row-action text-destructive"
                  aria-label={`Xoá loại ${t.name}`}
                  onClick={() => setConfirmId(t._id)}
                >
                  Xoá
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá loại trang phục này?"
        onConfirm={doDelete}
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa loại trang phục' : 'Thêm loại trang phục'}
        description="Loại dùng để liên kết trang phục với gói chụp."
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting} className="space-y-4">
          <FormField
            label="Tên loại"
            required
            htmlFor="name"
            error={errors.name ? 'Vui lòng nhập tên loại.' : undefined}
          >
            <Input
              id="name"
              placeholder="VD: Cử nhân, Trang phục truyền thống..."
              {...register('name', { required: true })}
            />
          </FormField>
          <FormField label="Mô tả" htmlFor="description">
            <Textarea
              id="description"
              rows={2}
              placeholder="Mô tả thêm về loại trang phục..."
              {...register('description')}
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
    </div>
  );
};

export default CostumeTypesPage;

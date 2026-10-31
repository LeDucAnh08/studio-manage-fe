import { useEffect, useState } from 'react';
import { CalendarRange, Pencil, Plus, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { seasonService } from '../services/seasonService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSeasons } from '../store/slices/seasonsSlice';
import type { Season } from '../types';
import {
  Button,
  ConfirmDialog,
  DataTable,
  DatePicker,
  FormField,
  Input,
  Modal,
  PageHeader,
  TableSkeleton,
} from '@/components/ui';
import type { Column } from '@/components/ui';

interface SeasonFormValues {
  name: string;
  startDate: string;
  endDate: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const toInputDate = (iso: string) => iso.slice(0, 10);

const SeasonPage = () => {
  const dispatch = useAppDispatch();
  const { list: seasons, loading } = useAppSelector((s) => s.seasons);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
  } = useForm<SeasonFormValues>();

  useEffect(() => {
    dispatch(fetchSeasons());
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', startDate: '', endDate: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Season) => {
    setEditing(s);
    reset({
      name: s.name,
      startDate: toInputDate(s.startDate),
      endDate: toInputDate(s.endDate),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: SeasonFormValues) => {
    try {
      if (editing) {
        await seasonService.update(editing._id, data);
        toast.success('Cập nhật mùa chụp thành công!');
      } else {
        await seasonService.create(data);
        toast.success('Thêm mùa chụp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchSeasons());
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await seasonService.remove(confirmId);
      toast.success('Đã xoá mùa chụp.');
      dispatch(fetchSeasons());
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const columns: Column<Season>[] = [
    {
      key: 'name',
      header: 'Tên mùa',
      render: (s) => (
        <span className="font-medium inline-flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary shrink-0" />
          {s.name}
        </span>
      ),
    },
    {
      key: 'startDate',
      header: 'Ngày bắt đầu',
      render: (s) => <span className="text-muted-foreground">{formatDate(s.startDate)}</span>,
    },
    {
      key: 'endDate',
      header: 'Ngày kết thúc',
      render: (s) => <span className="text-muted-foreground">{formatDate(s.endDate)}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (s) => (
        <span className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => openEdit(s)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmId(s._id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="Settings"
        title="Mùa chụp"
        description="Quản lý các mùa chụp ảnh trong năm."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm mùa
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton cols={4} />
      ) : (
        <>
          <div className="min-w-0">
            <DataTable<Season>
              data={seasons}
              keyExtractor={(s) => s._id}
              emptyTitle="Chưa có mùa chụp nào"
              columns={columns}
            />
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Chỉnh sửa mùa chụp' : 'Thêm mùa chụp mới'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Tên mùa" error={errors.name?.message}>
            <Input
              placeholder="VD: Mùa hè 2025"
              {...register('name', { required: 'Vui lòng nhập tên mùa' })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Ngày bắt đầu" error={errors.startDate?.message}>
              <Controller
                name="startDate"
                control={control}
                rules={{ required: 'Vui lòng chọn ngày bắt đầu' }}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Chọn ngày bắt đầu"
                  />
                )}
              />
            </FormField>
            <FormField label="Ngày kết thúc" error={errors.endDate?.message}>
              <Controller
                name="endDate"
                control={control}
                rules={{ required: 'Vui lòng chọn ngày kết thúc' }}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Chọn ngày kết thúc"
                  />
                )}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {editing ? 'Lưu thay đổi' : 'Thêm mùa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
        title="Xoá mùa chụp?"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xoá mùa chụp này?"
        confirmLabel="Xoá"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default SeasonPage;

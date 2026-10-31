import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { userService } from '../services/userService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchUsers } from '../store/slices/usersSlice';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';
import type { User, UserRole } from '../types';
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
  PageHeader,
  Textarea,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';
import { accountRequestService, type AccountRequest } from '../services/accountRequestService';

const requestErrorText = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ??
  'Không thể xử lý yêu cầu.';

const ROLE_BADGE: Record<UserRole, string> = {
  0: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  1: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  2: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  3: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  4: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  5: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  6: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
};

interface FormValues {
  username: string;
  name?: string;
  password?: string;
  isActive: boolean;
}

const UsersPage = () => {
  const { user: me, updateUser } = useAuth();
  const dispatch = useAppDispatch();
  const { list: users } = useAppSelector((s) => s.users);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([2]);
  const [accountRequests, setAccountRequests] = useState<AccountRequest[]>([]);
  const [accountRequestError, setAccountRequestError] = useState('');
  const [reviewTarget, setReviewTarget] = useState<AccountRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  useEffect(() => {
    dispatch(fetchUsers());
    accountRequestService
      .getAll()
      .then((requests) => {
        setAccountRequests(requests);
        setAccountRequestError('');
      })
      .catch((error) => setAccountRequestError(requestErrorText(error)));
  }, [dispatch]);

  const openRequestReview = (request: AccountRequest, status: 'approved' | 'rejected') => {
    setReviewTarget(request);
    setReviewDecision(status);
    setReviewNote('');
  };

  const reviewRequest = async () => {
    if (!reviewTarget || (reviewDecision === 'rejected' && !reviewNote.trim())) return;
    setReviewBusy(true);
    try {
      await accountRequestService.review(
        reviewTarget._id,
        reviewDecision,
        reviewNote.trim(),
        reviewDecision === 'approved' ? [reviewTarget.requestedRole] : undefined,
      );
      setAccountRequests((current) =>
        current.map((item) =>
          item._id === reviewTarget._id
            ? { ...item, status: reviewDecision, reviewNote: reviewNote.trim() || undefined }
            : item,
        ),
      );
      if (reviewDecision === 'approved') dispatch(fetchUsers());
      toast.success(
        reviewDecision === 'approved'
          ? `Đã cấp tài khoản cho ${reviewTarget.username}`
          : 'Đã từ chối yêu cầu',
      );
      setReviewTarget(null);
    } catch (error) {
      toast.error(requestErrorText(error));
    } finally {
      setReviewBusy(false);
    }
  };

  const toggleRole = (role: UserRole) =>
    setSelectedRoles((current) => {
      if (role === 6) return current.includes(6) ? [] : [6];
      const internalRoles = current.filter((value) => value !== 6);
      return internalRoles.includes(role)
        ? internalRoles.filter((value) => value !== role)
        : [...internalRoles, role];
    });

  const openCreate = () => {
    setEditing(null);
    setSelectedRoles([2]);
    reset({ isActive: true });
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setSelectedRoles(u.roles ?? []);
    reset({ username: u.username, name: u.name, isActive: u.isActive });
    setModalOpen(true);
  };

  const onSubmit = async (data: FormValues) => {
    const payload = {
      ...data,
      roles: selectedRoles,
      ...(data.password ? {} : { password: undefined }),
    };
    try {
      if (editing) {
        const updated = await userService.update(editing._id, payload);
        toast.success('Cập nhật người dùng thành công!');
        if (editing._id === me?._id) {
          updateUser({
            roles: updated.roles ?? selectedRoles,
            name: updated.name ?? data.name,
            username: updated.username ?? data.username,
            isActive: updated.isActive ?? data.isActive,
          });
        }
      } else {
        await userService.create(payload);
        toast.success('Thêm người dùng thành công!');
      }
      setModalOpen(false);
      dispatch(fetchUsers());
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleDelete = (id: string) => {
    if (id === me?._id) {
      toast.error('Không thể xoá tài khoản đang đăng nhập.');
      return;
    }
    setConfirmId(id);
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await userService.remove(confirmId);
      toast.success('Đã xoá tài khoản.');
      dispatch(fetchUsers());
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const columns: Column<User>[] = [
    {
      key: 'username',
      header: 'Tên đăng nhập',
      render: (u) => (
        <span className="font-medium">
          {u.username}
          {u._id === me?._id && <span className="ml-2 text-xs text-muted-foreground">(bạn)</span>}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Họ tên',
      render: (u) => <span className="text-muted-foreground">{u.name ?? '—'}</span>,
    },
    {
      key: 'telegramId',
      header: 'Telegram ID',
      render: (u) => <span className="text-muted-foreground">{u.telegramId ?? '—'}</span>,
    },
    {
      key: 'roles',
      header: 'Role',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {(u.roles ?? []).map((r) => (
            <Badge key={r} variant="outline" className={cn('border-transparent', ROLE_BADGE[r])}>
              {ROLE_LABELS[r]}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (u) =>
        u.isActive ? (
          <Badge variant="success">Hoạt động</Badge>
        ) : (
          <Badge variant="destructive">Đã khoá</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (u) => (
        <span className="space-x-2">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-primary"
            onClick={() => openEdit(u)}
          >
            Sửa
          </Button>
          {u._id !== me?._id && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-destructive"
              onClick={() => handleDelete(u._id)}
            >
              Xoá
            </Button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="Users"
        title="Quản lý người dùng"
        description="Quản lý tài khoản và phân quyền người dùng trong hệ thống."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm người dùng
          </Button>
        }
      />

      {accountRequestError && (
        <p role="alert" className="mb-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          Không tải được yêu cầu cấp tài khoản: {accountRequestError}
        </p>
      )}

      {accountRequests.some((request) => request.status === 'pending') && (
        <div className="mb-6">
          <DataTable<AccountRequest>
            aria-label="Yêu cầu cấp tài khoản"
            title="Yêu cầu cấp tài khoản"
            data={accountRequests.filter((request) => request.status === 'pending')}
            keyExtractor={(request) => request._id}
            columns={[
              {
                key: 'name',
                header: 'Người yêu cầu',
                render: (request) => (
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-xs text-muted-foreground">{request.username}</p>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Vai trò',
                render: (request) => ROLE_LABELS[request.requestedRole],
              },
              { key: 'phone', header: 'Điện thoại', render: (request) => request.phone || '—' },
              { key: 'note', header: 'Ghi chú', render: (request) => request.note || '—' },
              {
                key: 'actions',
                header: 'Thao tác',
                align: 'right',
                render: (request) => (
                  <div className="staff-row-actions">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRequestReview(request, 'rejected')}
                    >
                      Từ chối
                    </Button>
                    <Button size="sm" onClick={() => openRequestReview(request, 'approved')}>
                      Cấp tài khoản
                    </Button>
                  </div>
                ),
              },
            ]}
            pagination
          />
        </div>
      )}

      <div className="min-w-0">
        <DataTable<User> data={users} keyExtractor={(u) => u._id} columns={columns} />
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa người dùng' : 'Thêm người dùng'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FormField label="Tên đăng nhập" required htmlFor="username">
            <Input id="username" autoComplete="off" {...register('username', { required: true })} />
          </FormField>
          <FormField label="Họ tên" htmlFor="name">
            <Input id="name" {...register('name')} />
          </FormField>
          <FormField
            label={editing ? 'Mật khẩu mới (để trống = không đổi)' : 'Mật khẩu'}
            required={!editing}
            htmlFor="password"
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password', { required: !editing })}
            />
          </FormField>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="rounded-lg border p-2 space-y-1">
              {(Object.entries(ROLE_LABELS) as [string, string][]).map(([val, label]) => {
                const r = Number(val) as UserRole;
                return (
                  <label
                    key={r}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted px-1 py-1 rounded"
                  >
                    <Checkbox
                      checked={selectedRoles.includes(r)}
                      onCheckedChange={() => toggleRole(r)}
                    />
                    <Badge variant="outline" className={cn('border-transparent', ROLE_BADGE[r])}>
                      {label}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              {...register('isActive')}
              type="checkbox"
              id="isActive"
              className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
            />
            <Label htmlFor="isActive">Đang hoạt động</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={isSubmitting || selectedRoles.length === 0}
            >
              Lưu
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!reviewTarget}
        onOpenChange={(open) => !open && !reviewBusy && setReviewTarget(null)}
        title={reviewDecision === 'approved' ? 'Cấp tài khoản' : 'Từ chối yêu cầu'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {reviewTarget?.name} ({reviewTarget?.username}) ·{' '}
            {reviewTarget ? ROLE_LABELS[reviewTarget.requestedRole] : ''}
          </p>
          <FormField
            label={
              reviewDecision === 'approved' ? 'Ghi chú nội bộ (không bắt buộc)' : 'Lý do từ chối'
            }
            required={reviewDecision === 'rejected'}
          >
            <Textarea
              maxLength={1000}
              rows={4}
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={reviewBusy} onClick={() => setReviewTarget(null)}>
              Huỷ
            </Button>
            <Button
              variant={reviewDecision === 'approved' ? 'gradient' : 'destructive'}
              disabled={reviewBusy || (reviewDecision === 'rejected' && !reviewNote.trim())}
              onClick={() => void reviewRequest()}
            >
              {reviewBusy
                ? 'Đang xử lý…'
                : reviewDecision === 'approved'
                  ? 'Xác nhận cấp tài khoản'
                  : 'Xác nhận từ chối'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá tài khoản này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default UsersPage;

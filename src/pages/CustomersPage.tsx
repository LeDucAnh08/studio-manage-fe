import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { customerService } from '../services/customerService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCustomers } from '../store/slices/customersSlice';
import type { Customer } from '../types';
import {
  Button,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  TableSkeleton,
  Textarea,
} from '@/components/ui';
import type { Column } from '@/components/ui';

type FormValues = Omit<Customer, '_id' | 'createdAt'>;
const classDescription = (customer: Customer) =>
  [customer.className, customer.school].filter(Boolean).join(', ');

const CustomersPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: customers, total, loading, error } = useAppSelector((s) => s.customers);
  const [params, setParams] = useSearchParams();
  const appliedSearch = params.get('search') || '';
  const [search, setSearch] = useState(appliedSearch);
  useEffect(() => setSearch(appliedSearch), [appliedSearch]);
  const requestedPage = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedSize = Number(params.get('limit') || 20);
  const pageSize = [10, 20, 50, 100].includes(requestedSize) ? requestedSize : 20;
  const updateParam = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  const setPage = (value: number) => updateParam('page', String(value));
  const setAppliedSearch = (value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set('search', value);
      else next.delete('search');
      next.delete('page');
      return next;
    });
  const detailState = {
    classListReturnTo: '/customers' + (params.size ? '?' + params.toString() : ''),
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();

  const buildParams = useCallback(
    (s: string, p: number, l: number): Record<string, string | number> => {
      const params: Record<string, string | number> = { page: p, limit: l };
      if (s) params.search = s;
      return params;
    },
    [],
  );

  useEffect(() => {
    dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
  }, [dispatch, appliedSearch, page, pageSize, buildParams]);

  const openCreate = () => {
    setEditing(null);
    reset({
      className: '',
      school: '',
      contactName: '',
      contactPhone: '',
      contactAddress: '',
      total: 0,
      totalMale: 0,
      totalFemale: 0,
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    reset(c);
    setModalOpen(true);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      if (editing) {
        await customerService.update(editing._id, data);
        toast.success('Cập nhật lớp thành công!');
      } else {
        await customerService.create(data);
        toast.success('Thêm lớp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await customerService.remove(confirmId);
      toast.success('Đã xoá lớp.');
      dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const runSearch = () => {
    setAppliedSearch(search);
  };

  const pagination = {
    page,
    pageSize,
    total,
    onPageChange: setPage,
    onPageSizeChange: (size: number) => {
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('limit', String(size));
        next.delete('page');
        return next;
      });
    },
  };

  return (
    <div className="staff-customers">
      <PageHeader
        as="h1"
        title="Danh sách lớp học"
        description="Chọn lớp để xem thông tin học sinh đã điền khi đặt dịch vụ kỉ yếu."
        action={<Button onClick={openCreate}>+ Thêm lớp</Button>}
      />

      <div className="staff-toolbar mb-4">
        <SearchInput
          aria-label="Tìm kiếm lớp hoặc trường"
          placeholder="Tìm kiếm lớp, trường…"
          value={search}
          onChange={setSearch}
          onSearch={runSearch}
          onClear={() => {
            setSearch('');
            setAppliedSearch('');
          }}
        />
      </div>

      {loading ? (
        <div role="status" aria-label="Đang tải danh sách lớp">
          <TableSkeleton cols={6} />
        </div>
      ) : error ? (
        <div className="rounded-lg border bg-card p-6" role="alert">
          <p className="font-medium">Không tải được danh sách lớp.</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)))}
          >
            Thử lại
          </Button>
        </div>
      ) : (
        <>
          <div className="min-w-0">
            <DataTable<Customer>
              data={customers}
              aria-label="Danh sách lớp học"
              className="staff-customers-table"
              keyExtractor={(c) => c._id}
              emptyTitle={appliedSearch ? 'Không tìm thấy lớp' : 'Chưa có dữ liệu'}
              emptyDescription={appliedSearch ? 'Thử từ khóa khác hoặc xóa tìm kiếm.' : undefined}
              onRowClick={(c) => navigate(`/customers/${c._id}`, { state: detailState })}
              pagination={{
                serverSide: true,
                ...pagination,
              }}
              columns={[
                {
                  key: 'className',
                  header: 'Tên lớp',
                  render: (c) => (
                    <Link
                      to={`/customers/${c._id}`}
                      state={detailState}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.className}
                    </Link>
                  ),
                },
                {
                  key: 'school',
                  header: 'Trường',
                  render: (c) => <span>{c.school}</span>,
                },
                {
                  key: 'contactName',
                  header: 'Liên hệ',
                  render: (c) => <span>{c.contactName}</span>,
                },
                {
                  key: 'contactPhone',
                  header: 'SĐT',
                  className: 'whitespace-nowrap',
                  render: (c) => <span>{c.contactPhone}</span>,
                },
                {
                  key: 'contactAddress',
                  header: 'Địa chỉ',
                  render: (c) => <span>{c.contactAddress}</span>,
                },
                {
                  key: 'total',
                  header: 'Sĩ số',
                  align: 'right',
                  render: (c) => <span>{c.total}</span>,
                },
                {
                  key: 'gender',
                  header: 'Nam / Nữ',
                  align: 'right',
                  render: (c) => (
                    <span>
                      {c.totalMale ?? 0} / {c.totalFemale ?? 0}
                    </span>
                  ),
                },
                {
                  key: 'notes',
                  header: 'Ghi chú',
                  render: (c) => (
                    <span className="block text-muted-foreground">{c.notes || '-'}</span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Thao tác',
                  align: 'right',
                  className: 'whitespace-nowrap',
                  render: (c) => (
                    <span className="staff-row-actions">
                      <Link
                        to={`/customers/${c._id}`}
                        state={detailState}
                        className="staff-row-action font-medium text-primary hover:underline"
                        aria-label={`Chi tiết lớp ${classDescription(c)}`}
                      >
                        Chi tiết
                      </Link>
                      <Button
                        variant="link"
                        size="sm"
                        className="staff-row-action"
                        aria-label={`Sửa lớp ${classDescription(c)}`}
                        onClick={() => openEdit(c)}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="staff-row-action text-destructive"
                        aria-label={`Xoá lớp ${classDescription(c)}`}
                        onClick={() => setConfirmId(c._id)}
                      >
                        Xoá
                      </Button>
                    </span>
                  ),
                } satisfies Column<Customer>,
              ]}
            />
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá lớp này?"
        onConfirm={doDelete}
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa lớp' : 'Thêm lớp mới'}
        description="Nhập thông tin lớp và người liên hệ. Các trường có dấu * là bắt buộc."
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          aria-busy={isSubmitting}
          className="staff-customer-form space-y-4"
        >
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <FormField
              label="Tên lớp"
              required
              htmlFor="className"
              error={errors.className?.message}
              className="col-span-2"
            >
              <Input
                id="className"
                {...register('className', { required: 'Vui lòng nhập tên lớp' })}
              />
            </FormField>
            <FormField
              label="Trường"
              required
              htmlFor="school"
              error={errors.school?.message}
              className="col-span-2 sm:col-span-4"
            >
              <Input id="school" {...register('school', { required: 'Vui lòng nhập trường' })} />
            </FormField>
            <FormField
              label="Sĩ số"
              required
              htmlFor="total"
              error={errors.total?.message}
              className="col-span-2"
            >
              <Input
                id="total"
                type="number"
                {...register('total', { valueAsNumber: true, required: 'Vui lòng nhập sĩ số' })}
              />
            </FormField>
            <FormField
              label="Số nam"
              required
              htmlFor="totalMale"
              error={errors.totalMale?.message}
              className="sm:col-span-2"
            >
              <Input
                id="totalMale"
                type="number"
                min={0}
                {...register('totalMale', {
                  valueAsNumber: true,
                  required: 'Vui lòng nhập số nam',
                })}
              />
            </FormField>
            <FormField
              label="Số nữ"
              required
              htmlFor="totalFemale"
              error={errors.totalFemale?.message}
              className="sm:col-span-2"
            >
              <Input
                id="totalFemale"
                type="number"
                min={0}
                {...register('totalFemale', {
                  valueAsNumber: true,
                  required: 'Vui lòng nhập số nữ',
                })}
              />
            </FormField>
            <FormField
              label="Người liên hệ"
              required
              htmlFor="contactName"
              error={errors.contactName?.message}
              className="col-span-2 sm:col-span-3"
            >
              <Input
                id="contactName"
                {...register('contactName', { required: 'Vui lòng nhập người liên hệ' })}
              />
            </FormField>
            <FormField
              label="Số điện thoại (người liên hệ)"
              required
              htmlFor="contactPhone"
              error={errors.contactPhone?.message}
              className="col-span-2 sm:col-span-3"
            >
              <Input
                id="contactPhone"
                {...register('contactPhone', {
                  required: 'Vui lòng nhập số điện thoại',
                  pattern: {
                    value: /^[0-9+\-\s()]{8,}$/,
                    message: 'Số điện thoại không hợp lệ',
                  },
                })}
              />
            </FormField>
            <FormField
              label="Địa chỉ (người liên hệ)"
              required
              htmlFor="contactAddress"
              error={errors.contactAddress?.message}
              className="col-span-2 sm:col-span-6"
            >
              <Input
                id="contactAddress"
                {...register('contactAddress', { required: 'Vui lòng nhập địa chỉ' })}
              />
            </FormField>
            <FormField label="Ghi chú" htmlFor="notes" className="col-span-2 sm:col-span-6">
              <Textarea id="notes" rows={2} {...register('notes')} />
            </FormField>
          </div>
          <div className="staff-modal-footer flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomersPage;

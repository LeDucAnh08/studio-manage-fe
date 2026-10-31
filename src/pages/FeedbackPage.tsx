import { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { feedbackService } from '../services/feedbackService';
import type { Customer, FeedbackResponse } from '../types';
import { formatDateTime } from '../utils/format';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  type Column,
  Modal,
  PageHeader,
  RatingBlock,
} from '@/components/ui';

type FilterValue = 'all' | 'unread' | 'read';

const LIMIT = 20;

const getClassLabel = (customer: Customer | null): string | null => {
  if (!customer) return null;
  return customer.school ? `${customer.className} — ${customer.school}` : customer.className;
};

const buildPublicLink = () => `${window.location.origin}/feedback`;

const FeedbackPage = () => {
  const [list, setList] = useState<FeedbackResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalRead, setTotalRead] = useState(0);
  const [totalUnread, setTotalUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selected, setSelected] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (filter === 'unread') params.isRead = 'false';
      else if (filter === 'read') params.isRead = 'true';
      const res = await feedbackService.getAll(params);
      setList(res.data);
      setTotal(res.total);
      setTotalRead(res.totalRead);
      setTotalUnread(res.totalUnread);
    } catch {
      setError('Không thể tải phản hồi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const toggleRead = async (fb: FeedbackResponse) => {
    try {
      const updated = await feedbackService.markRead(fb._id, !fb.isRead);
      setList((prev) => prev.map((f) => (f._id === fb._id ? { ...f, isRead: updated.isRead } : f)));
      setTotalUnread((n) => n + (updated.isRead ? -1 : 1));
      setTotalRead((n) => n + (updated.isRead ? 1 : -1));
    } catch {
      toast.error('Cập nhật thất bại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await feedbackService.remove(confirmId);
      toast.success('Đã xoá phản hồi.');
      setConfirmId(null);
      load();
    } catch {
      toast.error('Xoá thất bại.');
      setConfirmId(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildPublicLink());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Không thể sao chép.');
    }
  };

  const filteredTotal = filter === 'unread' ? totalUnread : filter === 'read' ? totalRead : total;
  const columns: Column<FeedbackResponse>[] = [
    {
      key: 'customer',
      header: 'Khách hàng',
      className: 'min-w-[180px]',
      render: (fb) => (
        <div>
          <p className="font-medium">{getClassLabel(fb.customer) ?? 'Khách hàng ẩn danh'}</p>
          {fb.phone && <p className="mt-1 text-xs text-muted-foreground">{fb.phone}</p>}
        </div>
      ),
    },
    {
      key: 'crew',
      header: 'Ekip',
      align: 'center',
      render: (fb) => (fb.crewFeedback?.rating ? fb.crewFeedback.rating + '/5' : 'Chưa đánh giá'),
    },
    {
      key: 'album',
      header: 'Album',
      align: 'center',
      render: (fb) => (fb.albumFeedback?.rating ? fb.albumFeedback.rating + '/5' : 'Chưa đánh giá'),
    },
    {
      key: 'content',
      header: 'Nội dung',
      className: 'min-w-[220px] max-w-sm',
      render: (fb) => (
        <p className="line-clamp-2 whitespace-pre-wrap">
          {fb.content || fb.suggestion || 'Xem chi tiết đánh giá'}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'whitespace-nowrap',
      render: (fb) => (
        <Badge variant={fb.isRead ? 'secondary' : 'warning'}>
          {fb.isRead ? 'Đã đọc' : 'Chưa đọc'}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Ngày gửi',
      className: 'whitespace-nowrap',
      render: (fb) => formatDateTime(fb.createdAt),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      className: 'min-w-[180px]',
      render: (fb) => (
        <div className="staff-row-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(fb)}
            aria-label={'Xem phản hồi ' + (getClassLabel(fb.customer) ?? fb.phone ?? 'ẩn danh')}
          >
            Xem
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={fb.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
            title={fb.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
            onClick={() => void toggleRead(fb)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            aria-label="Xoá phản hồi"
            onClick={() => setConfirmId(fb._id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
  return (
    <section className="min-w-0">
      <PageHeader
        as="h1"
        title="Phản hồi khách hàng"
        description="Xem và quản lý các đánh giá từ khách hàng."
        action={
          <Button variant="outline" onClick={copyLink}>
            <Copy />
            {linkCopied ? 'Đã sao chép' : 'Sao chép link gửi phản hồi'}
          </Button>
        }
      />
      <div className="staff-toolbar mb-4 flex flex-wrap gap-2 rounded-lg border bg-card p-4">
        {(
          [
            { value: 'all', label: 'Tất cả', count: total },
            { value: 'unread', label: 'Chưa đọc', count: totalUnread },
            { value: 'read', label: 'Đã đọc', count: totalRead },
          ] as const
        ).map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? 'default' : 'outline'}
            aria-pressed={filter === option.value}
            onClick={() => {
              setPage(1);
              setFilter(option.value);
            }}
          >
            {option.label} ({option.count})
          </Button>
        ))}
      </div>
      {error ? (
        <div role="alert" className="mb-4 rounded-lg border border-destructive/30 p-4">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-3" onClick={() => void load()}>
            Thử lại
          </Button>
        </div>
      ) : (
        <DataTable
          aria-label="Phản hồi khách hàng"
          data={list}
          columns={columns}
          loading={loading}
          keyExtractor={(fb) => fb._id}
          emptyTitle="Chưa có phản hồi nào"
          emptyDescription="Phản hồi sẽ hiển thị ở đây."
          pagination={{
            serverSide: true,
            page,
            pageSize: LIMIT,
            total: filteredTotal,
            onPageChange: setPage,
            hidePageSize: true,
          }}
        />
      )}
      <Modal
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Chi tiết phản hồi"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <p className="font-medium">
              {getClassLabel(selected.customer) ?? 'Khách hàng ẩn danh'}
            </p>
            <p className="text-sm text-muted-foreground">
              {selected.phone} · {formatDateTime(selected.createdAt)}
            </p>
            <RatingBlock label="Ekip chụp ảnh" item={selected.crewFeedback} />
            <RatingBlock label="Album" item={selected.albumFeedback} />
            {selected.content && (
              <div>
                <h3 className="font-medium">Cảm nhận chung</h3>
                <p className="mt-1 whitespace-pre-wrap">{selected.content}</p>
              </div>
            )}
            {selected.suggestion && (
              <div>
                <h3 className="font-medium">Đề xuất cải thiện</h3>
                <p className="mt-1 whitespace-pre-wrap">{selected.suggestion}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(open) => !open && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá phản hồi này?"
        onConfirm={doDelete}
      />
    </section>
  );
};
export default FeedbackPage;

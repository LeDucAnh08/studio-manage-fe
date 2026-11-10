import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, DataTable, PageHeader, type Column } from '@/components/ui';
import { paymentService, type SePayReceipt } from '../services/paymentService';
import { rentalError } from '../services/rentalService';

function ResolveRental({ receipt }: { receipt: SePayReceipt }) {
  const [rentalId, setRentalId] = useState(receipt.rentalOrder || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (receipt.booking || receipt.hasConflict) return null;
  return (
    <details className="mt-2">
      <summary>Đối soát vào đơn thuê</summary>
      <form
        className="mt-2 space-y-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage('');
          try {
            await paymentService.resolveRental(receipt._id, rentalId.trim(), note.trim());
            setMessage('Đã ghi nhận vào đơn thuê. Tải lại danh sách để cập nhật.');
          } catch (error) {
            setMessage(rentalError(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          Mã hồ sơ đơn thuê
          <input
            className="block w-full rounded border p-2"
            required
            value={rentalId}
            onChange={(event) => setRentalId(event.target.value)}
          />
        </label>
        <label className="block">
          Căn cứ đối soát
          <input
            className="block w-full rounded border p-2"
            required
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <p className="text-xs">
          Chỉ xác nhận sau khi kiểm tra tiền thực về và đúng khách/đơn. Giao dịch chỉ được ghi nhận
          một lần.
        </p>
        <Button type="submit" disabled={busy}>
          {busy ? 'Đang xử lý…' : 'Xác nhận đối soát tiền thuê'}
        </Button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}

const columns: Column<SePayReceipt>[] = [
  {
    key: 'date',
    header: 'Thời điểm ngân hàng',
    render: (row) =>
      new Date(row.transactionDate).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  },
  {
    key: 'amount',
    header: 'Số tiền',
    render: (row) => `${row.amount.toLocaleString('vi-VN')} đ`,
    align: 'right',
  },
  {
    key: 'content',
    header: 'Giao dịch',
    render: (row) => (
      <>
        <p className="break-words">{row.content}</p>
        <p className="text-xs text-muted-foreground">
          {row.gateway} · {row.accountNumber} · {row.mode === 'sandbox' ? 'Thử nghiệm' : 'Thực tế'}{' '}
          · {row.bankReference || row.providerTransactionId}
        </p>
      </>
    ),
  },
  {
    key: 'reason',
    header: 'Cần đối soát',
    render: (row) => (
      <>
        <p>{row.reason || 'Đã tiếp nhận, đang chờ xử lý lại'}</p>
        {row.status === 'review' && <ResolveRental receipt={row} />}
        {!!row.conflicts?.length && (
          <details>
            <summary>Dữ liệu giao dịch khác ({row.conflicts.length})</summary>
            <ul>
              {row.conflicts.map((conflict, index) => (
                <li key={index} className="mt-2 break-words text-xs">
                  {conflict.amount?.toLocaleString('vi-VN')} đ · {conflict.content} ·{' '}
                  {conflict.gateway} / {conflict.accountNumber} ·{' '}
                  {conflict.bankReference || conflict.providerTransactionId} ·{' '}
                  {conflict.transactionDate &&
                    new Date(conflict.transactionDate).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                </li>
              ))}
            </ul>
          </details>
        )}
      </>
    ),
  },
  {
    key: 'booking',
    header: 'Hồ sơ',
    render: (row) =>
      row.booking ? (
        <Link className="underline" to={`/workflow-bookings/${row.booking}`}>
          Mở đơn
        </Link>
      ) : row.rentalOrder ? (
        <Link className="underline" to={`/rental-orders/${row.rentalOrder}`}>
          Mở đơn thuê
        </Link>
      ) : (
        'Chưa khớp đơn'
      ),
  },
];

export default function SePayReceiptsPage() {
  const [page, setPage] = useState(1),
    [reload, setReload] = useState(0);
  const [rows, setRows] = useState<SePayReceipt[]>([]),
    [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    paymentService
      .receipts(page)
      .then((result) => {
        if (active) {
          setRows(result.data);
          setTotal(result.pagination.total);
        }
      })
      .catch(() => {
        if (active) setError('Chưa tải được các giao dịch cần đối soát. Hãy thử lại.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, reload]);
  return (
    <>
      <PageHeader
        title="Đối soát tiền cọc SePay"
        description="Các giao dịch chưa tự ghi nhận vào đơn. Kiểm tra tiền thực về ngân hàng trước khi xử lý ngoại lệ."
        action={
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => setReload((value) => value + 1)}
          >
            Tải lại
          </Button>
        }
      />
      {error && (
        <p role="alert" className="mb-4 text-destructive">
          {error}
        </p>
      )}
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        keyExtractor={(row) => row._id}
        emptyTitle="Không có giao dịch cần đối soát"
        pagination={{
          serverSide: true,
          page,
          pageSize: 20,
          total,
          onPageChange: setPage,
          hidePageSize: true,
        }}
      />
    </>
  );
}

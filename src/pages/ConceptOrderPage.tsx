import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ConceptOrder,
  Photographer,
  Slot,
  conceptError,
  conceptService,
  conceptStatus,
  money,
  vnTime,
} from '../services/conceptService';
import { paymentService } from '../services/paymentService';
import ConceptAlbumPanel from './ConceptAlbumPanel';
import '../styles/concept.css';

export default function ConceptOrderPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const [order, setOrder] = useState<ConceptOrder | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [staff, setStaff] = useState<Photographer[]>([]),
    [editor, setEditor] = useState(''),
    [refund, setRefund] = useState(''),
    [reference, setReference] = useState('');
  const [receiptId, setReceiptId] = useState(''),
    [paymentId, setPaymentId] = useState(''),
    [reconcileNote, setReconcileNote] = useState('');
  const [exceptionNote, setExceptionNote] = useState(''),
    [exceptionRefund, setExceptionRefund] = useState('');
  const [day, setDay] = useState(''),
    [slots, setSlots] = useState<Slot[]>([]),
    [newTime, setNewTime] = useState(''),
    [cancel, setCancel] = useState(false);
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const load = useCallback(async () => {
    const result = await conceptService.order(id);
    setOrder(result);
  }, [id]);
  useEffect(() => {
    let active = true;
    conceptService
      .order(id)
      .then((r) => {
        if (active) setOrder(r);
      })
      .catch((e) => {
        if (active) setError(conceptError(e));
      });
    return () => {
      active = false;
    };
  }, [id, user?._id]);
  const pending = order?.paymentRequests.some((p) => p.status === 'pending');
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !busy) load().catch(() => {});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [pending, load, busy]);
  useEffect(() => {
    if (!order?.canManage) return;
    let active = true;
    conceptService
      .staff()
      .then((r) => {
        if (active) setStaff(r);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [order?.canManage]);
  const packageId = order?.package,
    photographerId = order?.photographer;
  useEffect(() => {
    if (!day || !packageId) return;
    const abort = new AbortController();
    setNewTime('');
    conceptService
      .availability(packageId, day, abort.signal)
      .then((r) =>
        setSlots(r.slots.filter((s) => s.photographers.some((p) => p._id === photographerId))),
      )
      .catch((e) => {
        if (!abort.signal.aborted) setError(conceptError(e));
      });
    return () => abort.abort();
  }, [day, packageId, photographerId]);
  const command = async (op: string, body: Record<string, unknown> = {}) => {
    if (!order) return;
    setBusy(true);
    setError('');
    const payload = { ...body, expectedVersion: order.version };
    const signature = JSON.stringify({ op, ...payload });
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    try {
      setOrder(await conceptService.command(id, op, payload, retry.current.key));
      retry.current = null;
      setCancel(false);
    } catch (e) {
      setError(conceptError(e));
    } finally {
      setBusy(false);
    }
  };
  if (!order)
    return (
      <div className="concept-workspace">
        <p role={error ? 'alert' : 'status'}>{error || 'Đang tải hồ sơ…'}</p>
      </div>
    );
  const previewHours =
    (Math.min(Date.parse(order.startAt), Date.parse(order.originalStartAt)) - now) / 3600000;
  const retained =
    order.status === 'awaiting_deposit'
      ? 0
      : previewHours >= 48
        ? 0
        : previewHours >= 24
          ? Math.ceil(order.snapshot.deposit / 2)
          : order.snapshot.deposit;
  return (
    <div className="concept-workspace">
      <Link to={order.isOwner ? '/account/orders?tab=concepts' : '/concept-orders'}>
        ← Danh sách đơn concept
      </Link>
      <header>
        <h1>
          {order.snapshot.conceptName} · {order.snapshot.name}
        </h1>
        <p>
          {conceptStatus[order.status]} · {vnTime(order.startAt)} – {vnTime(order.endAt)}
        </p>
        <p>Mã đơn: {order._id}</p>
        <button disabled={busy} onClick={() => load().catch((e) => setError(conceptError(e)))}>
          Tải lại hồ sơ
        </button>
      </header>
      {error && (
        <p className="concept-error" role="alert">
          {error}
        </p>
      )}
      <section className="concept-card">
        <h2>Buổi chụp</h2>
        <p>
          {order.contactName} · {order.phone} · {order.people} người
        </p>
        <p>{order.brief || 'Chưa có yêu cầu riêng.'}</p>
        {order.references.map((url) => (
          <p key={url}>
            <a href={url} target="_blank" rel="noreferrer">
              Ảnh mẫu tham khảo
            </a>
          </p>
        ))}
        <ul>
          {order.costumes.map((c) => (
            <li key={`${c.costumeId}:${c.size}`}>
              {c.name} · size {c.size} × {c.quantity}
            </li>
          ))}
        </ul>
        <p>
          Trang phục:{' '}
          {
            (
              {
                pending: 'Chờ chuẩn bị',
                prepared: 'Đã chuẩn bị',
                returned: 'Đã thu hồi',
              } as Record<string, string>
            )[order.wardrobe]
          }
        </p>
      </section>
      {(order.isOwner || order.canAccount) && (
        <section>
          <h2>Thanh toán</h2>
          <p>
            Giá gói {money(order.snapshot.price)} · Đã ghi nhận {money(order.netReceived)}
            {order.refundDue > 0 ? ` · Cần hoàn ${money(order.refundDue)}` : ''}
          </p>
          <div className="concept-payments">
            {order.paymentRequests.map((p) => (
              <article className="concept-card" key={p.id}>
                <h3>
                  {
                    (
                      {
                        deposit: 'Cọc 30%',
                        balance: 'Phần còn lại',
                        extra: 'Ảnh retouch thêm',
                        revision: 'Yêu cầu chỉnh thêm',
                      } as Record<string, string>
                    )[p.kind]
                  }
                </h3>
                <p>
                  {money(p.amount)} còn thiếu ·{' '}
                  {p.status === 'paid'
                    ? 'Đã thanh toán'
                    : p.status === 'pending'
                      ? 'Chờ thanh toán'
                      : 'Không còn hiệu lực'}
                </p>
                {p.qrUrl && (
                  <>
                    <img
                      className="concept-qr"
                      src={p.qrUrl}
                      alt={`QR thanh toán ${money(p.amount)}`}
                    />
                    <p>
                      {p.bankName} · {p.accountNumber}
                      <br />
                      {p.accountName}
                    </p>
                    <p>
                      Nội dung: <strong>{p.reference}</strong>
                    </p>
                    <p>Hạn: {vnTime(p.expiresAt)}</p>
                    {p.demoSimulation && (
                      <button
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await paymentService.simulateDeposit(p.reference, `concept_${p.id}`);
                            await load();
                          } catch (e) {
                            setError(conceptError(e));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Thanh toán thử
                      </button>
                    )}
                  </>
                )}
                {p.status === 'expired' && p.kind !== 'deposit' && (
                  <button
                    disabled={busy}
                    onClick={() => void command('renew-payment', { paymentId: p.id })}
                  >
                    Tạo QR mới cho số còn thiếu
                  </button>
                )}
              </article>
            ))}
          </div>
          <details>
            <summary>Lịch sử thu/hoàn tiền</summary>
            {order.payments?.map((p, i) => (
              <p key={i}>
                {vnTime(p.at)} · {p.kind} · {money(p.amount)} · {p.reference}
              </p>
            ))}
          </details>
        </section>
      )}
      {order.canManage && ['confirmed', 'shot'].includes(order.status) && (
        <section className="concept-card">
          <h2>Điều phối</h2>
          <label>
            Hậu kỳ phụ trách
            <select value={editor} onChange={(e) => setEditor(e.target.value)}>
              <option value="">Chọn nhân sự</option>
              {staff.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name || p._id}
                  {p._id === order.editor ? ' (hiện tại)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!editor || busy}
            onClick={() => void command('assign', { editorId: editor })}
          >
            Phân công hậu kỳ
          </button>
          <div className="concept-actions">
            <button
              disabled={busy}
              onClick={() => void command('wardrobe', { status: 'prepared' })}
            >
              Đã chuẩn bị đồ
            </button>
            {order.status === 'shot' && (
              <button
                disabled={busy}
                onClick={() => void command('wardrobe', { status: 'returned' })}
              >
                Đã thu hồi đồ
              </button>
            )}
          </div>
        </section>
      )}
      {order.canEdit && order.status === 'confirmed' && (
        <section className="concept-card">
          <h2>Thực hiện buổi chụp</h2>
          <button
            disabled={busy || Date.parse(order.startAt) > now}
            onClick={() => void command('shot')}
          >
            Đánh dấu đã chụp
          </button>
        </section>
      )}
      {order.canReschedule && (
        <section className="concept-card">
          <h2>Đổi lịch miễn phí</h2>
          <p>
            Một lần, trước ít nhất 48 giờ. Giữ nguyên gói và thợ; tồn trang phục kiểm tra lại khi
            xác nhận.
          </p>
          <label>
            Ngày mới
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <label>
            Khung giờ mới
            <select value={newTime} onChange={(e) => setNewTime(e.target.value)}>
              <option value="">Chọn khung giờ</option>
              {slots.map((s) => (
                <option key={s.startAt} value={s.startAt}>
                  {vnTime(s.startAt)}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!newTime || busy}
            onClick={() => void command('reschedule', { startAt: newTime })}
          >
            Xác nhận đổi lịch
          </button>
        </section>
      )}
      {order.canCancel && (
        <section className="concept-card">
          <h2>Hủy buổi chụp</h2>
          {!cancel ? (
            <button onClick={() => setCancel(true)}>Xem khoản hoàn và hủy</button>
          ) : (
            <>
              <p>
                Studio giữ {money(Math.min(retained, order.netReceived))}; khoản dự kiến hoàn{' '}
                {money(Math.max(0, order.netReceived - retained))}. Số tiền được kiểm tra lại lúc
                xác nhận.
              </p>
              <button disabled={busy} onClick={() => void command('cancel')}>
                Xác nhận hủy buổi chụp
              </button>
              <button onClick={() => setCancel(false)}>Giữ lịch hiện tại</button>
            </>
          )}
        </section>
      )}
      {order.canAccount && order.refundDue > 0 && (
        <section className="concept-card">
          <h2>Ghi nhận hoàn tiền</h2>
          <p>Thực hiện chuyển khoản trước, sau đó nhập chứng từ hoàn.</p>
          <label>
            Số tiền đã hoàn
            <input
              type="number"
              min="1"
              max={order.refundDue}
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
            />
          </label>
          <label>
            Mã chứng từ
            <input value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
          <button
            disabled={busy || !refund || !reference}
            onClick={() => void command('refund', { amount: Number(refund), reference })}
          >
            Ghi nhận đã hoàn
          </button>
        </section>
      )}
      {['shot', 'completed'].includes(order.status) && (order.isOwner || order.canEdit) && (
        <ConceptAlbumPanel order={order} onOrderChange={() => void load()} />
      )}
      {order.canAccount && (
        <details className="concept-card">
          <summary>Đối soát chứng từ SePay</summary>
          <p>
            Chứng từ phải đang cần đối soát, đúng tài khoản nhận và chưa ghi cho đơn khác. Với cọc
            lỗi, hủy đơn trước để ghi nhận tiền cần hoàn.
          </p>
          <label>
            Mã chứng từ SePay
            <input value={receiptId} onChange={(e) => setReceiptId(e.target.value)} />
          </label>
          <label>
            Khoản thu
            <select value={paymentId} onChange={(e) => setPaymentId(e.target.value)}>
              <option value="">Khoản cần hoàn của đơn đã hủy/hết hạn</option>
              {order.paymentRequests
                .filter((p) => p.status === 'pending' && p.kind !== 'deposit')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kind} · {money(p.amount)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Căn cứ đối soát
            <textarea value={reconcileNote} onChange={(e) => setReconcileNote(e.target.value)} />
          </label>
          <button
            disabled={busy || !receiptId || !reconcileNote}
            onClick={() => void command('reconcile', { receiptId, paymentId, note: reconcileNote })}
          >
            Ghi nhận vào đơn
          </button>
        </details>
      )}
      {order.canManage && !['cancelled', 'expired'].includes(order.status) && (
        <details className="concept-card">
          <summary>Hủy ngoại lệ do Studio</summary>
          <label>
            Lý do
            <textarea value={exceptionNote} onChange={(e) => setExceptionNote(e.target.value)} />
          </label>
          <label>
            Số tiền phải hoàn
            <input
              type="number"
              min="0"
              max={order.netReceived}
              value={exceptionRefund}
              onChange={(e) => setExceptionRefund(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !exceptionNote || exceptionRefund === ''}
            onClick={() =>
              void command('exception-cancel', {
                note: exceptionNote,
                refundDue: Number(exceptionRefund),
              })
            }
          >
            Xác nhận hủy ngoại lệ và giải phóng tài nguyên
          </button>
        </details>
      )}
      <section>
        <h2>Lịch sử đơn</h2>
        <ol>
          {[...order.events].reverse().map((e, i) => (
            <li key={i}>
              {vnTime(e.at)} · {e.message}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

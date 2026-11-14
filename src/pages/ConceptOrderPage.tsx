import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DepositCheckout } from '../components/customer/DepositCheckout';
import {
  conceptBookingPath,
  conceptDraftFromOrder,
  writeConceptDraft,
  type ConceptDraft,
} from '../services/conceptDraft';
import '../styles/concept-review.css';
import { useAuth } from '../context/AuthContext';
import {
  ConceptOrder,
  Photographer,
  Slot,
  conceptError,
  conceptService,
  conceptStatus,
  conceptOrderStageLabels,
  money,
  vnTime,
} from '../services/conceptService';
import { paymentService } from '../services/paymentService';
import ConceptAlbumPanel from './ConceptAlbumPanel';
import '../styles/concept.css';
import { PaymentCountdown } from '../components/customer/PaymentCountdown';
import { usePaymentClock } from '../components/customer/usePaymentClock';
import { useCustomerAppearance } from '../components/customer/CustomerAppearance';
import { ConceptOrderProgress } from '../components/customer/ConceptOrderProgress';
import { CustomerPriceBreakdown } from '../components/customer/CustomerPriceBreakdown';
import { CustomerPrice } from '../components/customer/CustomerPrice';
import {
  OrderButton as Button,
  OrderInput as Input,
  OrderSelect as Select,
  OrderTextarea as Textarea,
} from '../components/customer/CustomerOrderControls';
import '../styles/customer-orders.css';
import '../styles/concept-order-detail.css';

export default function ConceptOrderPage() {
  const customer = useCustomerAppearance();
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const ordersReturnTo = location.state?.ordersReturnTo;
  const ordersPath =
    typeof ordersReturnTo === 'string' &&
    (ordersReturnTo === '/account/orders' || ordersReturnTo.startsWith('/account/orders?'))
      ? ordersReturnTo
      : '/account/orders?tab=concepts';
  const depositOnly = new URLSearchParams(location.search).get('payment') === 'deposit';
  const { user } = useAuth();
  const staffReturnTo = location.state?.bookingOrdersReturnTo;
  const staffOrdersPath =
    typeof staffReturnTo === 'string' &&
    (staffReturnTo === '/' ||
      staffReturnTo.startsWith('/?') ||
      staffReturnTo === '/workflow-bookings' ||
      staffReturnTo.startsWith('/workflow-bookings?'))
      ? staffReturnTo
      : '/workflow-bookings?service=concept';
  const now = usePaymentClock();
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
      <div className={customer ? 'customer-orders customer-orders--detail' : 'concept-workspace'}>
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
  const paymentCards = (
    <div className="concept-payments">
      {order.paymentRequests
        .filter(
          (p) => (!depositOnly || p.kind === 'deposit') && !(order.isOwner && p.kind === 'deposit'),
        )
        .map((p) => (
          <article
            className={
              customer && !depositOnly
                ? 'customer-order-inset concept-payment-card'
                : 'concept-card'
            }
            key={p.id}
          >
            <h3 className={customer ? 'font-semibold' : undefined}>
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
                : p.status === 'pending' && Date.parse(p.expiresAt) > now
                  ? 'Chờ thanh toán'
                  : 'Không còn hiệu lực'}
            </p>
            {p.status === 'pending' &&
              (p.kind !== 'deposit' || order.status === 'awaiting_deposit') && (
                <PaymentCountdown expiresAt={p.expiresAt} now={now} />
              )}
            {p.qrUrl &&
              p.status === 'pending' &&
              Date.parse(p.expiresAt) > now &&
              (p.kind !== 'deposit' || order.status === 'awaiting_deposit') && (
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
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        if (Date.parse(p.expiresAt) <= Date.now()) return;
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
                      Thanh toán
                    </Button>
                  )}
                </>
              )}
            {(p.status === 'expired' ||
              (p.status === 'pending' && Date.parse(p.expiresAt) <= now)) &&
              p.kind !== 'deposit' && (
                <Button
                  disabled={busy}
                  onClick={() => void command('renew-payment', { paymentId: p.id })}
                >
                  Tạo QR mới cho số còn thiếu
                </Button>
              )}
          </article>
        ))}
    </div>
  );
  if (depositOnly && order.isOwner) {
    const deposit =
      order.paymentRequests.find((p) => p.kind === 'deposit' && p.status === 'pending') ||
      order.paymentRequests.find((p) => p.kind === 'deposit');
    const paid = ['confirmed', 'shot', 'completed'].includes(order.status);
    const previousDraft = location.state?.conceptDraft as ConceptDraft | undefined;
    return (
      <DepositCheckout
        service="concept"
        orderId={order._id}
        title={order.snapshot.name}
        description={`${order.snapshot.conceptName} · ${order.people} người`}
        fields={[
          ['Thời gian chụp', vnTime(order.startAt)],
          ['Người liên hệ', order.contactName],
          ['Điện thoại', order.phone],
        ]}
        total={order.snapshot.price}
        totalLabel="Giá gói"
        deposit={order.snapshot.deposit}
        depositNote="Cọc trước 30% · Được trừ vào giá gói"
        remaining={Math.max(0, order.snapshot.price - order.snapshot.deposit)}
        remainingNote="Thanh toán theo tiến độ trong hồ sơ đơn."
        confirmation={
          paid
            ? 'Lịch chụp của bạn đã được xác nhận.'
            : 'Lịch chụp được xác nhận khi hệ thống nhận đủ cọc trong hạn.'
        }
        payment={
          deposit
            ? {
                ...deposit,
                provider: 'sepay',
                mode: deposit.demoSimulation ? 'sandbox' : 'live',
                depositRequired: order.snapshot.deposit,
                status:
                  deposit.status === 'paid'
                    ? 'paid'
                    : deposit.status === 'pending'
                      ? 'pending'
                      : deposit.status === 'expired'
                        ? 'expired'
                        : 'unavailable',
                downloadUrl: deposit.qrUrl,
              }
            : null
        }
        deadline={order.reservation?.expiresAt}
        state={
          order.status === 'payment_review'
            ? 'review'
            : ['cancelled', 'rejected'].includes(order.status)
              ? 'cancelled'
              : paid
                ? 'paid'
                : order.status === 'expired'
                  ? 'expired'
                  : undefined
        }
        backTo={
          previousDraft
            ? conceptBookingPath(order.package, 'review')
            : `/account/concept-orders/${id}`
        }
        backLabel={previousDraft ? 'Quay lại kiểm tra thông tin' : 'Quay lại thông tin đơn'}
        backState={previousDraft ? { conceptDraft: previousDraft } : { ordersReturnTo: ordersPath }}
        profileTo={`/account/concept-orders/${id}`}
        profileState={{ ordersReturnTo: ordersPath }}
        restartTo={conceptBookingPath(order.package)}
        onRestart={
          user
            ? () => {
                const conceptDraft = conceptDraftFromOrder(order, user._id);
                writeConceptDraft(conceptDraft);
                navigate(conceptBookingPath(order.package, 'review'), { state: { conceptDraft } });
              }
            : undefined
        }
        error={error}
        loading={busy}
        onReload={() => void load().catch((e) => setError(conceptError(e)))}
      />
    );
  }

  return (
    <div
      className={
        customer
          ? 'customer-orders customer-orders--detail concept-order-detail'
          : 'concept-workspace'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className={
            customer
              ? 'app-back-link customer-back-link inline-flex items-center gap-2'
              : 'app-back-link'
          }
          to={order.isOwner ? ordersPath : staffOrdersPath}
        >
          <ArrowLeft size={18} aria-hidden="true" /> Quay lại danh sách
        </Link>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => load().catch((e) => setError(conceptError(e)))}
        >
          Tải lại hồ sơ
        </Button>
      </div>
      {error && (
        <p className={customer ? 'customer-order-error' : 'concept-error'} role="alert">
          {error}
        </p>
      )}
      <header className={customer ? 'customer-order-surface' : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={customer ? 'customer-order-meta' : 'concept-eyebrow'}>
              Hồ sơ chụp concept
            </p>
            <h1 className={customer ? 'customer-page-title mt-1' : undefined}>
              {customer
                ? order.snapshot.name
                : `${order.snapshot.conceptName} · ${order.snapshot.name}`}
            </h1>
            <p className={customer ? 'customer-order-meta mt-1' : undefined}>
              {order.snapshot.conceptName} · {order.people} người
            </p>
          </div>
          <div className="space-y-1 text-right">
            <span className={customer ? 'customer-status' : undefined}>
              {order.isOwner && order.orderStage
                ? conceptOrderStageLabels[order.orderStage]
                : conceptStatus[order.status]}
            </span>
            <p className={customer ? 'customer-caption' : undefined}>
              Phiên bản hồ sơ {order.version}
            </p>
          </div>
        </div>
        <div
          className={customer ? 'customer-order-summary customer-order-summary--four' : undefined}
        >
          <p>
            <span className="text-muted-foreground">Người liên hệ: </span>
            {order.contactName}
          </p>
          <p>
            <span className="text-muted-foreground">Điện thoại: </span>
            {order.phone}
          </p>
          <p>
            <span className="text-muted-foreground">Thời gian chụp: </span>
            {vnTime(order.startAt)} – {vnTime(order.endAt)}
          </p>
          <p>
            <span className="text-muted-foreground">Thời lượng: </span>
            {order.snapshot.durationMinutes} phút
          </p>
        </div>
        <p className={customer ? 'customer-order-meta break-all' : undefined}>
          Mã đơn: {order._id}
        </p>
      </header>
      {customer && (
        <section className="customer-order-surface">
          <ConceptOrderProgress order={order} />
        </section>
      )}
      <section className={customer ? 'customer-order-surface' : 'concept-card'}>
        <h2 className={customer ? 'customer-section-title' : undefined}>Buổi chụp</h2>
        {!customer && (
          <p>
            {order.contactName} · {order.phone} · {order.people} người
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{order.brief || 'Chưa có yêu cầu riêng.'}</p>
        {order.references.map((url) => (
          <p key={url}>
            <a href={url} target="_blank" rel="noreferrer">
              Ảnh mẫu tham khảo
            </a>
          </p>
        ))}
        {!!order.wardrobeMeasurements?.length && (
          <section aria-label="Số đo chuẩn bị trang phục">
            <h3 className={customer ? 'font-semibold' : undefined}>Số đo chuẩn bị trang phục</h3>
            <ul>
              {order.wardrobeMeasurements.map((row, i) => (
                <li key={i}>
                  Người {i + 1} · Size {row.size} · {row.heightCm} cm · {row.weightKg} kg
                </li>
              ))}
            </ul>
          </section>
        )}
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
        <section className={customer ? 'customer-order-surface' : undefined}>
          <h2 className={customer ? 'customer-section-title' : undefined}>Thanh toán</h2>
          {customer ? (
            <CustomerPriceBreakdown
              items={[
                { label: 'Giá gói', value: <CustomerPrice amount={order.snapshot.price} /> },
                { label: 'Cọc 30%', value: <CustomerPrice amount={order.snapshot.deposit} /> },
                {
                  label: 'Đã thanh toán',
                  value: <CustomerPrice amount={order.netReceived} emphasis="total" />,
                },
                { label: 'Cần hoàn', value: <CustomerPrice amount={order.refundDue} /> },
              ]}
            />
          ) : (
            <p>
              Giá gói {money(order.snapshot.price)} · Đã ghi nhận {money(order.netReceived)}
              {order.refundDue > 0 ? ` · Cần hoàn ${money(order.refundDue)}` : ''}
            </p>
          )}
          {order.isOwner && order.paymentRequests.some((p) => p.kind === 'deposit') && (
            <Button asChild>
              <Link
                to={`/account/concept-orders/${id}?payment=deposit`}
                state={{ ordersReturnTo: ordersPath }}
              >
                {order.status === 'awaiting_deposit' ? 'Thanh toán tiền cọc' : 'Xem thanh toán cọc'}
              </Link>
            </Button>
          )}
          {paymentCards}
          <details>
            <summary>Lịch sử thu/hoàn tiền</summary>
            {order.payments?.map((p, i) => (
              <p key={i} className={customer ? 'customer-order-history-item mt-3' : undefined}>
                {vnTime(p.at)} ·{' '}
                {(
                  {
                    deposit: 'Tiền cọc',
                    balance: 'Phần còn lại',
                    extra: 'Ảnh retouch thêm',
                    revision: 'Chỉnh sửa thêm',
                    refund: 'Hoàn tiền',
                  } as Record<string, string>
                )[p.kind] || p.kind}{' '}
                · {money(p.amount)} · {p.reference}
              </p>
            ))}
          </details>
        </section>
      )}
      {order.canManage && ['confirmed', 'shot'].includes(order.status) && (
        <section className={customer ? 'customer-order-surface' : 'concept-card'}>
          <h2 className={customer ? 'customer-section-title' : undefined}>Điều phối</h2>
          <label>
            Hậu kỳ phụ trách
            <Select value={editor} onChange={(e) => setEditor(e.target.value)}>
              <option value="">Chọn nhân sự</option>
              {staff.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name || p._id}
                  {p._id === order.editor ? ' (hiện tại)' : ''}
                </option>
              ))}
            </Select>
          </label>
          <Button
            disabled={!editor || busy}
            onClick={() => void command('assign', { editorId: editor })}
          >
            Phân công hậu kỳ
          </Button>
          <div className="concept-actions">
            <Button
              disabled={busy}
              onClick={() => void command('wardrobe', { status: 'prepared' })}
            >
              Đã chuẩn bị đồ
            </Button>
            {order.status === 'shot' && (
              <Button
                disabled={busy}
                onClick={() => void command('wardrobe', { status: 'returned' })}
              >
                Đã thu hồi đồ
              </Button>
            )}
          </div>
        </section>
      )}
      {order.canEdit && order.status === 'confirmed' && (
        <section className={customer ? 'customer-order-surface' : 'concept-card'}>
          <h2 className={customer ? 'customer-section-title' : undefined}>Thực hiện buổi chụp</h2>
          <Button
            disabled={busy || Date.parse(order.startAt) > now}
            onClick={() => void command('shot')}
          >
            Đánh dấu đã chụp
          </Button>
        </section>
      )}
      {order.canReschedule && (
        <section className={customer ? 'customer-order-surface' : 'concept-card'}>
          <h2 className={customer ? 'customer-section-title' : undefined}>Đổi lịch miễn phí</h2>
          <p>
            Một lần, trước ít nhất 48 giờ. Giữ nguyên gói và thợ; tồn trang phục kiểm tra lại khi
            xác nhận.
          </p>
          <label>
            Ngày mới
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <label>
            Khung giờ mới
            <Select value={newTime} onChange={(e) => setNewTime(e.target.value)}>
              <option value="">Chọn khung giờ</option>
              {slots.map((s) => (
                <option key={s.startAt} value={s.startAt}>
                  {vnTime(s.startAt)}
                </option>
              ))}
            </Select>
          </label>
          <Button
            disabled={!newTime || busy}
            onClick={() => void command('reschedule', { startAt: newTime })}
          >
            Xác nhận đổi lịch
          </Button>
        </section>
      )}
      {order.canCancel && (
        <section className={customer ? 'customer-order-surface' : 'concept-card'}>
          <h2 className={customer ? 'customer-section-title' : undefined}>Hủy buổi chụp</h2>
          {!cancel ? (
            <Button onClick={() => setCancel(true)}>Xem khoản hoàn và hủy</Button>
          ) : (
            <>
              <p>
                Studio giữ {money(Math.min(retained, order.netReceived))}; khoản dự kiến hoàn{' '}
                {money(Math.max(0, order.netReceived - retained))}. Số tiền được kiểm tra lại lúc
                xác nhận.
              </p>
              <Button disabled={busy} onClick={() => void command('cancel')}>
                Xác nhận hủy buổi chụp
              </Button>
              <Button onClick={() => setCancel(false)}>Giữ lịch hiện tại</Button>
            </>
          )}
        </section>
      )}
      {order.canAccount && order.refundDue > 0 && (
        <section className={customer ? 'customer-order-surface' : 'concept-card'}>
          <h2 className={customer ? 'customer-section-title' : undefined}>Ghi nhận hoàn tiền</h2>
          <p>Thực hiện chuyển khoản trước, sau đó nhập chứng từ hoàn.</p>
          <label>
            Số tiền đã hoàn
            <Input
              type="number"
              min="1"
              max={order.refundDue}
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
            />
          </label>
          <label>
            Mã chứng từ
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
          <Button
            disabled={busy || !refund || !reference}
            onClick={() => void command('refund', { amount: Number(refund), reference })}
          >
            Ghi nhận đã hoàn
          </Button>
        </section>
      )}
      {['shot', 'completed'].includes(order.status) && (order.isOwner || order.canEdit) && (
        <ConceptAlbumPanel order={order} onOrderChange={() => void load()} />
      )}
      {order.canAccount && (
        <details className={customer ? 'customer-order-surface' : 'concept-card'}>
          <summary>Đối soát chứng từ SePay</summary>
          <p>
            Chứng từ phải đang cần đối soát, đúng tài khoản nhận và chưa ghi cho đơn khác. Với cọc
            lỗi, hủy đơn trước để ghi nhận tiền cần hoàn.
          </p>
          <label>
            Mã chứng từ SePay
            <Input value={receiptId} onChange={(e) => setReceiptId(e.target.value)} />
          </label>
          <label>
            Khoản thu
            <Select value={paymentId} onChange={(e) => setPaymentId(e.target.value)}>
              <option value="">Khoản cần hoàn của đơn đã hủy/hết hạn</option>
              {order.paymentRequests
                .filter((p) => p.status === 'pending' && p.kind !== 'deposit')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kind} · {money(p.amount)}
                  </option>
                ))}
            </Select>
          </label>
          <label>
            Căn cứ đối soát
            <Textarea value={reconcileNote} onChange={(e) => setReconcileNote(e.target.value)} />
          </label>
          <Button
            disabled={busy || !receiptId || !reconcileNote}
            onClick={() => void command('reconcile', { receiptId, paymentId, note: reconcileNote })}
          >
            Ghi nhận vào đơn
          </Button>
        </details>
      )}
      {order.canManage && !['cancelled', 'expired'].includes(order.status) && (
        <details className={customer ? 'customer-order-surface' : 'concept-card'}>
          <summary>Hủy ngoại lệ do Studio</summary>
          <label>
            Lý do
            <Textarea value={exceptionNote} onChange={(e) => setExceptionNote(e.target.value)} />
          </label>
          <label>
            Số tiền phải hoàn
            <Input
              type="number"
              min="0"
              max={order.netReceived}
              value={exceptionRefund}
              onChange={(e) => setExceptionRefund(e.target.value)}
            />
          </label>
          <Button
            disabled={busy || !exceptionNote || exceptionRefund === ''}
            onClick={() =>
              void command('exception-cancel', {
                note: exceptionNote,
                refundDue: Number(exceptionRefund),
              })
            }
          >
            Xác nhận hủy ngoại lệ và giải phóng tài nguyên
          </Button>
        </details>
      )}
      <section className={customer ? 'customer-order-surface' : undefined}>
        <h2 className={customer ? 'customer-section-title' : undefined}>Lịch sử đơn</h2>
        <ol className={customer ? 'space-y-3' : undefined}>
          {[...order.events].reverse().map((e, i) => (
            <li key={i} className={customer ? 'customer-order-history-item' : undefined}>
              {vnTime(e.at)} · {e.message}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

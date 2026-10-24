import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  OrderButton as Button,
  OrderInput as Input,
  OrderTextarea as Textarea,
  OrderSelect,
} from '../components/customer/CustomerOrderControls';
import { useCustomerAppearance } from '../components/customer/CustomerAppearance';
import { CustomerPrice } from '../components/customer/CustomerPrice';
import { CustomerPriceBreakdown } from '../components/customer/CustomerPriceBreakdown';
import '../styles/customer-orders.css';
import { useAuth } from '../context/AuthContext';
import {
  rentalService,
  rentalMoney as money,
  rentalDate as date,
  rentalError,
  rentalLabels,
  type RentalOrder,
} from '../services/rentalService';
import { createWorkflowRequestId } from '../services/bookingWorkflowService';
import { vietnamCalendarDate } from '../utils/vietnamCalendarDate';
import { rentalDayCount, validateRentalPeriod } from '../utils/rentalPeriod';

function Field({ label, children }: { label: string; children: ReactNode }) {
  const customer = useCustomerAppearance();
  const id = useId();
  const child = isValidElement<{ id?: string }>(children) ? children : null;
  const controlId = child?.props.id || id;
  return (
    <div className={customer ? 'customer-order-field' : 'space-y-1.5 text-sm'}>
      <label htmlFor={controlId}>{label}</label>
      {child ? cloneElement(child, { id: controlId }) : children}
    </div>
  );
}
const selectClass = 'min-h-11 w-full rounded-md border bg-background px-3';
const sectionClass = 'space-y-4 rounded-2xl border bg-card p-5';
type QuoteRow = {
  costumeId: string;
  name: string;
  size: string;
  quantity: string;
  unitPrice: string;
};
type ReturnRow = {
  costumeId: string;
  name: string;
  size: string;
  good: string;
  damaged: string;
  lost: string;
};
export default function RentalDetailPage() {
  const customer = useCustomerAppearance();
  const ContentTag = customer ? 'section' : 'main';
  const { id = '' } = useParams();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const admin = roles.includes(0) || roles.includes(1),
    sale = admin || roles.includes(2),
    finance = admin || roles.includes(5),
    client = roles.includes(6);
  const [order, setOrder] = useState<RentalOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([]);
  const [receiveDate, setReceiveDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [terms, setTerms] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [paymentKind, setPaymentKind] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [returnRows, setReturnRows] = useState<ReturnRow[]>([]);
  const [charges, setCharges] = useState<Array<{ label: string; amount: string }>>([]);
  const [settlementNote, setSettlementNote] = useState('');
  const [changeKind, setChangeKind] = useState('extend');
  const [changeDate, setChangeDate] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [finalFee, setFinalFee] = useState('');
  const [changeTerms, setChangeTerms] = useState('');
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const keys = useRef(new Map<string, string>());
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrder(await rentalService.get(id));
    } catch (e) {
      setError(rentalError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!order) return;
    const rows = order.quote?.lines ?? order.requestedLines;
    setQuoteRows(
      rows.map((row) => ({
        ...row,
        quantity: String(row.quantity),
        unitPrice:
          row.unitPrice !== undefined
            ? String(row.unitPrice)
            : order.pricingMode === 'daily'
              ? ''
              : '0',
      })),
    );
    setReceiveDate(vietnamCalendarDate(order.quote?.receiveDate ?? order.requestedReceiveDate));
    setReturnDate(vietnamCalendarDate(order.quote?.returnDate ?? order.requestedReturnDate));
    setDeposit(String(order.quote?.deposit ?? 0));
    setTerms(order.quote?.terms.join('\n') ?? '');
    setReturnRows(
      rows.map((row) => ({
        costumeId: row.costumeId,
        name: row.name,
        size: row.size,
        good: String(row.quantity),
        damaged: '0',
        lost: '0',
      })),
    );
    setCharges(
      order.settlement?.charges.map((row) => ({ ...row, amount: String(row.amount) })) ?? [],
    );
    setSettlementNote(order.settlement?.note ?? '');
    setFinalFee(String(order.change?.finalFee ?? order.quote?.fee ?? 0));
    setChangeTerms(order.change?.terms.join('\n') ?? '');
  }, [order]);
  const act = async (action: string, data: Record<string, unknown> = {}) => {
    if (!order) return false;
    setBusy(true);
    setError('');
    const signature = `${id}:${action}:${JSON.stringify(data)}`;
    const key = keys.current.get(signature) || createWorkflowRequestId();
    keys.current.set(signature, key);
    try {
      setOrder(await rentalService.act(id, order.version, action, data, key));
      keys.current.delete(signature);
      return true;
    } catch (e) {
      setError(rentalError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <p role="status" className="p-6">
        Đang tải đơn thuê…
      </p>
    );
  if (!order)
    return (
      <section role="alert" className="space-y-3 p-6">
        <p>{error || 'Không tìm thấy đơn thuê.'}</p>
        <Button onClick={() => void load()}>Thử tải lại</Button>
      </section>
    );
  const quote = order.quote,
    changeOpen = !!order.change && ['requested', 'proposed'].includes(order.change.status);
  const effectiveChangeKind =
    order.status === 'checked_out'
      ? 'extend'
      : ['awaiting_deposit', 'ready_to_confirm'].includes(order.status)
        ? 'cancel'
        : changeKind;
  const canQuote = sale && ['requested', 'quoting'].includes(order.status);
  const kinds = order.payment?.refundDue
    ? ['refund']
    : order.payment?.due &&
        !['completed', 'rejected'].includes(order.status) &&
        (!order.returnedAt || order.settlement?.acceptedAt)
      ? order.status === 'awaiting_deposit'
        ? ['deposit', 'balance']
        : ['balance']
      : [];
  const selectedKind = kinds.includes(paymentKind) ? paymentKind : (kinds[0] ?? 'balance');
  const dailyOrder = order.pricingMode === 'daily';
  const dailyQuote = quote?.pricingMode === 'daily';
  const dailyEditor = quote ? dailyQuote : dailyOrder;
  const quoteDays = quote
    ? (quote.rentalDays ??
      rentalDayCount(vietnamCalendarDate(quote.receiveDate), vietnamCalendarDate(quote.returnDate)))
    : null;
  const editorDays = rentalDayCount(receiveDate, returnDate);
  const editorMultiplier = dailyEditor ? editorDays : 1;
  const editorFee =
    editorMultiplier === null
      ? null
      : quoteRows.reduce((sum, row) => sum + Number(row.quantity) * Number(row.unitPrice), 0) *
        editorMultiplier;
  const dailyExtension = dailyQuote && order.change?.kind === 'extend';
  const extendedDays =
    quote && order.change?.returnDate
      ? rentalDayCount(
          vietnamCalendarDate(quote.receiveDate),
          vietnamCalendarDate(order.change.returnDate),
        )
      : null;
  const extensionFee =
    quote && extendedDays
      ? quote.lines.reduce((sum, row) => sum + row.quantity * (row.unitPrice ?? 0), 0) *
        extendedDays
      : null;
  const submitQuote = () => {
    const validation = validateRentalPeriod(receiveDate, returnDate);
    if (validation) {
      setError(validation);
      return;
    }
    if (
      quoteRows.some(
        (row) =>
          !row.unitPrice.trim() ||
          !Number.isSafeInteger(Number(row.unitPrice)) ||
          Number(row.unitPrice) < (dailyEditor ? 1 : 0),
      )
    ) {
      setError(
        dailyEditor
          ? 'Nhập giá/ngày là số nguyên dương cho từng món thuê.'
          : 'Kiểm tra lại đơn giá kỳ thuê.',
      );
      return;
    }
    return act('quote.propose', {
      lines: quoteRows.map((row) => ({
        costumeId: row.costumeId,
        size: row.size,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
      })),
      receiveDate,
      returnDate,
      deposit: Number(deposit),
      terms: terms
        .split('\n')
        .map((value) => value.trim())
        .filter(Boolean),
    });
  };
  return (
    <ContentTag className={customer ? 'customer-orders customer-orders--detail' : 'space-y-6'}>
      <div className="flex flex-wrap justify-between gap-3">
        <Link
          className={customer ? 'customer-link' : 'text-sm text-primary'}
          to={client ? '/account/orders?tab=rentals' : '/rental-orders'}
        >
          ← Danh sách đơn thuê
        </Link>
        <Button disabled={busy} variant="outline" onClick={() => void load()}>
          Tải lại đơn thuê
        </Button>
      </div>
      <header className={customer ? 'customer-order-surface' : sectionClass}>
        <p
          className={
            customer ? 'customer-order-meta' : 'text-xs uppercase tracking-widest text-primary'
          }
        >
          Đơn thuê trang phục & phụ kiện
        </p>
        <h1
          className={
            customer ? 'customer-page-title break-words' : 'text-2xl font-bold break-words'
          }
        >
          {order.contactName}
        </h1>
        <p className={customer ? 'customer-order-meta' : 'font-medium text-primary'}>
          {rentalLabels[order.status]} · Hồ sơ {order.version}
        </p>
        {order.phone && <p>Liên hệ: {order.phone}</p>}
        <p>
          Ngày khách đề nghị: {date(order.requestedReceiveDate)} – {date(order.requestedReturnDate)}
        </p>
        <p className="whitespace-pre-wrap break-words">{order.note}</p>
        <ul>
          {order.requestedLines.map((row) => (
            <li key={`${row.costumeId}:${row.size}`}>
              {row.name} · cỡ {row.size} · {row.quantity} món
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          {dailyOrder
            ? 'Yêu cầu và báo giá chưa giữ hàng. Hàng được giữ sau khi bạn đồng ý báo giá và studio ghi nhận đủ cọc bảo đảm, nếu còn trống trong toàn bộ kỳ thuê.'
            : 'Yêu cầu và báo giá chưa giữ hàng. Hàng chỉ được giữ sau khi studio xác nhận đủ điều kiện.'}
        </p>
      </header>
      {order.reservationIssue && (
        <section
          role="alert"
          className={
            customer
              ? 'customer-order-notice'
              : 'rounded-xl border border-amber-400 bg-amber-50 p-4 text-amber-900'
          }
        >
          <p className="font-semibold">Đã ghi nhận cọc, chưa giữ được hàng</p>
          <p>{order.reservationIssue}</p>
          <p>
            Studio cần kiểm tra tồn kho và thống nhất cách xử lý với khách. Khoản tiền đã nhận vẫn
            được ghi nhận; chưa có giao dịch hoàn tiền tự động.
          </p>
        </section>
      )}
      {client && ['requested', 'quoting'].includes(order.status) && (
        <section className={customer ? 'customer-order-surface' : sectionClass}>
          <p>Chưa đồng ý báo giá và chưa giữ hàng, bạn có thể rút yêu cầu thuê.</p>
          <Button variant="outline" disabled={busy} onClick={() => void act('withdraw')}>
            Rút yêu cầu thuê
          </Button>
        </section>
      )}
      {error && (
        <p
          role="alert"
          className={
            customer
              ? 'customer-order-error sticky top-2 z-10'
              : 'sticky top-2 z-10 rounded-xl border border-destructive/40 bg-card p-4 text-destructive'
          }
        >
          {error}
        </p>
      )}
      {quote && (
        <section className={customer ? 'customer-order-surface' : sectionClass}>
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Báo giá thuê phiên bản {quote.version}
          </h2>
          <p>
            {date(quote.receiveDate)} – {date(quote.returnDate)}
            {dailyQuote && quoteDays && ` · ${quoteDays} ngày (tính cả ngày nhận và trả)`}
          </p>
          <ul className="space-y-2">
            {quote.lines.map((row) => (
              <li
                key={`${row.costumeId}:${row.size}`}
                className={customer ? 'customer-order-inset' : 'rounded-lg bg-muted/30 p-3'}
              >
                {row.name} · cỡ {row.size} · {row.quantity} món
                {row.unitPrice !== undefined && (
                  <span className="block text-sm text-muted-foreground">
                    {dailyQuote ? 'Đơn giá/ngày:' : 'Đơn giá kỳ thuê ban đầu:'}{' '}
                    {customer ? <CustomerPrice amount={row.unitPrice} /> : money(row.unitPrice)}
                    {dailyQuote && quoteDays && ` × ${row.quantity} món × ${quoteDays} ngày`}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {quote.fee !== undefined &&
            (customer ? (
              <CustomerPriceBreakdown
                items={[
                  {
                    label: 'Phí thuê',
                    value: <CustomerPrice amount={quote.fee} emphasis="total" />,
                  },
                  { label: 'Cọc bảo đảm', value: <CustomerPrice amount={quote.deposit ?? 0} /> },
                ]}
              />
            ) : (
              <div className="grid gap-3 rounded-xl bg-primary/5 p-4 sm:grid-cols-2">
                <p>
                  Phí thuê: <strong>{money(quote.fee)}</strong>
                </p>
                <p>
                  Cọc bảo đảm: <strong>{money(quote.deposit)}</strong>
                </p>
              </div>
            ))}
          {!dailyQuote &&
            quote.fee !== undefined &&
            quote.fee >
              quote.lines.reduce((sum, row) => sum + row.quantity * (row.unitPrice ?? 0), 0) && (
              <p>
                Phí gia hạn đã đồng ý:{' '}
                {customer ? (
                  <CustomerPrice
                    amount={
                      quote.fee -
                      quote.lines.reduce((sum, row) => sum + row.quantity * (row.unitPrice ?? 0), 0)
                    }
                  />
                ) : (
                  money(
                    quote.fee -
                      quote.lines.reduce(
                        (sum, row) => sum + row.quantity * (row.unitPrice ?? 0),
                        0,
                      ),
                  )
                )}
              </p>
            )}
          <ul className="list-disc space-y-1 pl-5">
            {quote.terms.map((term, index) => (
              <li key={index} className="break-words">
                {term}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Cọc bảo đảm được đối soát sau nhận trả. Phụ phí cần được xác nhận riêng.
          </p>
          {quote.acceptedAt ? (
            <p className={customer ? 'customer-order-meta' : 'font-medium text-primary'}>
              Đã đồng ý báo giá vào {date(quote.acceptedAt)}
            </p>
          ) : (
            client &&
            order.status === 'quoting' && (
              <Button
                disabled={busy}
                onClick={() => void act('quote.accept', { quoteVersion: quote.version })}
              >
                Tôi đồng ý báo giá thuê {quote.version}
              </Button>
            )
          )}
        </section>
      )}
      {canQuote && (
        <form
          className={customer ? 'customer-order-surface' : sectionClass}
          onSubmit={(event) => {
            event.preventDefault();
            void submitQuote();
          }}
        >
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Lập báo giá thuê
          </h2>
          <p className="text-sm text-muted-foreground">
            {dailyEditor
              ? 'Đơn giá áp dụng theo ngày; phí thuê = giá/ngày × số lượng × số ngày, tính cả ngày nhận và ngày trả. Cọc được tính riêng.'
              : 'Đơn giá áp dụng cho cả kỳ thuê đã ghi; nhập điều khoản về cọc, gia hạn và phát sinh.'}
          </p>
          {quoteRows.map((row, index) => (
            <fieldset
              key={`${row.costumeId}:${row.size}`}
              className={
                customer
                  ? 'customer-order-inset'
                  : 'grid gap-3 rounded-xl border p-3 sm:grid-cols-2'
              }
            >
              <legend className="px-2 text-sm">
                {row.name} · {row.size}
              </legend>
              <Field label={`Số lượng báo giá ${index + 1}`}>
                <Input
                  required
                  type="number"
                  min={1}
                  max={10000}
                  step={1}
                  value={row.quantity}
                  onChange={(event) =>
                    setQuoteRows((current) =>
                      current.map((value, position) =>
                        position === index ? { ...value, quantity: event.target.value } : value,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={`${dailyEditor ? 'Đơn giá/ngày' : 'Đơn giá kỳ thuê'} ${index + 1} (đ)`}>
                <Input
                  required
                  type="number"
                  min={dailyEditor ? 1 : 0}
                  step={1}
                  value={row.unitPrice}
                  onChange={(event) =>
                    setQuoteRows((current) =>
                      current.map((value, position) =>
                        position === index ? { ...value, unitPrice: event.target.value } : value,
                      ),
                    )
                  }
                />
              </Field>
            </fieldset>
          ))}
          <div className={customer ? 'customer-order-summary' : 'grid gap-3 sm:grid-cols-2'}>
            <Field label="Ngày nhận trong báo giá">
              <Input
                required
                type="date"
                value={receiveDate}
                onChange={(event) => setReceiveDate(event.target.value)}
              />
            </Field>
            <Field label="Ngày trả trong báo giá">
              <Input
                required
                type="date"
                min={receiveDate}
                value={returnDate}
                onChange={(event) => setReturnDate(event.target.value)}
              />
            </Field>
            <Field label="Cọc bảo đảm (đ)">
              <Input
                required
                type="number"
                min={0}
                step={1}
                value={deposit}
                onChange={(event) => setDeposit(event.target.value)}
              />
            </Field>
          </div>
          <p>
            Tổng phí thuê:{' '}
            {editorFee === null ||
            (dailyEditor && quoteRows.some((row) => !row.unitPrice.trim())) ? (
              'Nhập đủ ngày và đơn giá/ngày'
            ) : customer ? (
              <CustomerPrice amount={editorFee} />
            ) : (
              money(editorFee)
            )}
            {dailyEditor && editorDays && ` · ${editorDays} ngày`}
          </p>
          <Field label="Điều khoản thuê, mỗi dòng một điều khoản">
            <Textarea
              required
              maxLength={20000}
              rows={4}
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={busy}>
            Gửi báo giá thuê
          </Button>
          <div className="space-y-2 border-t pt-4">
            <Field label="Lý do từ chối yêu cầu thuê">
              <Textarea
                maxLength={1000}
                value={rejectNote}
                onChange={(event) => setRejectNote(event.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !rejectNote.trim()}
              onClick={() => void act('reject', { note: rejectNote.trim() })}
            >
              Từ chối yêu cầu thuê
            </Button>
          </div>
        </form>
      )}
      {order.payment && (
        <section className={customer ? 'customer-order-surface' : sectionClass}>
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Thanh toán và cọc bảo đảm
          </h2>
          {customer ? (
            <CustomerPriceBreakdown
              items={[
                {
                  label: 'Đã thu sau hoàn',
                  value: <CustomerPrice amount={order.payment.netReceived} />,
                },
                { label: 'Còn thu', value: <CustomerPrice amount={order.payment.due} /> },
                { label: 'Cần hoàn', value: <CustomerPrice amount={order.payment.refundDue} /> },
              ]}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <p>
                Đã thu sau hoàn: <strong>{money(order.payment.netReceived)}</strong>
              </p>
              <p>
                Còn thu: <strong>{money(order.payment.due)}</strong>
              </p>
              <p>
                Cần hoàn: <strong>{money(order.payment.refundDue)}</strong>
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Trước giao: phí thuê + cọc. Sau nhận trả: phí thuê + phát sinh khách đã đồng ý; cọc dư
            được hoàn.
          </p>
          {order.payments?.map((row, index) => (
            <p
              key={index}
              className={customer ? 'customer-order-inset' : 'rounded-lg bg-muted/30 p-3 text-sm'}
            >
              {row.kind === 'refund'
                ? 'Hoàn tiền'
                : row.kind === 'deposit'
                  ? 'Cọc bảo đảm'
                  : 'Thanh toán'}{' '}
              · {customer ? <CustomerPrice amount={row.amount} /> : money(row.amount)} ·{' '}
              {date(row.at)} ·{' '}
              {row.method === 'cash'
                ? 'Tiền mặt'
                : row.method === 'bank_transfer'
                  ? 'Chuyển khoản'
                  : 'Khác'}
              {row.reference ? ` · ${row.reference}` : ''}
            </p>
          ))}
          {finance && kinds.length > 0 && (
            <form
              className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void act('payment.record', {
                  kind: selectedKind,
                  amount: Number(amount),
                  method,
                  reference: reference.trim(),
                }).then((ok) => {
                  if (ok) {
                    setAmount('');
                    setReference('');
                  }
                });
              }}
            >
              <Field label="Loại giao dịch thuê">
                <OrderSelect
                  className={selectClass}
                  value={selectedKind}
                  onChange={(event) => setPaymentKind(event.target.value)}
                >
                  {kinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind === 'refund'
                        ? 'Hoàn tiền'
                        : kind === 'deposit'
                          ? 'Cọc bảo đảm'
                          : 'Thanh toán'}
                    </option>
                  ))}
                </OrderSelect>
              </Field>
              <Field label="Số tiền thuê (đ)">
                <Input
                  required
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </Field>
              <Field label="Phương thức thuê">
                <OrderSelect
                  className={selectClass}
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                >
                  <option value="bank_transfer">Chuyển khoản</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="other">Khác</option>
                </OrderSelect>
              </Field>
              <Field label="Mã giao dịch thuê">
                <Input
                  maxLength={160}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </Field>
              <Button type="submit" disabled={busy}>
                Ghi nhận tiền thuê
              </Button>
            </form>
          )}
        </section>
      )}
      {admin && order.status === 'ready_to_confirm' && (
        <section className={customer ? 'customer-order-surface' : sectionClass}>
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Xác nhận giữ hàng
          </h2>
          <p className="text-sm text-muted-foreground">
            Kiểm tra mẫu, size và số lượng trên cả đơn thuê lẫn lịch chụp. Không có hàng khả dụng
            thì đơn giữ nguyên trạng thái.
          </p>
          <Button disabled={busy} onClick={() => void act('resources.confirm')}>
            Kiểm tra và giữ hàng thuê
          </Button>
        </section>
      )}
      {order.status === 'confirmed' && (
        <section className={customer ? 'customer-order-surface' : sectionClass}>
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Giao hàng
          </h2>
          <p>
            {order.readyForHandover
              ? 'Đã đủ phí thuê và cọc.'
              : 'Cần ghi nhận đủ phí thuê và cọc trước khi giao.'}{' '}
            Chỉ giao trong kỳ thuê đã chốt.
          </p>
          {admin && (
            <Button
              disabled={busy || !order.readyForHandover || changeOpen}
              onClick={() => void act('handover')}
            >
              Xác nhận đã giao hàng
            </Button>
          )}
        </section>
      )}
      {admin && order.status === 'checked_out' && (
        <form
          className={customer ? 'customer-order-surface' : sectionClass}
          onSubmit={(event) => {
            event.preventDefault();
            void act('return', {
              lines: returnRows.map((row) => ({
                costumeId: row.costumeId,
                size: row.size,
                good: Number(row.good),
                damaged: Number(row.damaged),
                lost: Number(row.lost),
              })),
            });
          }}
        >
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Kiểm tra và nhận trả
          </h2>
          <p className="text-sm text-muted-foreground">
            Ghi đúng số lượng tốt, hỏng và mất; tổng bằng số đã giao. Hàng hỏng/mất không còn khả
            dụng cho lịch tiếp theo.
          </p>
          {returnRows.map((row, index) => (
            <fieldset
              key={`${row.costumeId}:${row.size}`}
              className={
                customer
                  ? 'customer-order-inset'
                  : 'grid gap-3 rounded-xl border p-3 sm:grid-cols-3'
              }
            >
              <legend className="px-2 text-sm">
                {row.name} · {row.size}
              </legend>
              {(['good', 'damaged', 'lost'] as const).map((kind) => (
                <Field
                  key={kind}
                  label={`${kind === 'good' ? 'Trả tốt' : kind === 'damaged' ? 'Hỏng' : 'Mất'} ${index + 1}`}
                >
                  <Input
                    required
                    type="number"
                    min={0}
                    step={1}
                    value={row[kind]}
                    onChange={(event) =>
                      setReturnRows((current) =>
                        current.map((value, position) =>
                          position === index ? { ...value, [kind]: event.target.value } : value,
                        ),
                      )
                    }
                  />
                </Field>
              ))}
            </fieldset>
          ))}
          <Button type="submit" disabled={busy}>
            Xác nhận nhận trả hàng
          </Button>
        </form>
      )}
      {order.returnedAt && (
        <section className={customer ? 'customer-order-surface' : sectionClass}>
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Kết quả nhận trả
          </h2>
          <p>Đã nhận trả ngày {date(order.returnedAt)}.</p>
          <ul>
            {order.returns.map((row) => (
              <li key={`${row.costumeId}:${row.size}`}>
                {
                  quote?.lines.find(
                    (line) => line.costumeId === row.costumeId && line.size === row.size,
                  )?.name
                }{' '}
                · {row.size}: tốt {row.good}, hỏng {row.damaged}, mất {row.lost}
              </li>
            ))}
          </ul>
          {order.returns.some((row) => row.damaged || row.lost) && admin && (
            <p
              role="status"
              className={
                customer
                  ? 'customer-order-notice'
                  : 'rounded-lg bg-amber-100 p-3 text-sm text-amber-900'
              }
            >
              Có hàng hỏng/mất. Kiểm tra lại các lịch chụp và đơn thuê tương lai để bố trí hàng thay
              thế.
            </p>
          )}
        </section>
      )}
      {order.settlement?.proposedAt && (
        <section className={customer ? 'customer-order-surface' : sectionClass}>
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Đối soát nhận trả phiên bản {order.settlement.version}
          </h2>
          <p>
            Phí thuê: {customer ? <CustomerPrice amount={quote?.fee ?? 0} /> : money(quote?.fee)}
          </p>
          {order.settlement.charges.map((row, index) => (
            <p key={index}>
              {row.label}: {customer ? <CustomerPrice amount={row.amount} /> : money(row.amount)}
            </p>
          ))}
          <p className="font-semibold">
            Số tiền cuối phải thu:{' '}
            {customer ? (
              <CustomerPrice amount={order.settlement.total} emphasis="total" />
            ) : (
              money(order.settlement.total)
            )}
          </p>
          <p className="whitespace-pre-wrap">{order.settlement.note}</p>
          {order.settlement.acceptedAt ? (
            <p className={customer ? 'customer-order-meta' : 'text-primary'}>
              Khách đã đồng ý đối soát.
            </p>
          ) : (
            client && (
              <Button
                disabled={busy}
                onClick={() =>
                  void act('settlement.accept', { settlementVersion: order.settlement?.version })
                }
              >
                Tôi đồng ý đối soát nhận trả
              </Button>
            )
          )}
        </section>
      )}
      {admin && order.status === 'returned' && !order.settlement?.acceptedAt && (
        <form
          className={customer ? 'customer-order-surface' : sectionClass}
          onSubmit={(event) => {
            event.preventDefault();
            void act('settlement.propose', {
              charges: charges.map((row) => ({
                label: row.label.trim(),
                amount: Number(row.amount),
              })),
              note: settlementNote.trim(),
            });
          }}
        >
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Lập đối soát phí và hoàn cọc
          </h2>
          <p className="text-sm text-muted-foreground">
            Không có phụ phí thì để trống danh sách. Mọi phát sinh cần lý do và sự đồng ý của khách.
          </p>
          {charges.map((row, index) => (
            <div
              key={index}
              className={
                customer
                  ? 'customer-order-summary customer-order-inset'
                  : 'grid gap-3 rounded-xl border p-3 sm:grid-cols-2'
              }
            >
              <Field label={`Lý do phụ phí ${index + 1}`}>
                <Input
                  required
                  maxLength={200}
                  value={row.label}
                  onChange={(event) =>
                    setCharges((current) =>
                      current.map((value, position) =>
                        position === index ? { ...value, label: event.target.value } : value,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={`Phụ phí ${index + 1} (đ)`}>
                <Input
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={row.amount}
                  onChange={(event) =>
                    setCharges((current) =>
                      current.map((value, position) =>
                        position === index ? { ...value, amount: event.target.value } : value,
                      ),
                    )
                  }
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setCharges((current) => current.filter((_, position) => position !== index))
                }
              >
                Bỏ phụ phí {index + 1}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={charges.length >= 30}
            onClick={() => setCharges((current) => [...current, { label: '', amount: '' }])}
          >
            Thêm phụ phí
          </Button>
          <Field label="Ghi chú đối soát">
            <Textarea
              required
              maxLength={2000}
              value={settlementNote}
              onChange={(event) => setSettlementNote(event.target.value)}
            />
          </Field>
          <Button type="submit" disabled={busy}>
            Gửi đối soát nhận trả
          </Button>
        </form>
      )}
      {order.change && (
        <section className={customer ? 'customer-order-surface' : sectionClass}>
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            Yêu cầu {order.change.kind === 'cancel' ? 'hủy' : 'gia hạn'} đơn
          </h2>
          <p className="whitespace-pre-wrap">{order.change.note}</p>
          {order.change.returnDate && <p>Ngày trả đề nghị: {date(order.change.returnDate)}</p>}
          <p>
            {
              (
                {
                  requested: 'Chờ studio đề xuất',
                  proposed: 'Chờ khách đồng ý',
                  applied: 'Đã áp dụng',
                  declined: 'Đã đóng',
                } as Record<string, string>
              )[order.change.status]
            }
          </p>
          {order.change.status === 'proposed' && (
            <>
              {order.change.finalFee !== undefined && (
                <p>
                  Phí thuê cuối cùng:{' '}
                  {customer ? (
                    <CustomerPrice amount={order.change.finalFee} emphasis="total" />
                  ) : (
                    money(order.change.finalFee)
                  )}
                </p>
              )}
              <ul className="list-disc pl-5">
                {order.change.terms.map((term, index) => (
                  <li key={index}>{term}</li>
                ))}
              </ul>
              {client && (
                <Button
                  disabled={busy}
                  onClick={() => void act('change.accept', { changeId: order.change?._id })}
                >
                  Đồng ý thay đổi đơn thuê
                </Button>
              )}
            </>
          )}
          {changeOpen && (client || sale) && (
            <Button variant="outline" disabled={busy} onClick={() => void act('change.decline')}>
              Đóng yêu cầu thay đổi
            </Button>
          )}
          {sale && changeOpen && (
            <form
              className="space-y-3 border-t pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void act('change.propose', {
                  ...(dailyExtension ? {} : { finalFee: Number(finalFee) }),
                  terms: changeTerms
                    .split('\n')
                    .map((value) => value.trim())
                    .filter(Boolean),
                });
              }}
            >
              {dailyExtension ? (
                <p>
                  Phí thuê cuối theo ngày:{' '}
                  {extensionFee === null ? 'Chưa xác định được kỳ gia hạn' : money(extensionFee)}
                  {extendedDays &&
                    ` · ${extendedDays} ngày. Hệ thống tính theo đơn giá/ngày đã đồng ý; cọc giữ riêng.`}
                </p>
              ) : (
                <Field label="Phí thuê cuối sau thay đổi (đ)">
                  <Input
                    required
                    min={0}
                    type="number"
                    step={1}
                    value={finalFee}
                    onChange={(event) => setFinalFee(event.target.value)}
                  />
                </Field>
              )}
              <Field label="Điều khoản thay đổi đơn thuê">
                <Textarea
                  required
                  maxLength={20000}
                  value={changeTerms}
                  onChange={(event) => setChangeTerms(event.target.value)}
                />
              </Field>
              <Button disabled={busy} type="submit">
                Gửi đề xuất thay đổi đơn thuê
              </Button>
            </form>
          )}
        </section>
      )}
      {client &&
        ['awaiting_deposit', 'ready_to_confirm', 'confirmed', 'checked_out'].includes(
          order.status,
        ) &&
        !changeOpen && (
          <form
            className={customer ? 'customer-order-surface' : sectionClass}
            onSubmit={(event) => {
              event.preventDefault();
              void act('change.request', {
                kind: effectiveChangeKind,
                note: changeNote.trim(),
                ...(effectiveChangeKind === 'extend' ? { returnDate: changeDate } : {}),
              }).then((ok) => {
                if (ok) setChangeNote('');
              });
            }}
          >
            <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
              Yêu cầu gia hạn hoặc hủy
            </h2>
            <p className="text-sm text-muted-foreground">
              {['confirmed', 'checked_out'].includes(order.status)
                ? 'Kỳ thuê và hàng đã giữ vẫn giữ nguyên cho đến khi đề xuất được đồng ý và kiểm tra thành công.'
                : 'Studio sẽ đề xuất điều kiện hủy và đối soát tiền đã nhận. Đơn chưa giữ hàng.'}
            </p>
            <Field label="Loại thay đổi đơn thuê">
              <OrderSelect
                className={selectClass}
                value={effectiveChangeKind}
                onChange={(event) => setChangeKind(event.target.value)}
              >
                {['confirmed', 'checked_out'].includes(order.status) && (
                  <option value="extend">Gia hạn</option>
                )}
                {order.status !== 'checked_out' && <option value="cancel">Hủy trước giao</option>}
              </OrderSelect>
            </Field>
            {effectiveChangeKind === 'extend' && (
              <Field label="Ngày trả gia hạn">
                <Input
                  required
                  type="date"
                  value={changeDate}
                  onChange={(event) => setChangeDate(event.target.value)}
                />
              </Field>
            )}
            <Field label="Lý do thay đổi đơn thuê">
              <Textarea
                required
                maxLength={1000}
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy}>
              Gửi yêu cầu thay đổi đơn thuê
            </Button>
          </form>
        )}
      {order.status === 'completed' && (
        <section className={customer ? 'customer-order-surface' : sectionClass}>
          <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
            {order.feedback?.at ? 'Đánh giá thuê đã gửi' : 'Đánh giá dịch vụ thuê'}
          </h2>
          {order.feedback?.at ? (
            <p>
              {order.feedback.rating}/5 · {order.feedback.comment}
            </p>
          ) : (
            client && (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void act('feedback.submit', { rating: Number(rating), comment: comment.trim() });
                }}
              >
                <Field label="Điểm dịch vụ thuê">
                  <OrderSelect
                    className={selectClass}
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value}/5
                      </option>
                    ))}
                  </OrderSelect>
                </Field>
                <Field label="Nhận xét thuê">
                  <Textarea
                    maxLength={2000}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </Field>
                <Button disabled={busy} type="submit">
                  Gửi đánh giá thuê
                </Button>
              </form>
            )
          )}
        </section>
      )}
      {!!order.quoteHistory.length && (
        <details className={customer ? 'customer-order-surface' : sectionClass}>
          <summary className="cursor-pointer font-semibold">Lịch sử báo giá thuê</summary>
          {order.quoteHistory.map((history, index) => (
            <article key={index} className="space-y-2 border-t pt-3">
              <h3>
                Phiên bản {history.version} · {history.acceptedAt ? 'Đã đồng ý' : 'Chưa đồng ý'}
              </h3>
              <p>
                {date(history.receiveDate)} – {date(history.returnDate)}
                {history.pricingMode === 'daily' &&
                  history.rentalDays &&
                  ` · ${history.rentalDays} ngày`}
                {history.fee !== undefined ? (
                  customer ? (
                    <>
                      {' '}
                      · <CustomerPrice amount={history.fee} />
                    </>
                  ) : (
                    ` · ${money(history.fee)}`
                  )
                ) : (
                  ''
                )}
              </p>
              {history.deposit !== undefined && (
                <p>
                  Cọc bảo đảm:{' '}
                  {customer ? <CustomerPrice amount={history.deposit} /> : money(history.deposit)}
                </p>
              )}
              <ul>
                {history.lines.map((row) => (
                  <li key={`${row.costumeId}:${row.size}`}>
                    {row.name} · {row.size} · {row.quantity} món
                    {row.unitPrice !== undefined ? (
                      customer ? (
                        <>
                          {' '}
                          ·{' '}
                          <CustomerPrice
                            amount={row.unitPrice}
                            unit={
                              history.pricingMode === 'daily' ? '/món/ngày' : '/món cho kỳ thuê'
                            }
                          />
                        </>
                      ) : (
                        ` · ${money(row.unitPrice)}${history.pricingMode === 'daily' ? '/món/ngày' : '/món cho kỳ thuê'}`
                      )
                    ) : (
                      ''
                    )}
                  </li>
                ))}
              </ul>
              <ul>
                {history.terms.map((term, position) => (
                  <li key={position}>{term}</li>
                ))}
              </ul>
            </article>
          ))}
        </details>
      )}
      {!!order.settlementHistory?.length && (
        <details className={customer ? 'customer-order-surface' : sectionClass}>
          <summary className="cursor-pointer font-semibold">Lịch sử đối soát nhận trả</summary>
          {order.settlementHistory.map((history, index) => (
            <article key={index} className="space-y-2 border-t pt-3">
              <h3>
                Phiên bản {history.version} · {history.acceptedAt ? 'Đã đồng ý' : 'Chưa đồng ý'}
              </h3>
              <p>
                Tổng cuối:{' '}
                {customer ? <CustomerPrice amount={history.total} /> : money(history.total)}
              </p>
              <ul>
                {history.charges.map((row, position) => (
                  <li key={position}>
                    {row.label}:{' '}
                    {customer ? <CustomerPrice amount={row.amount} /> : money(row.amount)}
                  </li>
                ))}
              </ul>
              <p className="whitespace-pre-wrap">{history.note}</p>
            </article>
          ))}
        </details>
      )}
      {!!order.changeHistory?.length && (
        <details className={customer ? 'customer-order-surface' : sectionClass}>
          <summary className="cursor-pointer font-semibold">Lịch sử đề xuất thay đổi</summary>
          {order.changeHistory.map((history, index) => (
            <article key={index} className="space-y-2 border-t pt-3">
              <h3>
                {history.kind === 'extend' ? 'Gia hạn' : 'Hủy'} ·{' '}
                {history.status === 'applied'
                  ? 'Đã áp dụng'
                  : history.status === 'declined'
                    ? 'Đã đóng'
                    : 'Đề xuất trước'}
              </h3>
              {history.returnDate && <p>Ngày trả: {date(history.returnDate)}</p>}
              {history.finalFee !== undefined && (
                <p>
                  Phí cuối:{' '}
                  {customer ? <CustomerPrice amount={history.finalFee} /> : money(history.finalFee)}
                </p>
              )}
              <p>{history.note}</p>
              <ul>
                {history.terms.map((term, position) => (
                  <li key={position}>{term}</li>
                ))}
              </ul>
            </article>
          ))}
        </details>
      )}
      <section className={customer ? 'customer-order-surface' : sectionClass}>
        <h2 className={customer ? 'customer-section-title' : 'text-lg font-semibold'}>
          Lịch sử xử lý đơn thuê
        </h2>
        <ol className="space-y-3">
          {order.events.map((item, index) => (
            <li key={index} className="border-l-2 pl-3">
              <p className="break-words">{item.message}</p>
              <p className={customer ? 'customer-caption' : 'text-xs text-muted-foreground'}>
                {new Date(item.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </ContentTag>
  );
}

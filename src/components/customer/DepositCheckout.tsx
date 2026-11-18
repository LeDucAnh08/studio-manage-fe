import { useEffect, useId, useRef, useState } from 'react';
import { Link, type To } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  CircleCheck,
  Copy,
  GraduationCap,
  Info,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Shirt,
  TimerOff,
} from 'lucide-react';
import type { DepositPayment } from '../../services/bookingWorkflowService';
import { paymentService } from '../../services/paymentService';
import { PaymentCountdown } from './PaymentCountdown';
import { usePaymentClock } from './usePaymentClock';
import '../../styles/deposit-checkout.css';

const money = (amount: number) => amount.toLocaleString('vi-VN') + ' ₫';
const services = {
  rental: { label: 'Thuê trang phục', icon: Shirt },
  concept: { label: 'Chụp concept', icon: Camera },
  yearbook: { label: 'Chụp kỉ yếu', icon: GraduationCap },
};

export interface DepositCheckoutProps {
  service: keyof typeof services;
  orderId: string;
  title: string;
  description: string;
  fields: Array<[string, string]>;
  total: number;
  totalLabel: string;
  purpose?: 'balance';
  deposit: number;
  depositNote?: string;
  remaining: number;
  remainingNote: string;
  confirmation: string;
  payment?: DepositPayment | null;
  deadline?: string;
  state?: 'paid' | 'cancelled' | 'review' | 'expired';
  backTo: To;
  backLabel?: string;
  backState?: unknown;
  profileTo: string;
  profileLabel?: string;
  profileState?: unknown;
  restartTo: string;
  onRestart?: () => void;
  error?: string;
  notice?: string | null;
  loading?: boolean;
  onReload: () => void;
}

/** One customer deposit surface; orders retain their existing loading and polling. */
export function DepositCheckout(props: DepositCheckoutProps) {
  const { payment } = props;
  const balance = props.purpose === 'balance';
  const now = usePaymentClock();
  const headingId = useId();
  const summaryId = useId();
  const [imageError, setImageError] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState('');
  const [simulationError, setSimulationError] = useState('');
  const simulationKey = useRef<{ reference: string; key: string } | null>(null);
  useEffect(() => {
    setImageError(false);
  }, [payment?.qrUrl]);
  useEffect(() => {
    setSimulationMessage('');
    setSimulationError('');
  }, [payment?.reference]);

  const cancelled = props.state === 'cancelled';
  const reviewing = props.state === 'review';
  const paid = !cancelled && !reviewing && (props.state === 'paid' || payment?.status === 'paid');
  const deadlines = [payment?.expiresAt, props.deadline].filter(
    (value): value is string => !!value,
  );
  const deadline = deadlines.length
    ? Math.min(...deadlines.map((value) => Date.parse(value)))
    : NaN;
  const expired =
    !paid &&
    !reviewing &&
    !cancelled &&
    (props.state === 'expired' ||
      payment?.status === 'expired' ||
      (deadlines.length > 0 && (!Number.isFinite(deadline) || deadline <= now)));
  const active = !paid && !expired && !cancelled && !reviewing;
  const payable =
    active &&
    payment?.status === 'pending' &&
    payment.amount > 0 &&
    Number.isFinite(deadline) &&
    deadline > now;
  const received = balance
    ? props.total - props.remaining
    : paid
      ? props.deposit
      : Math.max(0, props.deposit - (payment?.amount ?? props.deposit));
  const partial = !balance && payable && received > 0;
  const item = services[props.service];
  const Icon = item.icon;
  const title = paid
    ? balance
      ? 'Đã thanh toán đủ'
      : 'Đã nhận tiền cọc'
    : reviewing
      ? 'Thanh toán cần đối soát'
      : cancelled
        ? 'Yêu cầu đã kết thúc'
        : expired
          ? 'Phiên thanh toán đã hết hạn'
          : balance
            ? 'Thanh toán phần còn lại'
            : 'Thanh toán tiền cọc';
  const status = paid
    ? balance
      ? 'Đã thu đủ tiền thuê'
      : 'Đã nhận đủ cọc'
    : reviewing
      ? 'Đang đối soát'
      : cancelled
        ? 'Đã kết thúc'
        : expired
          ? 'Đã hết hạn'
          : balance
            ? 'Chờ thanh toán'
            : 'Chờ thanh toán cọc';
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Đã sao chép thông tin thanh toán.');
    } catch {
      toast.error('Chưa sao chép được. Bạn có thể chọn và sao chép thông tin bên dưới.');
    }
  };
  const simulate = async () => {
    if (
      !payable ||
      !payment ||
      payment.mode !== 'sandbox' ||
      !payment.demoSimulation ||
      simulating ||
      Date.parse(payment.expiresAt) <= Date.now() ||
      deadline <= Date.now()
    )
      return;
    setSimulating(true);
    setSimulationError('');
    try {
      if (simulationKey.current?.reference !== payment.reference)
        simulationKey.current = { reference: payment.reference, key: crypto.randomUUID() };
      const result = await paymentService.simulateDeposit(
        payment.reference,
        simulationKey.current.key,
      );
      setSimulationMessage(
        result.status === 'applied' ? 'Đã ghi nhận thanh toán.' : 'Giao dịch cần studio đối soát.',
      );
      props.onReload();
    } catch {
      setSimulationError('Chưa thể xử lý thanh toán. Vui lòng thử lại.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <section className="deposit-checkout">
      <div className="deposit-main">
        <Link className="app-back-link deposit-back" to={props.backTo} state={props.backState}>
          <ArrowLeft size={17} aria-hidden="true" />
          {props.backLabel || 'Quay lại thông tin đơn'}
        </Link>
        <div className="deposit-page-heading">
          <div>
            <h1>{title}</h1>
            <p>
              {paid
                ? props.confirmation
                : reviewing
                  ? 'Studio đang kiểm tra khoản tiền đã nhận. Bạn không cần chuyển khoản lần nữa.'
                  : cancelled || expired
                    ? balance
                      ? 'Vui lòng xem hồ sơ đơn hoặc liên hệ studio.'
                      : 'Vui lòng kiểm tra hồ sơ trước khi đặt lại dịch vụ.'
                    : balance
                      ? 'Thanh toán đủ tiền thuê trước khi nhận trang phục.'
                      : 'Chỉ còn một bước để xác nhận đơn của bạn.'}
            </p>
          </div>
          <span className={`payment-state-pill ${paid ? 'is-paid' : !active ? 'is-ended' : ''}`}>
            {paid ? (
              <CircleCheck size={15} />
            ) : !active ? (
              <TimerOff size={15} />
            ) : (
              <span className="status-dot" />
            )}
            {status}
          </span>
        </div>
        <ol className="deposit-steps" aria-label="Tiến trình đặt dịch vụ">
          <li className="is-done">
            <span>
              <Check size={14} />
            </span>
            {balance ? 'Đã cọc' : 'Kiểm tra thông tin'}
          </li>
          <li className={paid ? 'is-done' : 'is-current'} aria-current={paid ? undefined : 'step'}>
            <span>{paid ? <Check size={14} /> : '2'}</span>
            {balance ? 'Thanh toán phần còn lại' : 'Thanh toán cọc'}
          </li>
          <li className={paid ? 'is-current' : ''} aria-current={paid ? 'step' : undefined}>
            <span>{paid ? <Check size={14} /> : '3'}</span>
            {balance ? 'Nhận trang phục' : 'Tự động xác nhận'}
          </li>
        </ol>
        {props.error && (
          <p role="alert" className="deposit-notice">
            {props.error}
          </p>
        )}
        {props.notice && (
          <p role="status" className="deposit-notice">
            {props.notice}
          </p>
        )}
        <div className="deposit-layout">
          <div className="deposit-payment-column">
            <section
              className={`deposit-payment-card ${!active ? 'is-terminal' : ''}`}
              aria-labelledby={headingId}
            >
              {active ? (
                <>
                  <div className="payment-card-heading">
                    <div className="payment-heading-icon">
                      <Landmark size={21} />
                    </div>
                    <div>
                      <h2 id={headingId}>
                        {payable ? 'Quét mã để thanh toán' : 'Thông tin thanh toán'}
                      </h2>
                      <p>
                        {payable
                          ? 'Mở ứng dụng ngân hàng và quét mã bên dưới.'
                          : 'Thông tin thanh toán đang được studio cập nhật.'}
                      </p>
                    </div>
                  </div>
                  {Number.isFinite(deadline) && (
                    <PaymentCountdown expiresAt={new Date(deadline).toISOString()} now={now} />
                  )}
                  {partial && (
                    <div className="partial-notice" role="status">
                      <Info size={18} />
                      <span>
                        Đã nhận <strong>{money(received)}</strong>. Vui lòng thanh toán thêm{' '}
                        <strong>{money(payment.amount)}</strong> để đủ cọc.
                      </span>
                    </div>
                  )}
                  {payable ? (
                    <>
                      <div className="payment-method-body">
                        <div className="qr-column">
                          <div className="qr-image-frame">
                            {payment.qrUrl && !imageError ? (
                              <img
                                src={payment.qrUrl}
                                width={234}
                                height={234}
                                alt={
                                  balance
                                    ? 'Mã QR thanh toán phần còn lại'
                                    : 'Mã QR thanh toán tiền cọc'
                                }
                                referrerPolicy="no-referrer"
                                onError={() => setImageError(true)}
                              />
                            ) : (
                              <p role="alert">
                                Chưa tải được ảnh QR. Bạn có thể chuyển khoản theo thông tin bên
                                cạnh và giữ nguyên nội dung.
                              </p>
                            )}
                            <span className="qr-caption">
                              <LockKeyhole size={12} />
                              QR chuyển khoản ngân hàng
                            </span>
                          </div>
                          {payment.downloadUrl && (
                            <a
                              className="deposit-button is-outline download-qr"
                              href={payment.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ArrowDownToLine size={16} />
                              Tải mã QR
                            </a>
                          )}
                        </div>
                        <div className="bank-column">
                          <div className="transfer-amount">
                            <span>{partial ? 'Số tiền còn thiếu' : 'Số tiền cần thanh toán'}</span>
                            <strong>{money(payment.amount)}</strong>
                            <small>
                              {balance
                                ? props.remainingNote
                                : partial
                                  ? 'QR hiển thị phần cọc còn thiếu'
                                  : props.depositNote}
                            </small>
                          </div>
                          <dl className="transfer-details">
                            <div>
                              <dt>Ngân hàng</dt>
                              <dd>
                                <Landmark size={16} />
                                {payment.bankName}
                              </dd>
                            </div>
                            <div>
                              <dt>Chủ tài khoản</dt>
                              <dd>{payment.accountName}</dd>
                            </div>
                            <div>
                              <dt>Số tài khoản</dt>
                              <dd className="copy-value">
                                <span>{payment.accountNumber}</span>
                                <button
                                  type="button"
                                  aria-label="Sao chép số tài khoản"
                                  onClick={() => void copy(payment.accountNumber)}
                                >
                                  <Copy size={17} />
                                </button>
                              </dd>
                            </div>
                            <div>
                              <dt>Nội dung chuyển khoản</dt>
                              <dd className="copy-value transfer-reference">
                                <span>{payment.reference}</span>
                                <button
                                  type="button"
                                  aria-label="Sao chép nội dung chuyển khoản"
                                  onClick={() => void copy(payment.reference)}
                                >
                                  <Copy size={17} />
                                </button>
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                      <div className="automatic-status" role="status">
                        <span className="live-indicator">
                          <LoaderCircle size={18} />
                        </span>
                        <div>
                          <strong>Đang chờ thanh toán</strong>
                          <p>Hệ thống tự động cập nhật khi nhận được tiền.</p>
                        </div>
                        <span className="automatic-badge">Tự động</span>
                      </div>
                      <p className="transfer-reminder">
                        <ShieldCheck size={17} />
                        <span>
                          Chuyển đúng số tiền và giữ nguyên nội dung. Bạn không cần gửi ảnh chụp
                          chuyển khoản.
                        </span>
                      </p>
                      {payment.mode === 'sandbox' && payment.demoSimulation && (
                        <div className="deposit-simulation">
                          <button
                            className="deposit-button is-primary"
                            disabled={simulating || !!simulationMessage}
                            onClick={() => void simulate()}
                          >
                            {simulating ? 'Đang xử lý…' : 'Thanh toán'}
                          </button>
                          {simulationMessage && <p role="status">{simulationMessage}</p>}
                          {simulationError && <p role="alert">{simulationError}</p>}
                        </div>
                      )}
                    </>
                  ) : (
                    <p role="status" className="deposit-notice">
                      Hiện chưa có thanh toán QR cho đơn này. Vui lòng liên hệ studio trước khi
                      chuyển khoản.
                    </p>
                  )}
                </>
              ) : (
                <div className={`terminal-content ${paid ? 'is-success' : ''}`}>
                  <div className="terminal-icon">
                    {paid ? (
                      <CheckCheck size={34} />
                    ) : reviewing ? (
                      <Info size={34} />
                    ) : (
                      <TimerOff size={34} />
                    )}
                  </div>
                  <span className="terminal-eyebrow">
                    {paid
                      ? balance
                        ? 'ĐÃ THU ĐỦ TIỀN THUÊ'
                        : 'ĐÃ NHẬN ĐỦ TIỀN CỌC'
                      : reviewing
                        ? 'STUDIO ĐANG ĐỐI SOÁT'
                        : 'PHIÊN THANH TOÁN ĐÃ KẾT THÚC'}
                  </span>
                  <h2 id={headingId}>
                    {paid
                      ? balance
                        ? 'Thanh toán thành công'
                        : 'Thanh toán cọc thành công'
                      : reviewing
                        ? 'Khoản thanh toán đang được kiểm tra'
                        : cancelled
                          ? 'Yêu cầu không còn hiệu lực'
                          : 'Mã QR không còn hiệu lực'}
                  </h2>
                  <p>
                    {paid
                      ? balance
                        ? props.confirmation
                        : `Yume đã nhận đủ ${money(props.deposit)} tiền cọc. ${props.confirmation}`
                      : reviewing
                        ? 'Vui lòng giữ lại biên lai và chờ studio kiểm tra giao dịch.'
                        : balance
                          ? 'Vui lòng xem hồ sơ đơn và liên hệ studio nếu cần hỗ trợ.'
                          : 'Vui lòng không chuyển tiền vào mã QR cũ. Kiểm tra hồ sơ đơn hoặc đặt lại dịch vụ.'}
                  </p>
                  {paid && (
                    <div className="received-amount">
                      <span>{balance ? 'Tổng tiền thuê đã nhận' : 'Tiền cọc đã nhận'}</span>
                      <strong>{money(balance ? props.total : props.deposit)}</strong>
                    </div>
                  )}
                  {expired && Number.isFinite(deadline) && deadline <= now && (
                    <PaymentCountdown expiresAt={new Date(deadline).toISOString()} now={now} />
                  )}
                  {!paid && !reviewing && props.onRestart ? (
                    <button
                      type="button"
                      className="deposit-button is-primary"
                      onClick={props.onRestart}
                    >
                      Đặt lại dịch vụ <ArrowRight size={17} />
                    </button>
                  ) : (
                    <Link
                      className="deposit-button is-primary"
                      to={balance || paid || reviewing ? props.profileTo : props.restartTo}
                      state={balance || paid || reviewing ? props.profileState : undefined}
                    >
                      {balance || paid || reviewing
                        ? props.profileLabel || 'Xem hồ sơ đơn'
                        : 'Đặt lại dịch vụ'}
                      <ArrowRight size={17} />
                    </Link>
                  )}
                </div>
              )}
            </section>
            <details className="deposit-help">
              <summary>
                <span>
                  <Info size={17} />
                  Gặp khó khăn khi thanh toán?
                </span>
                <ChevronDown size={16} />
              </summary>
              <div>
                <p>
                  <strong>Không quét được QR?</strong> Bạn có thể chuyển khoản bằng số tài khoản, số
                  tiền và nội dung hiển thị khi phiên còn hiệu lực.
                </p>
                <p>
                  <strong>Đã chuyển nhưng chưa cập nhật?</strong> Vui lòng chờ ngân hàng xử lý, giữ
                  lại biên lai và liên hệ studio nếu cần hỗ trợ. Bạn không cần chuyển khoản lần nữa.
                </p>
                <p>
                  <strong>Đã hết thời gian?</strong>{' '}
                  {balance
                    ? 'Liên hệ studio nếu bạn đã chuyển tiền.'
                    : 'Kiểm tra hồ sơ trước khi đặt lại.'}{' '}
                  Khoản tiền về muộn cần studio đối soát.
                </p>
                <button
                  type="button"
                  className="deposit-button is-outline"
                  disabled={props.loading}
                  onClick={props.onReload}
                >
                  Cập nhật thanh toán
                </button>
                {!paid && (
                  <Link
                    className="deposit-button is-outline"
                    to={props.profileTo}
                    state={props.profileState}
                  >
                    {props.profileLabel || 'Xem hồ sơ đơn'}
                  </Link>
                )}
              </div>
            </details>
          </div>
          <aside className="deposit-summary" aria-labelledby={summaryId}>
            <div className="summary-header">
              <span className="service-label">
                <Icon size={16} />
                {item.label}
              </span>
              <span className="order-short-id" title={props.orderId}>
                #{props.orderId.slice(-8).toUpperCase()}
              </span>
            </div>
            <h2 id={summaryId}>{props.title}</h2>
            <p className="summary-description">{props.description}</p>
            <dl className="order-facts">
              {props.fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="summary-price">
              <div>
                <span>{props.totalLabel}</span>
                <strong>{money(props.total)}</strong>
              </div>
              <div className="deposit-price-row">
                <div>
                  <strong>
                    {balance
                      ? 'Đã thanh toán'
                      : paid
                        ? 'Tiền cọc đã nhận'
                        : expired || cancelled || reviewing
                          ? 'Tiền cọc theo đơn'
                          : partial
                            ? 'Tổng tiền cọc'
                            : 'Tiền cọc cần thanh toán'}
                  </strong>
                  {!balance && <span>{props.depositNote}</span>}
                </div>
                <strong className="deposit-price">
                  {money(balance ? received : props.deposit)}
                </strong>
              </div>
              <div className="remaining-price">
                <span>{balance ? 'Còn phải trả' : 'Còn lại sau cọc'}</span>
                <strong>{money(props.remaining)}</strong>
              </div>
              <p className="remaining-note">{props.remainingNote}</p>
            </div>
            <div className="summary-confirm">
              <BadgeCheck size={21} />
              <p>
                {paid
                  ? props.confirmation
                  : reviewing
                    ? 'Studio đang đối soát khoản tiền đã nhận.'
                    : expired || cancelled
                      ? balance
                        ? 'Phiên thanh toán đã kết thúc.'
                        : 'Phiên thanh toán đã kết thúc. Kiểm tra hồ sơ trước khi đặt lại.'
                      : props.confirmation}
              </p>
            </div>
          </aside>
        </div>
        <footer className="deposit-footer">
          <span>
            <ShieldCheck size={14} />
            Thanh toán tự động qua SePay
          </span>
          <span className="footer-divider" />
          <span>Yume Studio</span>
        </footer>
      </div>
    </section>
  );
}

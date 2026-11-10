import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { OrderButton } from './CustomerOrderControls';
import type { DepositPayment } from '../../services/bookingWorkflowService';
import { paymentService } from '../../services/paymentService';

export function DepositPaymentPanel({
  payment,
  rental = false,
}: {
  payment: DepositPayment;
  rental?: boolean;
}) {
  const [expired, setExpired] = useState(() => Date.parse(payment.expiresAt) <= Date.now());
  const [imageError, setImageError] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState('');
  const [simulationError, setSimulationError] = useState('');
  const simulationKey = useRef<{ reference: string; key: string } | null>(null);
  useEffect(() => {
    setSimulationMessage('');
    setSimulationError('');
  }, [payment.reference]);
  const simulate = async () => {
    if (simulating) return;
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
        result.status === 'applied'
          ? 'Đã ghi nhận thanh toán.'
          : 'Giao dịch cần studio đối soát. Hãy tải lại hồ sơ.',
      );
    } catch (error) {
      setSimulationError(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
          'Chưa thể xử lý thanh toán. Vui lòng thử lại.',
      );
    } finally {
      setSimulating(false);
    }
  };
  useEffect(() => {
    setExpired(Date.parse(payment.expiresAt) <= Date.now());
    const timer = window.setTimeout(
      () => setExpired(true),
      Math.min(2_147_483_647, Math.max(0, Date.parse(payment.expiresAt) - Date.now())),
    );
    return () => window.clearTimeout(timer);
  }, [payment.expiresAt]);
  useEffect(() => setImageError(false), [payment.qrUrl]);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Đã sao chép thông tin thanh toán.');
    } catch {
      toast.error('Chưa sao chép được. Bạn có thể chọn và sao chép thông tin bên dưới.');
    }
  };
  const pending = payment.status === 'pending' && !expired;
  return (
    <section
      className="customer-order-surface space-y-4 rounded-xl border p-5"
      aria-labelledby="deposit-payment-title"
    >
      <h2 id="deposit-payment-title" className="text-lg font-semibold">
        Thanh toán tiền cọc
      </h2>
      {payment.status === 'paid' ? (
        <p role="status">
          {rental
            ? 'Đã nhận cọc — trang phục đã được giữ.'
            : 'Đã nhận cọc — lịch đã được xác nhận.'}
        </p>
      ) : payment.status === 'unavailable' ? (
        <p role="status">
          Thông tin thanh toán đang được studio cập nhật. Vui lòng liên hệ studio trước khi chuyển
          khoản.
        </p>
      ) : !pending ? (
        <p role="status">
          Đã hết thời hạn thanh toán hoặc yêu cầu không còn hiệu lực. Vui lòng liên hệ studio.
        </p>
      ) : (
        <>
          {payment.mode === 'sandbox' && payment.demoSimulation ? (
            <div className="space-y-3">
              <OrderButton
                type="button"
                disabled={simulating || !!simulationMessage}
                onClick={() => void simulate()}
              >
                {simulating ? 'Đang xử lý…' : 'Thanh toán thử'}
              </OrderButton>
              {simulationMessage && <p role="status">{simulationMessage}</p>}
              {simulationError && <p role="alert">{simulationError}</p>}
            </div>
          ) : payment.mode === 'live' ? (
            <p>
              Quét QR bằng ứng dụng ngân hàng. Số tiền và nội dung chuyển khoản được điền sẵn; hệ
              thống tự xác nhận khi nhận được tiền.
            </p>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-3">
              {payment.qrUrl && !imageError ? (
                <img
                  src={payment.qrUrl}
                  alt="Mã QR thanh toán tiền cọc"
                  width={240}
                  height={240}
                  referrerPolicy="no-referrer"
                  className="h-auto max-w-full rounded-lg bg-white p-2"
                  onError={() => setImageError(true)}
                />
              ) : (
                <p role="alert">
                  Chưa tải được ảnh QR. Bạn có thể chuyển khoản theo thông tin bên cạnh và giữ
                  nguyên nội dung.
                </p>
              )}
              {payment.downloadUrl && (
                <a
                  className="customer-link underline"
                  href={payment.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Tải QR về điện thoại
                </a>
              )}
            </div>
            <dl className="min-w-0 space-y-3 break-words">
              <div>
                <dt>Số tiền cọc còn cần thanh toán</dt>
                <dd className="text-2xl font-semibold">
                  {payment.amount.toLocaleString('vi-VN')} đ
                </dd>
              </div>
              <div>
                <dt>Ngân hàng</dt>
                <dd>{payment.bankName}</dd>
              </div>
              <div>
                <dt>Chủ tài khoản</dt>
                <dd>{payment.accountName}</dd>
              </div>
              <div>
                <dt>Số tài khoản</dt>
                <dd>{payment.accountNumber}</dd>
              </div>
              <div>
                <dt>Nội dung chuyển khoản</dt>
                <dd className="font-semibold">{payment.reference}</dd>
              </div>
              <div>
                <dt>Hạn thanh toán</dt>
                <dd>
                  {new Date(payment.expiresAt).toLocaleString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                  })}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-3">
            <OrderButton
              type="button"
              variant="outline"
              onClick={() => void copy(payment.accountNumber)}
            >
              Sao chép số tài khoản
            </OrderButton>
            <OrderButton
              type="button"
              variant="outline"
              onClick={() => void copy(payment.reference)}
            >
              Sao chép nội dung
            </OrderButton>
            <OrderButton
              type="button"
              variant="outline"
              onClick={() =>
                void copy(
                  `${payment.bankName}\n${payment.accountName}\n${payment.accountNumber}\n${payment.amount} VND\n${payment.reference}`,
                )
              }
            >
              Sao chép tất cả
            </OrderButton>
          </div>
          {payment.mode === 'live' && (
            <p role="status" className="text-sm">
              Đang chờ tiền cọc. Trang tự cập nhật sau khi ngân hàng thông báo giao dịch.
            </p>
          )}
        </>
      )}
    </section>
  );
}

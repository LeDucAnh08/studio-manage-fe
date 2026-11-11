import { ArrowLeft, Circle, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { portfolioImages } from '@/assets/images/portfolio-images';
import {
  bookingOrderStatusLabel,
  type BookingWorkflowDto,
} from '@/services/bookingWorkflowService';
import { CustomerImage } from './CustomerImage';
import { CustomerPrice } from './CustomerPrice';
import { OrderButton } from './CustomerOrderControls';
import { BookingOrderProgress } from './BookingOrderProgress';
import { BookingCostumeDetails } from './BookingCostumeDetails';
import '../../styles/customer-booking-intake.css';

interface CustomerBookingIntakeProps {
  record: BookingWorkflowDto;
  title: string;
  assignedPhotographerName?: string;
  assignedSupportPhotographerNames?: string[];
  sentAt?: string;
  requestedTime: string;
  note?: string;
  reviewNote?: string;
  formatDateTime: (value?: string | Date) => string;
  backPath: string;
  error: string;
  busy: boolean;
  onReload: () => void;
}

export function CustomerBookingIntake({
  record,
  title,
  assignedPhotographerName,
  assignedSupportPhotographerNames,
  sentAt,
  requestedTime,
  note,
  reviewNote,
  formatDateTime,
  backPath,
  error,
  busy,
  onReload,
}: CustomerBookingIntakeProps) {
  const { booking } = record;
  return (
    <section className="customer-booking-intake" aria-labelledby="customer-intake-title">
      <div className="customer-booking-intake__toolbar">
        <Link className="customer-back-link customer-booking-intake__back" to={backPath}>
          <ArrowLeft size={16} aria-hidden="true" />
          Quay lại danh sách
        </Link>
        <OrderButton
          variant="outline"
          className="customer-booking-intake__reload"
          disabled={busy}
          onClick={onReload}
        >
          Tải lại hồ sơ
        </OrderButton>
      </div>
      {error && (
        <p role="alert" className="customer-order-error">
          {error}
        </p>
      )}

      <header className="customer-booking-intake__heading">
        <p className="customer-booking-intake__eyebrow">Hồ sơ chụp kỉ yếu</p>
        <div className="customer-booking-intake__title-row">
          <h1 id="customer-intake-title" className="customer-booking-intake__title">
            {booking.className?.trim() ? `Yêu cầu của lớp ${title}` : title}
          </h1>
          <span className="customer-booking-intake__status">
            <Circle size={8} fill="currentColor" aria-hidden="true" />
            {bookingOrderStatusLabel(booking.status, 'intake')}
          </span>
        </div>
        <p className="customer-booking-intake__subtitle">
          {booking.packageName} · {booking.members} thành viên
        </p>
        <p className="mt-2 text-sm">
          Thợ phụ trách: {assignedPhotographerName || 'Studio đang phân công'}
        </p>
        {!!assignedSupportPhotographerNames?.length && (
          <p className="mt-2 text-sm">Thợ hỗ trợ: {assignedSupportPhotographerNames.join(', ')}</p>
        )}
      </header>

      <div className="customer-booking-intake__progress">
        {booking.packageAgreement && (
          <section className="customer-order-surface mb-6">
            <h2 className="customer-section-title">Thông tin gói đã xác nhận</h2>
            <p>
              <CustomerPrice amount={booking.packageAgreement.total} label="Tổng tiền gói:" />
            </p>
            <p>
              <CustomerPrice
                amount={booking.packageAgreement.depositRequired}
                label={`Tiền cọc ${booking.packageAgreement.depositPercent}%:`}
              />
            </p>
            <p>
              Studio kiểm tra ekip và giữ lịch {booking.packageAgreement.holdHours} giờ sau khi
              duyệt. Bạn chưa cần thanh toán khi yêu cầu đang chờ duyệt.
            </p>
          </section>
        )}
        <BookingOrderProgress record={record} />
        <div className="customer-booking-intake__notice">
          <Clock3 size={16} aria-hidden="true" />
          <p>Yêu cầu đang chờ studio xem xét. Thời gian đề xuất chưa giữ lịch.</p>
        </div>
      </div>

      <section
        className="customer-booking-intake__details"
        aria-labelledby="customer-intake-details-title"
      >
        <h2 id="customer-intake-details-title" className="customer-booking-intake__section-title">
          Thông tin yêu cầu
        </h2>
        <div className="customer-booking-intake__details-grid">
          <div className="customer-booking-intake__request-data">
            <dl className="customer-booking-intake__schedule">
              <div>
                <dt>Thời gian mong muốn</dt>
                <dd>
                  <time dateTime={booking.startAt}>{requestedTime}</time>
                </dd>
              </div>
              <div>
                <dt>Địa điểm mong muốn</dt>
                <dd>{booking.location || 'Chưa cập nhật'}</dd>
              </div>
            </dl>
            <div className="customer-booking-intake__fields">
              <dl>
                <div>
                  <dt>Lớp / nhóm</dt>
                  <dd>{booking.className?.trim() || 'Chưa cập nhật'}</dd>
                </div>
                {booking.school && (
                  <div>
                    <dt>Trường</dt>
                    <dd>{booking.school}</dd>
                  </div>
                )}
                <div>
                  <dt>Số thành viên</dt>
                  <dd>{booking.members}</dd>
                </div>
              </dl>
              <dl>
                <div>
                  <dt>Người liên hệ</dt>
                  <dd>{booking.contactName || 'Chưa cập nhật'}</dd>
                </div>
                <div>
                  <dt>Điện thoại</dt>
                  <dd>{booking.phone || 'Chưa cập nhật'}</dd>
                </div>
                <div>
                  <dt>Thời điểm gửi</dt>
                  <dd>
                    <time dateTime={sentAt}>{formatDateTime(sentAt)}</time>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <CustomerImage
            className="customer-booking-intake__photo"
            src={portfolioImages.may01381.src}
            alt=""
            width={640}
            height={448}
          />
        </div>
        {note && (
          <div className="customer-booking-intake__note">
            <h3>Yêu cầu thêm của khách</h3>
            <p>{note}</p>
          </div>
        )}
        {reviewNote && (
          <div className="customer-booking-intake__note">
            <h3>Phản hồi từ studio</h3>
            <p>{reviewNote}</p>
          </div>
        )}
      </section>

      <BookingCostumeDetails booking={booking} />
    </section>
  );
}

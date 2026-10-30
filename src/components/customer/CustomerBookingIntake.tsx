import { ArrowLeft, Circle, CircleCheck, CircleDot, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { portfolioImages } from '@/assets/images/portfolio-images';
import type { BookingWorkflowDto } from '@/services/bookingWorkflowService';
import { CustomerImage } from './CustomerImage';
import { OrderButton } from './CustomerOrderControls';
import { BookingCostumeDetails } from './BookingCostumeDetails';
import '../../styles/customer-booking-intake.css';

interface CustomerBookingIntakeProps {
  booking: BookingWorkflowDto['booking'];
  title: string;
  assignedPhotographerName?: string;
  assignedSupportPhotographerNames?: string[];
  sentAt?: string;
  requestedTime: string;
  note?: string;
  reviewNote?: string;
  timeline: BookingWorkflowDto['workflow']['events'];
  formatDateTime: (value?: string | Date) => string;
  backPath: string;
  error: string;
  busy: boolean;
  onReload: () => void;
}

export function CustomerBookingIntake({
  booking,
  title,
  assignedPhotographerName,
  assignedSupportPhotographerNames,
  sentAt,
  requestedTime,
  note,
  reviewNote,
  timeline,
  formatDateTime,
  backPath,
  error,
  busy,
  onReload,
}: CustomerBookingIntakeProps) {
  return (
    <section className="customer-booking-intake" aria-labelledby="customer-intake-title">
      <div className="customer-booking-intake__toolbar">
        <Link className="customer-link customer-booking-intake__back" to={backPath}>
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
        <p className="customer-booking-intake__eyebrow">Hồ sơ đặt dịch vụ</p>
        <div className="customer-booking-intake__title-row">
          <h1 id="customer-intake-title" className="customer-booking-intake__title">
            {booking.className?.trim() ? `Yêu cầu của lớp ${title}` : title}
          </h1>
          <span className="customer-booking-intake__status">
            <Circle size={8} fill="currentColor" aria-hidden="true" />
            Mới tiếp nhận
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
        <ol className="customer-booking-intake__steps" aria-label="Tiến trình yêu cầu">
          <li className="customer-booking-intake__step">
            <CircleCheck
              className="customer-booking-intake__step-icon customer-booking-intake__step-icon--complete"
              size={44}
              aria-hidden="true"
            />
            <div className="customer-booking-intake__step-copy">
              <p className="customer-booking-intake__step-label">Đã gửi yêu cầu</p>
              <p className="customer-booking-intake__step-caption">
                <time dateTime={sentAt}>{formatDateTime(sentAt)}</time>
              </p>
            </div>
          </li>
          <li className="customer-booking-intake__step" aria-current="step">
            <CircleDot
              className="customer-booking-intake__step-icon customer-booking-intake__step-icon--current"
              size={44}
              aria-hidden="true"
            />
            <div className="customer-booking-intake__step-copy">
              <p className="customer-booking-intake__step-label">Chờ studio xem xét</p>
              <p className="customer-booking-intake__step-caption">
                Studio sẽ kiểm tra và phản hồi
              </p>
            </div>
          </li>
          <li className="customer-booking-intake__step">
            <Circle
              className="customer-booking-intake__step-icon customer-booking-intake__step-icon--future"
              size={44}
              aria-hidden="true"
            />
            <div className="customer-booking-intake__step-copy">
              <p className="customer-booking-intake__step-label">Báo giá &amp; xác nhận</p>
              <p className="customer-booking-intake__step-caption">Chưa bắt đầu</p>
            </div>
          </li>
        </ol>
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
            <h3>Thông tin khách đã gửi</h3>
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
      <section
        className="customer-booking-intake__history"
        aria-labelledby="customer-intake-history-title"
      >
        <h2 id="customer-intake-history-title" className="customer-booking-intake__section-title">
          Lịch sử xử lý
        </h2>
        {timeline.length ? (
          <ol className="customer-booking-intake__timeline">
            {timeline.map((event, index) => (
              <li
                key={`${event.action}-${event.at}-${index}`}
                className="customer-booking-intake__event"
              >
                <Circle size={8} fill="currentColor" aria-hidden="true" />
                <div>
                  <div className="customer-booking-intake__event-heading">
                    <span className="customer-booking-intake__event-title">
                      {event.message.startsWith('Đã nhận yêu cầu đặt dịch vụ.')
                        ? 'Đã nhận yêu cầu'
                        : 'Cập nhật hồ sơ'}
                    </span>
                    <time dateTime={event.at} className="customer-booking-intake__event-time">
                      {formatDateTime(event.at)}
                    </time>
                  </div>
                  <p className="customer-booking-intake__event-message">
                    {event.message.startsWith('Đã nhận yêu cầu đặt dịch vụ.')
                      ? event.message.slice('Đã nhận yêu cầu đặt dịch vụ.'.length).trim()
                      : event.message}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="customer-booking-intake__empty">Chưa có cập nhật trong quy trình.</p>
        )}
      </section>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Check, Clock3, ImageIcon, X } from 'lucide-react';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { CustomerContainer } from '../components/customer/CustomerContainer';
import { CustomerButton } from '../components/customer/CustomerButton';
import { CustomerImage } from '../components/customer/CustomerImage';
import { CustomerPrice } from '../components/customer/CustomerPrice';
import { packageService, packageImageUrl } from '../services/packageService';
import { clientPortalEnabled } from '../config/features';
import type { Package, PackageImage } from '../types';
import '../styles/package-detail.css';

const durationLabels = {
  full_day: '1 ngày',
  half_day: '1/2 ngày',
  two_thirds_day: '2/3 ngày',
};

function PackageGallery({ images }: { images: PackageImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const image = active === null ? null : images[active];
  const move = (direction: number) =>
    setActive((index) =>
      index === null ? null : (index + direction + images.length) % images.length,
    );
  return (
    <Dialog.Root
      open={active !== null}
      onOpenChange={(open) => {
        if (!open) setActive(null);
      }}
    >
      <div className="package-detail__gallery">
        {images.map((item, index) => (
          <figure key={item.id}>
            <button
              type="button"
              className="package-detail__photo"
              aria-label={`Xem ảnh ${index + 1}: ${item.alt}`}
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setActive(index);
              }}
            >
              <CustomerImage
                src={packageImageUrl(item.id)}
                alt={item.alt}
                width={item.width}
                height={item.height}
              />
              <span className="package-detail__photo-label">
                <ImageIcon size={16} /> Xem ảnh
              </span>
            </button>
            {item.caption && <figcaption>{item.caption}</figcaption>}
          </figure>
        ))}
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="package-lightbox-overlay" />
        <Dialog.Content
          className="customer-ui customer-tokens package-lightbox"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              move(-1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              move(1);
            }
          }}
        >
          <Dialog.Title className="sr-only">Ảnh demo của gói dịch vụ</Dialog.Title>
          <Dialog.Close className="package-lightbox__close" aria-label="Đóng ảnh">
            <X />
          </Dialog.Close>
          {image && (
            <figure>
              <CustomerImage
                src={packageImageUrl(image.id)}
                alt={image.alt}
                width={image.width}
                height={image.height}
                priority
              />
              <figcaption>{image.caption || image.alt}</figcaption>
            </figure>
          )}
          <div className="package-lightbox__controls">
            <CustomerButton
              variant="secondary"
              onClick={() => move(-1)}
              disabled={images.length < 2}
              aria-label="Ảnh trước"
            >
              <ArrowLeft size={18} />
            </CustomerButton>
            <span aria-live="polite">
              {(active ?? 0) + 1} / {images.length}
            </span>
            <CustomerButton
              variant="secondary"
              onClick={() => move(1)}
              disabled={images.length < 2}
              aria-label="Ảnh tiếp theo"
            >
              <ArrowRight size={18} />
            </CustomerButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function PublicPackageDetailPage() {
  const { id = '' } = useParams();
  const [pkg, setPackage] = useState<Package | null>(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setPackage(null);
    setError('');
    setNotFound(false);
    packageService
      .getPublic(id)
      .then((item) => {
        if (!cancelled) setPackage(item);
      })
      .catch((failure) => {
        if (cancelled) return;
        const status = failure?.response?.status;
        setNotFound(status === 400 || status === 404);
        setError(
          status === 400 || status === 404
            ? 'Gói dịch vụ không còn tồn tại.'
            : 'Không tải được gói dịch vụ. Vui lòng thử lại.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);
  const details = pkg?.details;
  const cover = details?.gallery[0];
  const policies = [
    ['Chuẩn bị cho buổi chụp', details?.preparationNotes],
    ['Đặt cọc', details?.depositPolicy],
    ['Đổi và hủy lịch', details?.cancellationPolicy],
  ].filter(([, value]) => value);
  const included = pkg
    ? [
        ...(pkg.duration ? [`Thời lượng: ${durationLabels[pkg.duration]}`] : []),
        ...(pkg.crewRatio ? [`Ekip: ${pkg.crewRatio}`] : []),
        ...(pkg.studentsPerCrew ? [`${pkg.studentsPerCrew} học sinh / thợ`] : []),
        ...(pkg.editingScope
          ? [pkg.editingScope === 'full' ? 'Hậu kỳ toàn bộ ảnh' : 'Hậu kỳ ảnh chọn lọc']
          : []),
        ...(pkg.deliveryDays ? [`Bàn giao trong tối đa ${pkg.deliveryDays} ngày`] : []),
        pkg.costumes?.length
          ? `Trang phục đã bao gồm: ${pkg.costumes.map((item) => item.name).join(', ')}`
          : 'Trang phục đã bao gồm · Studio tư vấn mẫu và size khi chốt lịch',
        ...(details?.benefits || []),
      ]
    : [];
  return (
    <PublicSiteLayout source="pricing">
      <CustomerContainer className="package-detail">
        <Link to="/pricing" className="package-detail__back">
          <ArrowLeft size={16} /> Tất cả gói dịch vụ
        </Link>
        {error ? (
          <section className="package-detail__state" role="alert">
            <h1>{notFound ? 'Không tìm thấy gói dịch vụ' : 'Chưa thể tải thông tin'}</h1>
            <p>{error}</p>
            {!notFound && (
              <CustomerButton onClick={() => setAttempt((value) => value + 1)}>
                Thử lại
              </CustomerButton>
            )}
          </section>
        ) : !pkg ? (
          <section className="package-detail__state" role="status" aria-busy="true">
            Đang tải chi tiết gói dịch vụ…
          </section>
        ) : (
          <>
            <header className="package-detail__intro">
              <p className="package-detail__eyebrow">YUME STUDIO / GÓI DỊCH VỤ</p>
              <h1>{pkg.name}</h1>
              {pkg.description && <p className="package-detail__lead">{pkg.description}</p>}
              {pkg.isPopular && <span className="package-detail__badge">Được yêu thích</span>}
            </header>
            {cover && (
              <div className="package-detail__cover">
                <CustomerImage
                  src={packageImageUrl(cover.id)}
                  alt={cover.alt}
                  width={cover.width}
                  height={cover.height}
                  priority
                />
              </div>
            )}
            <div className="package-detail__layout">
              <div className="package-detail__body">
                {details?.audience && (
                  <section>
                    <h2>Gói này dành cho ai?</h2>
                    <p>{details.audience}</p>
                  </section>
                )}
                <section id="benefits">
                  <p className="package-detail__eyebrow">TRẢI NGHIỆM TRỌN VẸN</p>
                  <h2>Quyền lợi trong gói</h2>
                  <ul className="package-detail__benefits">
                    {included.map((item, index) => (
                      <li key={index}>
                        <Check size={18} aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                {!!details?.gallery.length && (
                  <section id="gallery">
                    <h2>Một chút cảm hứng cho ngày chụp</h2>
                    <p>Ảnh demo của gói dịch vụ.</p>
                    <PackageGallery images={details.gallery} />
                  </section>
                )}
                {details?.deliverables?.trim() && (
                  <section id="deliverables">
                    <h2>Sản phẩm bàn giao</h2>
                    <p>{details.deliverables}</p>
                  </section>
                )}
                {details?.shootScope?.trim() && (
                  <section id="shoot-scope">
                    <h2>Phạm vi buổi chụp</h2>
                    <p>{details.shootScope}</p>
                  </section>
                )}
                {!!details?.itinerary.length && (
                  <section id="itinerary">
                    <h2>Lịch trình buổi chụp mẫu</h2>
                    <p>Lịch trình tham khảo, studio sẽ thống nhất thời gian thực tế với lớp.</p>
                    <ol className="package-detail__timeline">
                      {details.itinerary.map((item, index) => (
                        <li key={index}>
                          <div className="package-detail__time">
                            <Clock3 size={16} />
                            {item.time}
                          </div>
                          <div>
                            <h3>{item.title}</h3>
                            {item.description && <p>{item.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                {!!details?.process.length && (
                  <section id="process">
                    <h2>Từ ý tưởng đến những tấm ảnh</h2>
                    <ol className="package-detail__process">
                      {details.process.map((item, index) => (
                        <li key={index}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <div>
                            <h3>{item.title}</h3>
                            {item.description && <p>{item.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                <section id="costs">
                  <h2>Chi phí rõ ràng trước khi đặt</h2>
                  <div className="package-detail__base-price">
                    <span>Giá gói / người</span>
                    <strong>
                      {pkg.pricePerMember > 0
                        ? `${pkg.pricePerMember.toLocaleString('vi-VN')} đ`
                        : 'Liên hệ'}
                    </strong>
                  </div>
                  <p>
                    Giá gói tính theo số thành viên. Studio kiểm tra phạm vi phục vụ và lịch trước
                    khi duyệt; thay đổi ngoài gói cần được hai bên xác nhận riêng.
                  </p>
                  {details?.priceNotes && <p>{details.priceNotes}</p>}
                  {details?.pricingConditions?.trim() && (
                    <div>
                      <h3>Điều kiện áp dụng giá</h3>
                      <p>{details.pricingConditions}</p>
                    </div>
                  )}
                  {!!details?.exclusions.length && (
                    <>
                      <h3>Các khoản chưa bao gồm</h3>
                      <ul className="package-detail__list">
                        {details.exclusions.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {!!details?.extraCosts.length && (
                    <>
                      <h3>Chi phí có thể phát sinh</h3>
                      <div className="package-detail__costs">
                        {details.extraCosts.map((item, index) => (
                          <article key={index}>
                            <div>
                              <h4>{item.name}</h4>
                              {item.condition && <p>{item.condition}</p>}
                            </div>
                            <strong>{item.priceLabel}</strong>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </section>
                {!!policies.length && (
                  <section id="policies">
                    <h2>Điều kiện và lưu ý</h2>
                    {policies.map(([title, value]) => (
                      <div className="package-detail__policy" key={title}>
                        <h3>{title}</h3>
                        <p>{value}</p>
                      </div>
                    ))}
                  </section>
                )}
              </div>
              <aside className="package-detail__booking" aria-label="Chọn gói dịch vụ">
                <p className="package-detail__eyebrow">CHO NGÀY THẬT ĐÁNG NHỚ</p>
                <h2>{pkg.name}</h2>
                <div className="package-detail__price">
                  {pkg.pricePerMember > 0 ? (
                    <CustomerPrice amount={pkg.pricePerMember} unit="/ người" />
                  ) : (
                    <strong>Liên hệ</strong>
                  )}
                </div>
                <p>
                  Trang phục đã bao gồm trong gói. Studio đồng hành cùng lớp để chốt lịch trình và
                  chi tiết.
                </p>
                {clientPortalEnabled && (
                  <CustomerButton asChild fullWidth>
                    <Link
                      to={`/booking/start?source=pricing&package=${encodeURIComponent(pkg._id)}`}
                    >
                      Đặt gói này <ArrowRight size={18} />
                    </Link>
                  </CustomerButton>
                )}
                <Link to="/pricing" className="package-detail__other">
                  Xem các gói khác
                </Link>
              </aside>
            </div>
          </>
        )}
      </CustomerContainer>
    </PublicSiteLayout>
  );
}

import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Image as ImageIcon,
  Shirt,
  UserRound,
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { CustomerImage } from '../components/customer/CustomerImage';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { useConceptCatalog } from '../hooks/useConceptCatalog';
import { money, conceptDecorLabels, conceptDeliveryLabels } from '../services/conceptService';
import { conceptBookingPath, readConceptDraft, writeConceptDraft } from '../services/conceptDraft';
import '../styles/concept-catalog.css';

export default function ConceptPackageDetailPage() {
  const { packageId } = useParams();
  const { catalog, error, reload } = useConceptCatalog();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [photoGroup, setPhotoGroup] = useState<'gallery' | 'showcase'>('gallery');
  const filter = new URLSearchParams(location.state?.catalogSearch || '').get('concept');
  const back = '/concept-booking' + (filter ? '?concept=' + encodeURIComponent(filter) : '');
  const pkg = catalog?.packages.find((item) => item._id === packageId);
  const concept = catalog?.concepts.find((item) => item._id === pkg?.concept);
  const gallery = concept?.gallery || [];
  const showcase = pkg?.showcase;
  const viewerPhotos = photoGroup === 'showcase' ? showcase?.images || [] : gallery;
  const image = pkg?.imageUrl || concept?.coverUrl || gallery[0]?.url;
  const selectPackage = () => {
    if (!pkg) return;
    const draft = readConceptDraft(user?._id || null);
    const samePackage = draft.packageId === pkg._id;
    const next = {
      ...draft,
      packageId: pkg._id,
      step: 2,
      key: crypto.randomUUID(),
      ...(!samePackage
        ? {
            startAt: '',
            photographerId: '',
            costumes: [],
            people: Math.min(draft.people, pkg.maxPeople),
          }
        : {}),
    };
    writeConceptDraft(next);
    navigate(conceptBookingPath(pkg._id), { state: { conceptDraft: next } });
  };
  return (
    <PublicSiteLayout source="concepts">
      <div className="concept-package-page">
        <Link className="concept-back-link" to={back}>
          <ArrowLeft size={20} aria-hidden="true" />
          Quay lại danh sách gói
        </Link>
        {error && (
          <div role="alert" className="concept-catalog-notice">
            <p>{error}</p>
            <button onClick={reload}>Thử tải lại</button>
          </div>
        )}
        {!catalog && !error && (
          <p role="status" className="concept-catalog-notice">
            Đang tải thông tin gói…
          </p>
        )}
        {catalog && !pkg && (
          <section className="concept-catalog-notice">
            <h1>Gói chụp không còn khả dụng</h1>
            <p>Bạn có thể quay lại danh sách để chọn một gói khác.</p>
          </section>
        )}
        {pkg && concept && (
          <>
            <header className="concept-package-hero">
              {image && (
                <CustomerImage src={image} alt={pkg.name} width={800} height={510} priority />
              )}
              <div className="concept-package-hero__content">
                <p className="concept-package-eyebrow">{concept.name}</p>
                <h1>{pkg.name}</h1>
                <p className="concept-package-price">
                  {money(pkg.price)} <span>/ buổi</span>
                </p>
                {(pkg.introduction || concept.description) && (
                  <p className="concept-package-intro">{pkg.introduction || concept.description}</p>
                )}
                <dl className="concept-package-facts">
                  {[
                    { Icon: Clock3, label: 'Thời lượng', value: `${pkg.durationMinutes} phút` },
                    { Icon: UserRound, label: 'Số người', value: `${pkg.maxPeople} người` },
                    {
                      Icon: ImageIcon,
                      label: 'Ảnh chỉnh sửa',
                      value: `${pkg.retouchQuota} ảnh chỉnh sửa`,
                    },
                    {
                      Icon: Shirt,
                      label: 'Trang phục',
                      value: pkg.costumeCount
                        ? `${pkg.costumeCount} bộ trang phục`
                        : 'Trang phục cá nhân',
                    },
                  ].map(({ Icon, label, value }) => (
                    <div key={label}>
                      <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
                      <dt className="sr-only">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {concept.styleSummary && (
                  <p className="concept-package-style">{concept.styleSummary}</p>
                )}
              </div>
            </header>
            {(concept.story || concept.audience || concept.setting || concept.wardrobeGuidance) && (
              <section className="concept-detail-section">
                <h2>Về concept {concept.name}</h2>
                <div className="concept-story-grid">
                  <div className="concept-prose">
                    {(concept.story || concept.description)
                      .split(/\n\s*\n/)
                      .map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                  </div>
                  <dl className="concept-style-facts">
                    {[
                      { label: 'Phù hợp với', value: concept.audience },
                      { label: 'Không gian', value: concept.setting },
                      { label: 'Gợi ý trang phục', value: concept.wardrobeGuidance },
                    ]
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.label}>
                          <dt>{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              </section>
            )}
            {Object.values(pkg.decor || {}).some((value) => value?.trim()) && (
              <section className="concept-detail-section">
                <h2>Decor &amp; bối cảnh</h2>
                <dl className="concept-decor-grid">
                  {Object.entries(conceptDecorLabels).map(([field, label]) => {
                    const value = pkg.decor?.[field as keyof typeof conceptDecorLabels];
                    return value?.trim() ? (
                      <div key={field}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ) : null;
                  })}
                </dl>
              </section>
            )}
            {!!pkg.studioSupport?.length && (
              <section className="concept-detail-section">
                <h2>Studio đồng hành cùng bạn</h2>
                <div className="concept-support-grid">
                  {pkg.studioSupport.map((item, index) => (
                    <article key={index}>
                      <Check size={20} aria-hidden="true" />
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {!!showcase?.images.length && (
              <section className="concept-detail-section">
                <h2>{showcase.title || 'Phong cách bộ ảnh'}</h2>
                {showcase.description && (
                  <p className="concept-section-intro">{showcase.description}</p>
                )}
                <div className="concept-inspiration-grid concept-showcase-grid">
                  {showcase.images.map((photo, index) => (
                    <figure key={`${photo.url}-${index}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoGroup('showcase');
                          setPhotoIndex(index);
                        }}
                        aria-label={`Xem ảnh giới thiệu ${index + 1}: ${photo.caption || pkg.name}`}
                      >
                        <CustomerImage
                          src={photo.url}
                          alt={photo.caption || pkg.name}
                          width={650}
                          height={650}
                        />
                      </button>
                      {photo.caption && <figcaption>{photo.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}
            {!!gallery.length && (
              <section className="concept-detail-section">
                <h2>Cảm hứng cho bộ ảnh của bạn</h2>
                <p className="concept-section-intro">Một concept, nhiều góc nhìn và sắc thái.</p>
                <div className="concept-inspiration-grid concept-reference-grid">
                  {gallery.map((photo, index) => (
                    <figure key={`${photo.url}-${index}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoGroup('gallery');
                          setPhotoIndex(index);
                        }}
                        aria-label={`Xem ảnh ${index + 1}: ${photo.caption || concept.name}`}
                      >
                        <CustomerImage
                          src={photo.url}
                          alt={photo.caption || `${concept.name} — ảnh ${index + 1}`}
                          width={360}
                          height={450}
                        />
                      </button>
                      {photo.caption && <figcaption>{photo.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}
            <section className="concept-detail-section concept-package-inclusions">
              <div>
                <h2>Bộ ảnh bạn nhận được</h2>
                <ul>
                  <li>
                    <strong>{pkg.retouchQuota} ảnh chỉnh sửa hoàn thiện.</strong>
                  </li>
                  {pkg.costumeCount > 0 && (
                    <li>{pkg.costumeCount} bộ trang phục trong danh mục gói.</li>
                  )}
                  <li>Album riêng để xem ảnh, chọn và góp ý.</li>
                  <li>Hai vòng góp ý chỉnh sửa miễn phí.</li>
                </ul>
                {Object.values(pkg.delivery || {}).some((value) => value?.trim()) && (
                  <dl className="concept-delivery-facts">
                    {Object.entries(conceptDeliveryLabels).map(([field, label]) => {
                      const value = pkg.delivery?.[field as keyof typeof conceptDeliveryLabels];
                      return value?.trim() ? (
                        <div key={field}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ) : null;
                    })}
                  </dl>
                )}
              </div>
              <div>
                <h2>Chuẩn bị cho buổi chụp</h2>
                <p>
                  {concept.preparation ||
                    'Chuẩn bị trang phục và những ảnh tham khảo bạn yêu thích để trao đổi cùng ekip trước buổi chụp.'}
                </p>
                <p>
                  Trao đổi trước với studio nếu bạn có yêu cầu riêng về bối cảnh hoặc phong cách.
                </p>
              </div>
            </section>
            <section className="concept-detail-section">
              <h2>Chi phí và thanh toán</h2>
              <dl className="concept-package-charges">
                {[
                  { label: 'Giá gói', value: money(pkg.price) },
                  { label: 'Cọc 30% khi đặt lịch', value: money(Math.ceil(pkg.price * 0.3)) },
                  { label: 'Ảnh chỉnh sửa thêm', value: `${money(pkg.extraPhotoPrice)} / ảnh` },
                ].map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="concept-detail-note">Giữ chỗ 15 phút kể từ lúc tạo QR.</p>
            </section>
            <section className="concept-detail-section">
              <h2>Đổi và hủy lịch</h2>
              <p>Một lần đổi lịch miễn phí trước 48 giờ.</p>
              <ul>
                <li>Trước 48 giờ: hoàn cọc.</li>
                <li>Từ 24–48 giờ: giữ 50% cọc.</li>
                <li>Dưới 24 giờ: giữ toàn bộ cọc.</li>
              </ul>
            </section>
            <footer className="concept-package-actions">
              <div>
                <button className="concept-primary-action" onClick={selectPackage}>
                  Chọn gói này <ArrowRight size={22} aria-hidden="true" />
                </button>
                <p>Tiếp theo: chọn ngày và giờ chụp.</p>
              </div>
            </footer>
            <Dialog
              open={photoIndex !== null}
              onOpenChange={(open) => {
                if (!open) setPhotoIndex(null);
              }}
            >
              <DialogContent
                className="concept-inspiration-viewer"
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight')
                    setPhotoIndex((index) => ((index ?? 0) + 1) % viewerPhotos.length);
                  if (event.key === 'ArrowLeft')
                    setPhotoIndex(
                      (index) => ((index ?? 0) - 1 + viewerPhotos.length) % viewerPhotos.length,
                    );
                }}
              >
                <DialogTitle className="sr-only">
                  {photoGroup === 'showcase' ? 'Bộ ảnh giới thiệu' : 'Ảnh tham khảo'} {concept.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Dùng phím mũi tên để xem ảnh tiếp theo hoặc trước đó.
                </DialogDescription>
                {photoIndex !== null && viewerPhotos[photoIndex] && (
                  <>
                    <img
                      src={viewerPhotos[photoIndex].url}
                      alt={viewerPhotos[photoIndex].caption || concept.name}
                    />
                    <div className="concept-viewer-controls">
                      <button
                        onClick={() =>
                          setPhotoIndex(
                            (photoIndex - 1 + viewerPhotos.length) % viewerPhotos.length,
                          )
                        }
                        aria-label="Ảnh trước"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <p>
                        {viewerPhotos[photoIndex].caption}{' '}
                        <span>
                          {photoIndex + 1} / {viewerPhotos.length}
                        </span>
                      </p>
                      <button
                        onClick={() => setPhotoIndex((photoIndex + 1) % viewerPhotos.length)}
                        aria-label="Ảnh tiếp theo"
                      >
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </PublicSiteLayout>
  );
}

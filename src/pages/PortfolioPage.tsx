import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { portfolioImages } from '../assets/images/portfolio-images';
import { toast } from 'react-toastify';
import Logo from '../components/atoms/Logo';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { customerService } from '../services/customerService';
import { feedbackService } from '../services/feedbackService';
import { packageService } from '../services/packageService';
import type { Package } from '../types';
import { CustomerButton } from '../components/customer/CustomerButton';
import {
  CustomerFormField,
  CustomerInput,
  CustomerTextarea,
} from '../components/customer/CustomerFields';
import { CustomerSurface } from '../components/customer/CustomerSurface';
import { CustomerPrice } from '../components/customer/CustomerPrice';
import { CustomerPackageCard } from '../components/customer/CustomerPackageCard';
import { CustomerRatingInput } from '../components/customer/CustomerRatingInput';
import { CustomerImage } from '../components/customer/CustomerImage';
import '../styles/customer-portfolio.css';

/* ── Static content ──────────────────────────── */

const AboutImage = [
  portfolioImages.tnv03816,
  portfolioImages.tnv05927,
  portfolioImages.tnv07899,
  portfolioImages.tnv00817,
  portfolioImages.tnv06047,
  portfolioImages.hdz07441,
  portfolioImages.pbi00061,
  portfolioImages.may01381,
  portfolioImages.pbi01583,
  portfolioImages.pbi01850,
  portfolioImages.tnv00451,
  portfolioImages.tnv06242,
];
const services = [
  {
    icon: '📷',
    title: 'Chụp ảnh kỷ yếu',
    desc: 'Lưu giữ trọn vẹn năm cuối cấp với những khung hình điện ảnh, concept đa dạng phù hợp từng lớp.',
  },
  {
    icon: '🎬',
    title: 'Quay phim',
    desc: 'Video kỷ yếu chuẩn điện ảnh 4K, dựng theo phong cách MV cùng âm nhạc và màu phim chuyên nghiệp.',
  },
  {
    icon: '🖌️',
    title: 'Hậu kỳ & in ấn',
    desc: 'Ảnh được blend màu chuyên nghiệp, chỉnh sửa theo yêu cầu. Album in cao cấp với giấy ảnh chất lượng, thiết kế tinh tế.',
  },
  {
    icon: '👔',
    title: 'Trang phục',
    desc: 'Hơn 200 mẫu trang phục: cử nhân, áo dài, học sinh, vintage, cosplay… phù hợp đa dạng concept.',
  },
  {
    icon: '🎨',
    title: 'Trang trí & đạo cụ',
    desc: 'Cung cấp các đạo cụ, phông nền, và trang trí phù hợp với từng concept chụp.',
  },
  {
    icon: '💡',
    title: 'Tư vấn & lên ý tưởng',
    desc: 'Đội ngũ tư vấn giàu kinh nghiệm hỗ trợ lớp lên ý tưởng concept, lựa chọn trang phục và địa điểm chụp phù hợp.',
  },
];

const concepts = [
  { tag: 'Cử nhân', tone: 'from-amber-400 to-orange-500', icon: '🎓' },
  { tag: 'Áo dài Việt', tone: 'from-rose-400 to-pink-500', icon: '👘' },
  { tag: 'Cinematic', tone: 'from-cyan-400 to-blue-500', icon: '🎬' },
  { tag: 'Học đường', tone: 'from-emerald-400 to-teal-500', icon: '🏫' },
  { tag: 'Outdoor', tone: 'from-lime-400 to-green-500', icon: '🌿' },
];

const steps = [
  {
    n: '01',
    title: 'Tư vấn & chốt concept',
    desc: 'Lắng nghe ý tưởng của lớp, đề xuất concept – địa điểm – trang phục phù hợp ngân sách.',
  },
  {
    n: '02',
    title: 'Lên lịch & chuẩn bị',
    desc: 'Khảo sát địa điểm, chuẩn bị trang phục, đạo cụ, ekip. Phụ huynh có thể theo dõi lịch chụp online.',
  },
  {
    n: '03',
    title: 'Buổi chụp & quay',
    desc: 'Ekip 3-4 người (photographer, quay phim) đồng hành cùng lớp xuyên suốt.',
  },
  {
    n: '04',
    title: 'Hậu kỳ & bàn giao',
    desc: 'Chỉnh sửa màu theo yêu cầu, bàn giao ảnh và video sau khoảng 1-2 tuần sau buổi chụp.',
  },
];

const durationLabel: Record<NonNullable<Package['duration']>, string> = {
  full_day: 'Buổi chụp full day (1 ngày)',
  half_day: 'Buổi chụp 1/2 ngày',
  two_thirds_day: 'Buổi chụp 2/3 ngày',
};

const editingScopeLabel: Record<NonNullable<Package['editingScope']>, string> = {
  full: 'Hậu kỳ blend màu toàn bộ ảnh',
  partial: 'Hậu kỳ blend màu ảnh chọn lọc',
};

interface PackageDisplay {
  id: string;
  name: string;
  amount: number;
  note: string;
  items: string[];
  featured: boolean;
}

const toDisplay = (list: Package[]): PackageDisplay[] => {
  if (!list.length) return [];
  // Featured = first package explicitly marked isPopular by admin
  const featuredId = list.find((p) => p.isPopular)?._id;
  return list.map((p) => {
    const items: string[] = [];
    if (p.duration) items.push(durationLabel[p.duration]);
    if (p.crewRatio) items.push(`Ekip: ${p.crewRatio}`);
    if (p.studentsPerCrew) items.push(`${p.studentsPerCrew} bạn / ekip`);
    if (p.editingScope) items.push(editingScopeLabel[p.editingScope]);
    if (p.deliveryDays) items.push(`Bàn giao trong ${p.deliveryDays} ngày`);
    if (p.costumes && p.costumes.length) {
      const names = p.costumes.map((c) => c?.name?.trim()).filter((n): n is string => Boolean(n));
      if (names.length) {
        items.push(`Trang phục: ${names.join(', ')}`);
      } else {
        items.push(`${p.costumes.length} loại trang phục đi kèm`);
      }
    }
    if (!items.length) items.push('Liên hệ Yume để biết thêm chi tiết');
    return {
      id: p._id,
      name: p.name,
      amount: p.pricePerMember,
      note: p.description?.trim() || 'Báo giá tham khảo, tư vấn riêng theo lớp',
      items,
      featured: p._id === featuredId,
    };
  });
};

const testimonials = [
  {
    name: 'Lớp 12A1 – THPT Phan Đình Phùng',
    role: 'Hà Nội',
    rating: 5,
    quote:
      'Ekip cực kỳ chuyên nghiệp, ảnh ra siêu đẹp và đúng concept tụi mình mong muốn. Cả lớp đều thích!',
  },
  {
    name: 'Lớp K65 – ĐH Bách Khoa',
    role: 'Hà Nội',
    rating: 5,
    quote:
      'Bọn mình book gói trọn gói, video kỷ yếu xem đi xem lại không chán. Cảm ơn Yume rất nhiều!',
  },
  {
    name: 'Lớp 12A5 – THPT Chu Văn An',
    role: 'Hà Nội',
    rating: 5,
    quote:
      'Makeup xinh, ekip nhiệt tình hỗ trợ pose dáng. Album in chất lượng giấy đẹp, đáng đồng tiền.',
  },
];

/* ── Helpers ─────────────────────────────────── */

interface FeedbackForm {
  phone: string;
  crewRating: number;
  albumRating: number;
  crewDesc: string;
  albumDesc: string;
  suggestion: string;
}

const initialForm: FeedbackForm = {
  phone: '',
  crewRating: 5,
  albumRating: 5,
  crewDesc: '',
  albumDesc: '',
  suggestion: '',
};

/* ── Page ────────────────────────────────────── */

const PortfolioPage = () => {
  const { hash } = useLocation();
  const [classCount, setClassCount] = useState<number | null>(null);
  const [schoolCount, setSchoolCount] = useState<number | null>(null);
  const [pkgList, setPkgList] = useState<Package[] | null>(null);
  const [pkgError, setPkgError] = useState('');
  const [form, setForm] = useState<FeedbackForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  useEffect(() => {
    const updateScrollToTop = () => setShowScrollToTop(window.scrollY > 480);
    updateScrollToTop();
    window.addEventListener('scroll', updateScrollToTop, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollToTop);
  }, []);

  useEffect(() => {
    if (!hash) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, pkgList]);

  // Fetch real stats from public API
  useEffect(() => {
    customerService
      .listPublic()
      .then((list) => {
        setClassCount(list.length);
        const schools = new Set(list.map((c) => (c.school || '').trim()).filter(Boolean));
        setSchoolCount(schools.size);
      })
      .catch(() => {
        setClassCount(0);
        setSchoolCount(0);
      });
  }, []);

  const loadPackages = useCallback(async () => {
    setPkgList(null);
    setPkgError('');
    try {
      setPkgList(await packageService.listPublic());
    } catch {
      setPkgError('Không tải được bảng giá. Vui lòng thử lại hoặc liên hệ studio để được tư vấn.');
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const displayPackages = useMemo<PackageDisplay[]>(() => {
    if (pkgList === null) return [];
    const mapped = toDisplay(pkgList);
    return mapped.length ? mapped : [];
  }, [pkgList]);

  const stats = useMemo(
    () => [
      { num: classCount !== null ? `${classCount}+` : '—', label: 'Lớp đã đồng hành' },
      { num: schoolCount !== null ? `${schoolCount}+` : '—', label: 'Trường đối tác' },
      { num: '50K+', label: 'Khung hình đã chụp' },
      { num: '5+', label: 'Năm kinh nghiệm' },
    ],
    [classCount, schoolCount],
  );

  const handleSubmitFeedback = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.crewDesc.trim() || !form.albumDesc.trim()) {
      toast.warn('Vui lòng chia sẻ cảm nhận về ekip và album.');
      return;
    }
    setSubmitting(true);
    try {
      await feedbackService.submit({
        phone: form.phone || undefined,
        crewFeedback: { rating: form.crewRating, description: form.crewDesc.trim() },
        albumFeedback: { rating: form.albumRating, description: form.albumDesc.trim() },
        suggestion: form.suggestion || undefined,
      });
      setSubmitted(true);
      setForm(initialForm);
      toast.success('Cảm ơn bạn đã gửi cảm nhận tới Yume!');
    } catch {
      toast.error('Không gửi được cảm nhận, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicSiteLayout source="portfolio">
      <div className="customer-portfolio">
        <section id="top" className="customer-portfolio__band">
          <div className="customer-portfolio__container customer-portfolio__hero">
            <div>
              <p className="customer-portfolio__eyebrow">Studio chụp ảnh kỷ yếu chuyên nghiệp</p>
              <h1 className="customer-page-title customer-portfolio__title">
                Lưu giữ thanh xuân
                <br />
                qua từng khung hình
              </h1>
              <p className="customer-portfolio__copy">
                Yume Studio đồng hành cùng các lớp 12, sinh viên năm cuối tạo nên những bộ ảnh và
                video kỷ yếu chuẩn điện ảnh – nơi mỗi nụ cười, mỗi cái ôm đều trở thành kỷ niệm
                không bao giờ phai.
              </p>
              <div className="customer-portfolio__actions">
                <CustomerButton asChild>
                  <Link to="/booking/start?source=portfolio">Bắt đầu đặt lịch</Link>
                </CustomerButton>
                <CustomerButton asChild variant="secondary">
                  <Link to="/consultation">Nhận tư vấn</Link>
                </CustomerButton>
                <CustomerButton asChild variant="secondary">
                  <Link to="/costumes">Tra cứu trang phục</Link>
                </CustomerButton>
              </div>
              <div className="customer-portfolio__stats">
                {stats.map((stat) => (
                  <div key={stat.label} className="customer-portfolio__stat">
                    <strong>{stat.num}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="customer-portfolio__hero-images">
              {[portfolioImages.tnv00817, portfolioImages.tnv00048, portfolioImages.tnv07899].map(
                (image, index) => (
                  <CustomerImage
                    key={image.original.file}
                    {...image}
                    className="customer-portfolio__hero-image"
                    alt={index === 0 ? 'Ảnh kỷ yếu cùng Yume Studio' : ''}
                    priority={index === 0}
                    sizes={
                      index === 0
                        ? '(min-width: 1280px) 341px, (min-width: 1128px) calc((100vw - 112px) * 0.291667), (min-width: 744px) calc((100vw - 56px) * 0.583333), calc((100vw - 40px) * 0.583333)'
                        : '(min-width: 1280px) 243px, (min-width: 1128px) calc((100vw - 112px) * 0.208333), (min-width: 744px) calc((100vw - 56px) * 0.416667), calc((100vw - 40px) * 0.416667)'
                    }
                  />
                ),
              )}
            </div>
          </div>
        </section>

        <section id="about" className="customer-portfolio__band">
          <div className="customer-portfolio__container customer-portfolio__split">
            <div>
              <p className="customer-portfolio__eyebrow">Về Yume Studio</p>
              <h2 className="customer-portfolio__heading">Mỗi bộ ảnh là một câu chuyện</h2>
              <p className="customer-portfolio__copy">
                Chúng tôi không chỉ chụp ảnh – chúng tôi kể lại tuổi 18 của bạn bằng ngôn ngữ điện
                ảnh. Từ ánh sáng, màu sắc đến từng khoảnh khắc tự nhiên nhất, Yume Studio biến buổi
                chụp kỷ yếu thành một ngày đáng nhớ trong đời.
              </p>
              <p className="customer-portfolio__copy">
                Hơn 5 năm đồng hành cùng các lớp và sinh viên trên khắp cả nước, chúng tôi tự hào là
                studio được nhiều trường lựa chọn nhờ sự chỉn chu trong từng tiểu tiết.
              </p>
              <ul className="customer-portfolio__features">
                {[
                  'Ekip 5–8 người, tận tâm trong từng buổi chụp',
                  'Concept đa dạng, cập nhật xu hướng mới mỗi mùa',
                  'Trả ảnh đúng hẹn, chỉnh sửa theo yêu cầu',
                  'Hệ thống quản lý lịch & trang phục online minh bạch',
                ].map((item) => (
                  <li key={item}>
                    <span aria-hidden="true">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="customer-portfolio__about-mosaic">
                {AboutImage.map((image) => (
                  <CustomerImage
                    key={image.original.file}
                    {...image}
                    alt=""
                    sizes="(min-width: 1280px) 187px, (min-width: 1128px) calc((100vw - 160px) / 6), (min-width: 744px) calc((100vw - 144px) / 6), calc((100vw - 64px) / 3)"
                  />
                ))}
                <div className="customer-portfolio__about-logo">
                  <Logo size={120} />
                </div>
              </div>
              <div className="customer-portfolio__about-facts">
                <span>Khách hàng hài lòng · 98%</span>
                <span>Hàng trăm lớp đã chọn</span>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="customer-portfolio__band customer-portfolio__band--soft">
          <div className="customer-portfolio__container">
            <div className="customer-portfolio__intro">
              <p className="customer-portfolio__eyebrow">Dịch vụ</p>
              <h2 className="customer-portfolio__heading">Trọn gói cho ngày kỷ yếu hoàn hảo</h2>
              <p className="customer-portfolio__copy">
                Từ chụp ảnh, quay phim đến trang phục và hậu kỳ, Yume Studio cung cấp giải pháp toàn
                diện để biến ngày kỷ yếu của bạn thành một trải nghiệm đáng nhớ và trọn vẹn nhất.
              </p>
            </div>
            <div className="customer-portfolio__grid customer-portfolio__grid--services">
              {services.map((service) => (
                <CustomerSurface key={service.title} as="article">
                  <div className="customer-portfolio__service-icon" aria-hidden="true">
                    {service.icon}
                  </div>
                  <h3 className="customer-portfolio__card-title">{service.title}</h3>
                  <p className="customer-portfolio__card-copy">{service.desc}</p>
                </CustomerSurface>
              ))}
            </div>
          </div>
        </section>

        <section id="gallery" className="customer-portfolio__band">
          <div className="customer-portfolio__container">
            <div className="customer-portfolio__intro">
              <p className="customer-portfolio__eyebrow">Concept nổi bật</p>
              <h2 className="customer-portfolio__heading">
                Đa dạng phong cách – chọn “chất” riêng cho lớp
              </h2>
            </div>
            <div className="customer-portfolio__grid customer-portfolio__grid--concepts">
              {concepts.map((concept) => (
                <Link
                  key={concept.tag}
                  to={'/booking/start?source=concepts&concept=' + encodeURIComponent(concept.tag)}
                  aria-label={'Chọn concept ' + concept.tag + ' và bắt đầu đặt lịch'}
                  className="customer-portfolio__concept"
                >
                  <div className="customer-portfolio__concept-illustration" aria-hidden="true">
                    {concept.icon}
                  </div>
                  <strong>{concept.tag}</strong>
                  <span className="customer-portfolio__caption">Chọn concept →</span>
                </Link>
              ))}
            </div>
            <div className="customer-portfolio__actions customer-portfolio__actions--center">
              <CustomerButton asChild variant="text">
                <Link to="/consultation">Nhận tư vấn về concept →</Link>
              </CustomerButton>
            </div>
          </div>
        </section>

        <section id="process" className="customer-portfolio__band customer-portfolio__band--soft">
          <div className="customer-portfolio__container">
            <div className="customer-portfolio__intro">
              <p className="customer-portfolio__eyebrow">Quy trình</p>
              <h2 className="customer-portfolio__heading">4 bước – nhẹ nhàng, minh bạch</h2>
            </div>
            <div className="customer-portfolio__grid customer-portfolio__grid--process">
              {steps.map((step) => (
                <CustomerSurface key={step.n} as="article">
                  <p className="customer-portfolio__step">{step.n}</p>
                  <h3 className="customer-portfolio__card-title">{step.title}</h3>
                  <p className="customer-portfolio__card-copy">{step.desc}</p>
                </CustomerSurface>
              ))}
            </div>
          </div>
        </section>

        <section id="packages" className="customer-portfolio__band">
          <div className="customer-portfolio__container">
            <div className="customer-portfolio__intro">
              <p className="customer-portfolio__eyebrow">Báo giá</p>
              <h2 className="customer-portfolio__heading">Gói dịch vụ phù hợp mọi lớp</h2>
              <p className="customer-portfolio__copy">
                Báo giá tham khảo. Yume sẽ tư vấn riêng cho từng lớp dựa trên concept và quy mô.
              </p>
            </div>
            {pkgList === null ? (
              pkgError ? (
                <CustomerSurface className="customer-portfolio__message" role="alert">
                  <h3 className="customer-section-title">Chưa thể tải bảng giá</h3>
                  <p className="customer-error">{pkgError}</p>
                  <div className="customer-portfolio__actions">
                    <CustomerButton
                      type="button"
                      variant="secondary"
                      onClick={() => void loadPackages()}
                    >
                      Thử lại
                    </CustomerButton>
                    <CustomerButton asChild>
                      <Link to="/consultation">Nhận tư vấn</Link>
                    </CustomerButton>
                  </div>
                </CustomerSurface>
              ) : (
                <div
                  className="customer-portfolio__grid customer-portfolio__grid--packages"
                  role="status"
                  aria-live="polite"
                  aria-label="Đang tải gói dịch vụ"
                >
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="customer-portfolio__skeleton" aria-hidden="true" />
                  ))}
                </div>
              )
            ) : displayPackages.length === 0 ? (
              <CustomerSurface className="customer-portfolio__message customer-portfolio__empty">
                <h3 className="customer-section-title">Bảng giá đang được cập nhật</h3>
                <p className="customer-portfolio__copy">
                  Chia sẻ quy mô lớp và ý tưởng chụp với studio để nhận gợi ý gói phù hợp trong thời
                  gian này.
                </p>
                <div className="customer-portfolio__actions customer-portfolio__actions--center">
                  <CustomerButton asChild variant="secondary">
                    <Link to="/consultation">Nhận tư vấn</Link>
                  </CustomerButton>
                  <CustomerButton asChild>
                    <Link to="/booking/start?source=pricing">Bắt đầu đặt lịch</Link>
                  </CustomerButton>
                </div>
              </CustomerSurface>
            ) : (
              <div className="customer-portfolio__grid customer-portfolio__grid--packages">
                {displayPackages.map((item) => (
                  <CustomerPackageCard
                    key={item.id}
                    name={item.name}
                    price={
                      item.amount > 0 ? (
                        <CustomerPrice amount={item.amount} unit="/ bạn" />
                      ) : (
                        'Liên hệ'
                      )
                    }
                    note={item.note}
                    featured={item.featured}
                    featuredLabel="PHỔ BIẾN"
                    actions={
                      <>
                        <CustomerButton asChild>
                          <Link
                            to={
                              '/booking/start?source=pricing&package=' + encodeURIComponent(item.id)
                            }
                          >
                            Bắt đầu đặt lịch
                          </Link>
                        </CustomerButton>
                        <CustomerButton asChild variant="secondary">
                          <Link to="/consultation">Nhận tư vấn</Link>
                        </CustomerButton>
                      </>
                    }
                  >
                    <ul>
                      {item.items.map((feature) => (
                        <li key={feature}>✓ {feature}</li>
                      ))}
                    </ul>
                  </CustomerPackageCard>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="customer-portfolio__band customer-portfolio__band--soft">
          <div className="customer-portfolio__container">
            <div className="customer-portfolio__intro">
              <p className="customer-portfolio__eyebrow">Cảm nhận khách hàng</p>
              <h2 className="customer-portfolio__heading">Lớp đã chụp cùng Yume nói gì?</h2>
            </div>
            <div className="customer-portfolio__grid customer-portfolio__grid--reviews">
              {testimonials.map((review) => (
                <CustomerSurface
                  key={review.name}
                  as="article"
                  className="customer-portfolio__testimonial"
                >
                  <p
                    className="customer-portfolio__stars"
                    role="img"
                    aria-label={review.rating + ' trên 5 sao'}
                  >
                    {'★'.repeat(review.rating)}
                  </p>
                  <blockquote>“{review.quote}”</blockquote>
                  <p>
                    <strong>{review.name}</strong>
                    <br />
                    <span className="customer-portfolio__caption">{review.role}</span>
                  </p>
                </CustomerSurface>
              ))}
            </div>
          </div>
        </section>

        <section id="feedback" className="customer-portfolio__band">
          <div className="customer-portfolio__container">
            <div className="customer-portfolio__feedback">
              <div className="customer-portfolio__intro">
                <p className="customer-portfolio__eyebrow">Chia sẻ cảm nhận</p>
                <h2 className="customer-portfolio__heading">
                  Đã chụp cùng Yume? Hãy cho chúng mình biết!
                </h2>
                <p className="customer-portfolio__copy">
                  Cảm nhận của bạn là động lực để Yume hoàn thiện mỗi ngày.
                </p>
              </div>
              {submitted ? (
                <CustomerSurface className="customer-portfolio__message customer-portfolio__empty">
                  <h3 className="customer-section-title">Đã nhận cảm nhận của bạn!</h3>
                  <p className="customer-portfolio__copy">
                    Cảm ơn bạn rất nhiều. Yume sẽ tiếp tục nỗ lực để mang đến những trải nghiệm tốt
                    hơn.
                  </p>
                  <div className="customer-portfolio__actions customer-portfolio__actions--center">
                    <CustomerButton
                      type="button"
                      variant="secondary"
                      onClick={() => setSubmitted(false)}
                    >
                      Gửi cảm nhận khác
                    </CustomerButton>
                  </div>
                </CustomerSurface>
              ) : (
                <CustomerSurface padding="compact" className="customer-portfolio__message">
                  <form
                    onSubmit={handleSubmitFeedback}
                    className="customer-portfolio__feedback-form"
                  >
                    <CustomerFormField label="Số điện thoại (tuỳ chọn)" htmlFor="portfolio-phone">
                      <CustomerInput
                        id="portfolio-phone"
                        type="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(event) => setForm({ ...form, phone: event.target.value })}
                        placeholder="VD: 098 765 4321"
                      />
                    </CustomerFormField>
                    <div className="customer-portfolio__ratings">
                      <CustomerRatingInput
                        label="Đánh giá ekip chụp"
                        value={form.crewRating}
                        onChange={(value) => setForm({ ...form, crewRating: value })}
                        disabled={submitting}
                      />
                      <CustomerRatingInput
                        label="Đánh giá album / video"
                        value={form.albumRating}
                        onChange={(value) => setForm({ ...form, albumRating: value })}
                        disabled={submitting}
                      />
                    </div>
                    <CustomerFormField label="Cảm nhận về ekip" htmlFor="portfolio-crew" required>
                      <CustomerTextarea
                        id="portfolio-crew"
                        rows={3}
                        value={form.crewDesc}
                        onChange={(event) => setForm({ ...form, crewDesc: event.target.value })}
                        placeholder="Photographer, makeup, stylist… đã hỗ trợ bạn ra sao?"
                        required
                      />
                    </CustomerFormField>
                    <CustomerFormField
                      label="Cảm nhận về album / video"
                      htmlFor="portfolio-album"
                      required
                    >
                      <CustomerTextarea
                        id="portfolio-album"
                        rows={3}
                        value={form.albumDesc}
                        onChange={(event) => setForm({ ...form, albumDesc: event.target.value })}
                        placeholder="Chất lượng ảnh, màu sắc, layout, video…"
                        required
                      />
                    </CustomerFormField>
                    <CustomerFormField label="Góp ý thêm cho Yume" htmlFor="portfolio-suggestion">
                      <CustomerTextarea
                        id="portfolio-suggestion"
                        rows={2}
                        value={form.suggestion}
                        onChange={(event) => setForm({ ...form, suggestion: event.target.value })}
                        placeholder="Yume cần cải thiện điều gì?"
                      />
                    </CustomerFormField>
                    <div className="customer-portfolio__actions">
                      <CustomerButton asChild variant="text">
                        <Link to="/feedback">Mở trang phản hồi đầy đủ →</Link>
                      </CustomerButton>
                      <CustomerButton type="submit" disabled={submitting}>
                        {submitting ? 'Đang gửi...' : 'Gửi cảm nhận'}
                      </CustomerButton>
                    </div>
                  </form>
                </CustomerSurface>
              )}
            </div>
          </div>
        </section>

        <section id="contact" className="customer-portfolio__band">
          <div className="customer-portfolio__container">
            <CustomerSurface className="customer-portfolio__empty">
              <h2 className="customer-portfolio__heading">Bạn cần tư vấn về buổi chụp?</h2>
              <p className="customer-portfolio__copy">
                Chọn kênh liên hệ để trao đổi về concept, quy mô lớp và ngân sách dự kiến.
              </p>
              <div className="customer-portfolio__actions customer-portfolio__actions--center">
                <CustomerButton asChild>
                  <Link to="/booking/start?source=portfolio">Bắt đầu đặt lịch</Link>
                </CustomerButton>
                <CustomerButton asChild variant="secondary">
                  <a href="tel:0869318118">Gọi 0869318118</a>
                </CustomerButton>
                <CustomerButton asChild variant="secondary">
                  <a href="mailto:hello@yumestudio.vn">Email hello@yumestudio.vn</a>
                </CustomerButton>
                <CustomerButton asChild variant="secondary">
                  <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
                    Facebook / Zalo
                  </a>
                </CustomerButton>
              </div>
              <p className="customer-portfolio__copy">
                📍 Hà Nội, Việt Nam · 🕒 T2 – CN: 8:00 – 20:00
              </p>
            </CustomerSurface>
          </div>
        </section>
        {showScrollToTop && (
          <CustomerButton
            type="button"
            variant="secondary"
            aria-label="Về đầu trang"
            title="Về đầu trang"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'instant'
                  : 'smooth',
              })
            }
            className="customer-portfolio__scroll"
          >
            <ArrowUp aria-hidden="true" />
          </CustomerButton>
        )}
      </div>
    </PublicSiteLayout>
  );
};

export default PortfolioPage;

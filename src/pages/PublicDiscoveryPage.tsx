import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { clientPortalEnabled } from '../config/features';
import { packageService } from '../services/packageService';
import type { Package } from '../types';
import { CustomerButton } from '../components/customer/CustomerButton';
import { CustomerSurface } from '../components/customer/CustomerSurface';
import { CustomerPrice } from '../components/customer/CustomerPrice';
import { CustomerPackageCard } from '../components/customer/CustomerPackageCard';
import '../styles/customer-portfolio.css';

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
        items.push(`Đã bao gồm trang phục: ${names.join(', ')}`);
      } else {
        items.push(`Đã bao gồm ${p.costumes.length} loại trang phục đi kèm`);
      }
    } else {
      items.push('Đã bao gồm trang phục · Studio sẽ tư vấn chi tiết');
    }
    items.push('Studio tư vấn mẫu và size trang phục khi chốt lịch');
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

function ServiceSection() {
  return (
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
  );
}

function ConceptSection() {
  return (
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
              to={
                clientPortalEnabled
                  ? '/booking/start?source=concepts&concept=' + encodeURIComponent(concept.tag)
                  : '/pricing'
              }
              aria-label={
                clientPortalEnabled
                  ? 'Đặt với concept ' + concept.tag
                  : 'Xem bảng giá cho concept ' + concept.tag
              }
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
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
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
  );
}

function PricingSection() {
  const [pkgList, setPkgList] = useState<Package[] | null>(null);
  const [pkgError, setPkgError] = useState('');
  const loadPackages = useCallback(async () => {
    setPkgList(null);
    setPkgError('');
    try {
      setPkgList(await packageService.listPublic());
    } catch {
      setPkgError('Không tải được bảng giá. Vui lòng thử lại.');
    }
  }, []);
  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);
  const displayPackages = useMemo(() => toDisplay(pkgList || []), [pkgList]);
  return (
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
              {clientPortalEnabled && (
                <CustomerButton asChild>
                  <Link to="/booking/start?source=pricing">Đặt lịch</Link>
                </CustomerButton>
              )}
            </div>
          </CustomerSurface>
        ) : (
          <div className="customer-portfolio__grid customer-portfolio__grid--packages">
            {displayPackages.map((item) => (
              <CustomerPackageCard
                key={item.id}
                name={item.name}
                price={
                  item.amount > 0 ? <CustomerPrice amount={item.amount} unit="/ bạn" /> : 'Liên hệ'
                }
                note={item.note}
                featured={item.featured}
                featuredLabel="PHỔ BIẾN"
                actions={
                  <>
                    {clientPortalEnabled && (
                      <CustomerButton asChild>
                        <Link
                          to={
                            '/booking/start?source=pricing&package=' + encodeURIComponent(item.id)
                          }
                        >
                          Đặt lịch
                        </Link>
                      </CustomerButton>
                    )}
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
  );
}

export default function PublicDiscoveryPage({
  page,
}: {
  page: 'services' | 'concepts' | 'pricing';
}) {
  const titles = {
    services: 'Dịch vụ chụp ảnh',
    concepts: 'Concept chụp ảnh',
    pricing: 'Bảng giá dịch vụ',
  };
  return (
    <PublicSiteLayout source={page}>
      <div className="customer-portfolio">
        <div className="customer-portfolio__container customer-discovery-heading">
          <nav aria-label="Đường dẫn trang">
            <Link to="/services">Khám phá dịch vụ</Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{titles[page]}</span>
          </nav>
          <h1 className="customer-page-title">{titles[page]}</h1>
        </div>
        {page === 'services' && (
          <>
            <ServiceSection />
            <ProcessSection />
            <div className="customer-portfolio__container customer-discovery-actions">
              <CustomerButton asChild>
                <Link to="/pricing">Xem bảng giá</Link>
              </CustomerButton>
              {clientPortalEnabled && (
                <CustomerButton asChild variant="secondary">
                  <Link to="/booking/start?source=services">Đặt lịch</Link>
                </CustomerButton>
              )}
            </div>
          </>
        )}
        {page === 'concepts' && <ConceptSection />}
        {page === 'pricing' && <PricingSection />}
      </div>
    </PublicSiteLayout>
  );
}

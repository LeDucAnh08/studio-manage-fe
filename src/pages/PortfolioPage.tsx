import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portfolioImages } from '../assets/images/portfolio-images';
import Logo from '../components/atoms/Logo';
import PublicSiteLayout from '../components/Layout/PublicSiteLayout';
import { customerService } from '../services/customerService';
import { clientPortalEnabled } from '../config/features';
import { CustomerButton } from '../components/customer/CustomerButton';
import { CustomerSurface } from '../components/customer/CustomerSurface';
import { CustomerImage } from '../components/customer/CustomerImage';
import '../styles/customer-portfolio.css';

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

export default function PortfolioPage() {
  const [counts, setCounts] = useState({ classes: '—', schools: '—' });
  useEffect(() => {
    let active = true;
    customerService
      .listPublic()
      .then((list) => {
        if (active)
          setCounts({
            classes: `${list.length}+`,
            schools: `${new Set(list.map((c) => c.school?.trim()).filter(Boolean)).size}+`,
          });
      })
      .catch(() => {
        if (active) setCounts({ classes: '—', schools: '—' });
      });
    return () => {
      active = false;
    };
  }, []);
  const stats = [
    { num: counts.classes, label: 'Lớp đã đồng hành' },
    { num: counts.schools, label: 'Trường đối tác' },
    { num: '50K+', label: 'Khung hình đã chụp' },
    { num: '5+', label: 'Năm kinh nghiệm' },
  ];
  useEffect(() => {
    if (window.location.hash === '#about') document.getElementById('about')?.scrollIntoView?.();
  }, []);
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
                {clientPortalEnabled && (
                  <CustomerButton asChild>
                    <Link to="/booking/start?source=portfolio">Đặt lịch</Link>
                  </CustomerButton>
                )}

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

        <section className="customer-portfolio__band">
          <div className="customer-portfolio__container">
            <div className="customer-portfolio__intro">
              <h2 className="customer-portfolio__heading">Chuẩn bị ngày kỷ yếu cùng Yume</h2>
              <p className="customer-portfolio__copy">
                Khám phá dịch vụ, tìm phong cách cho lớp và chọn gói phù hợp.
              </p>
            </div>
            <div className="customer-portfolio__grid customer-portfolio__grid--services">
              {[
                {
                  to: '/services',
                  title: 'Dịch vụ trọn gói',
                  text: 'Chụp ảnh, quay phim, hậu kỳ và quy trình thực hiện.',
                },
                {
                  to: '/concepts',
                  title: 'Concept cho lớp',
                  text: 'Khám phá các phong cách kỷ yếu hiện có.',
                },
                {
                  to: '/pricing',
                  title: 'Gói chụp và bảng giá',
                  text: 'Xem giá tham khảo và quyền lợi của từng gói.',
                },
              ].map((item) => (
                <CustomerSurface as="article" key={item.to}>
                  <h3 className="customer-portfolio__card-title">{item.title}</h3>
                  <p className="customer-portfolio__card-copy">{item.text}</p>
                  <CustomerButton asChild variant="text">
                    <Link to={item.to}>Xem chi tiết →</Link>
                  </CustomerButton>
                </CustomerSurface>
              ))}
            </div>
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

        <section className="customer-portfolio__band">
          <div className="customer-portfolio__container customer-portfolio__intro">
            <h2 className="customer-portfolio__heading">Chia sẻ cảm nhận với Yume</h2>
            <CustomerButton asChild variant="secondary">
              <Link to="/feedback">Gửi phản hồi</Link>
            </CustomerButton>
          </div>
        </section>
      </div>
    </PublicSiteLayout>
  );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/atoms/Logo';
import { portfolioImages } from '@/assets/images/portfolio-images';
import { CustomerImage } from './CustomerImage';
import '../../styles/customer-login.css';

interface CustomerAuthLayoutProps {
  titleId: string;
  title: string;
  children: ReactNode;
}

export function CustomerAuthLayout({ titleId, title, children }: CustomerAuthLayoutProps) {
  const portrait = portfolioImages.tnv00817;
  const friends = portfolioImages.pbi00061;

  return (
    <main className="customer-auth">
      <aside className="customer-auth__story" aria-label="Yume Studio">
        <div className="customer-auth__story-inner">
          <Link to="/portfolio" className="customer-link customer-auth__brand">
            <span aria-hidden="true">
              <Logo size={48} appearance="customer" />
            </span>
            <span>Yume Studio</span>
          </Link>
          <div className="customer-auth__story-content">
            <p className="customer-auth__eyebrow">Mỗi khoảnh khắc, một câu chuyện.</p>
            <h2 className="customer-auth__headline">
              Lưu lại điều bạn
              <br /> muốn nhớ.
            </h2>
            <p className="customer-auth__description">Cùng Yume lưu lại những ngày thật đẹp.</p>
            <div className="customer-auth__photos">
              <CustomerImage
                src={portrait.src}
                alt="Ảnh tốt nghiệp trong Portfolio Yume Studio"
                width={portrait.preview.width}
                height={portrait.preview.height}
                priority
                className="customer-auth__portrait"
              />
              <CustomerImage
                src={friends.src}
                alt="Ảnh kỷ niệm bạn bè trong Portfolio Yume Studio"
                width={friends.preview.width}
                height={friends.preview.height}
                className="customer-auth__friends"
              />
            </div>
          </div>
        </div>
      </aside>
      <div className="customer-auth__form-zone">
        <section
          className="customer-register__panel customer-auth__panel"
          aria-labelledby={titleId}
        >
          <h1 id={titleId} className="customer-register__title">
            {title}
          </h1>
          <p className="customer-register__intro">
            Đặt dịch vụ và theo dõi phản hồi từ studio trong tài khoản của bạn.
          </p>
          {children}
        </section>
      </div>
    </main>
  );
}

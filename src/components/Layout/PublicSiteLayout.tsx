import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../atoms/Logo';
import { useAuth } from '../../context/AuthContext';
import { clientPortalEnabled } from '../../config/features';
import { CustomerButton } from '../customer/CustomerButton';
import { CustomerContainer } from '../customer/CustomerContainer';
import { CustomerFooter } from '../customer/CustomerFooter';
import { CustomerMobileMenu } from '../customer/CustomerMobileMenu';

const publicLinks = [
  { label: 'Dịch vụ', to: '/services', anchor: '#services' },
  { label: 'Concept', to: '/concepts', anchor: '#gallery' },
  { label: 'Trang phục', to: '/costumes', anchor: '' },
  { label: 'Quy trình', to: '/portfolio#process', anchor: '#process' },
  { label: 'Báo giá', to: '/pricing', anchor: '#packages' },
];

interface PublicSiteLayoutProps {
  children: ReactNode;
  source: 'portfolio' | 'costumes';
}

export default function PublicSiteLayout({ children, source }: PublicSiteLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const accountPath = user?.roles?.includes(6) ? '/account/bookings' : user ? '/profile' : '/login';
  const accountLabel = user?.roles?.includes(6)
    ? 'Dịch vụ của tôi'
    : user?.name || user?.username || 'Tài khoản';
  const bookingHref = clientPortalEnabled
    ? `/booking/start?source=${encodeURIComponent(source)}`
    : '/consultation';
  const active = (item: (typeof publicLinks)[number]) =>
    item.to === '/costumes'
      ? location.pathname === '/costumes'
      : location.pathname === '/portfolio' && location.hash === item.anchor;
  const links = (items: typeof publicLinks) =>
    items.map((item) => (
      <Link
        key={item.to}
        to={item.to}
        className="customer-nav-link"
        aria-current={active(item) ? 'location' : undefined}
      >
        {item.label}
      </Link>
    ));
  const booking = (
    <CustomerButton asChild>
      <Link to={bookingHref}>{clientPortalEnabled ? 'Bắt đầu đặt lịch' : 'Nhận tư vấn'}</Link>
    </CustomerButton>
  );

  return (
    <div className="customer-shell">
      <a href="#main-content" className="customer-skip-link">
        Bỏ qua điều hướng
      </a>
      <header className="customer-header">
        <CustomerContainer className="customer-header__row">
          <Link to="/portfolio#top" className="customer-brand">
            <Logo size={36} appearance="customer" />
            <span className="customer-brand__name">Yume Studio</span>
          </Link>
          <nav aria-label="Điều hướng chính" className="customer-header__nav">
            {links(publicLinks.slice(0, 3))}
          </nav>
          <div className="customer-header__utilities">
            <Link
              to={accountPath}
              className="customer-nav-link customer-header__account"
              title={accountLabel}
            >
              {accountLabel}
            </Link>
            <div className="customer-header__booking">{booking}</div>
          </div>
          <CustomerMobileMenu>
            <nav aria-label="Điều hướng chính trên điện thoại" className="customer-menu__links">
              {links(publicLinks)}
              <Link to={accountPath}>{accountLabel}</Link>
            </nav>
            {booking}
          </CustomerMobileMenu>
        </CustomerContainer>
      </header>
      <main id="main-content" tabIndex={-1} className="customer-shell__main">
        {children}
      </main>
      <CustomerFooter />
    </div>
  );
}

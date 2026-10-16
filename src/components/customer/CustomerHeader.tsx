import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clientPortalEnabled } from '../../config/features';
import Logo from '../atoms/Logo';
import { CustomerButton } from './CustomerButton';
import { CustomerContainer } from './CustomerContainer';
import { CustomerMobileMenu } from './CustomerMobileMenu';
import '../../styles/customer-shell.css';

export function CustomerHeader({
  source = 'portfolio',
}: {
  source?: 'portfolio' | 'costumes' | 'account';
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const client = !!user?.roles?.includes(6);
  const name = user?.name?.trim() || user?.username || 'Tài khoản';
  const initials = name
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('vi-VN');
  const accountPath = user
    ? client
      ? clientPortalEnabled
        ? '/account/bookings'
        : '/portfolio#contact'
      : '/profile'
    : '/login';
  const profilePath = client ? '/account/profile' : '/profile';
  const showProfile = !client || clientPortalEnabled;
  const bookingHref = !clientPortalEnabled
    ? '/consultation'
    : source === 'account'
      ? '/account/bookings/new'
      : `/booking/start?source=${source}`;
  const { pathname } = location;
  const current =
    pathname.startsWith('/account/bookings') || pathname.startsWith('/account/rentals')
      ? 'account'
      : ['/costumes', '/rental-catalog', '/rental/start'].includes(pathname)
        ? 'costumes'
        : ['/portfolio', '/services', '/concepts', '/pricing', '/consultation'].includes(pathname)
          ? 'explore'
          : undefined;
  const links = [
    { key: 'explore', label: 'Khám phá dịch vụ', to: '/portfolio#packages' },
    { key: 'costumes', label: 'Trang phục', to: '/costumes' },
    {
      key: 'account',
      label:
        client && !clientPortalEnabled
          ? 'Liên hệ studio'
          : user && !client
            ? 'Tài khoản'
            : 'Dịch vụ của tôi',
      to: accountPath,
    },
  ];
  useEffect(() => setAccountOpen(false), [location.pathname, location.search, location.hash]);
  const signOut = () => {
    logout();
    navigate('/portfolio');
  };
  const primaryLinks = links.map((item) => (
    <Link
      key={item.key}
      to={item.to}
      state={
        item.key === 'account' && !user && clientPortalEnabled
          ? { from: '/account/bookings' }
          : undefined
      }
      className="customer-nav-link"
      aria-current={current === item.key ? 'page' : undefined}
    >
      {item.label}
    </Link>
  ));

  return (
    <header className="customer-header">
      <CustomerContainer className="customer-header__row">
        <Link to="/portfolio#top" className="customer-brand" aria-label="Yume Studio">
          <Logo size={36} appearance="customer" />
          <span className="customer-brand__name">Yume Studio</span>
        </Link>
        <nav aria-label="Điều hướng chính" className="customer-header__nav">
          {primaryLinks}
        </nav>
        <div className="customer-header__utilities">
          <CustomerButton asChild className="customer-header__booking">
            <Link to={bookingHref}>{clientPortalEnabled ? 'Đặt lịch' : 'Nhận tư vấn'}</Link>
          </CustomerButton>
          <div className="customer-header__account-control">
            {user ? (
              <DropdownMenu.Root open={accountOpen} onOpenChange={setAccountOpen}>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="customer-account-trigger"
                    aria-label={`Tài khoản của ${name}`}
                    aria-current={pathname === '/account/profile' ? 'page' : undefined}
                    title={name}
                  >
                    <span className="customer-account-trigger__avatar" aria-hidden="true">
                      {initials}
                    </span>
                    <ChevronDown aria-hidden="true" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="customer-account-menu customer-tokens"
                    align="end"
                    sideOffset={12}
                    collisionPadding={16}
                  >
                    {showProfile && (
                      <>
                        <DropdownMenu.Item asChild>
                          <Link to={profilePath} className="customer-account-menu__item">
                            <UserRound aria-hidden="true" />
                            Hồ sơ
                          </Link>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="customer-account-menu__separator" />
                      </>
                    )}
                    <DropdownMenu.Item onSelect={signOut} className="customer-account-menu__item">
                      <LogOut aria-hidden="true" />
                      Đăng xuất
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <Link to="/login" className="customer-header__login">
                Đăng nhập
              </Link>
            )}
          </div>
          <CustomerMobileMenu>
            <nav aria-label="Điều hướng chính trên điện thoại" className="customer-menu__links">
              {primaryLinks}
            </nav>
            <div className="customer-menu__account">
              {user ? (
                <>
                  <p className="customer-menu__username">{name}</p>
                  {showProfile && (
                    <Link to={profilePath} className="customer-account-menu__item">
                      <UserRound aria-hidden="true" />
                      Hồ sơ
                    </Link>
                  )}
                  <CustomerButton variant="text" onClick={signOut}>
                    <LogOut aria-hidden="true" />
                    Đăng xuất
                  </CustomerButton>
                </>
              ) : (
                <Link to="/login" className="customer-account-menu__item">
                  Đăng nhập
                </Link>
              )}
            </div>
          </CustomerMobileMenu>
        </div>
      </CustomerContainer>
    </header>
  );
}

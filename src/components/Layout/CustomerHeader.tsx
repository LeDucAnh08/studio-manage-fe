import { UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientPortalEnabled } from '../../config/features';
import Logo from '../atoms/Logo';
import { CustomerButton } from '../customer/CustomerButton';
import { CustomerContainer } from '../customer/CustomerContainer';
import { CustomerMobileMenu } from '../customer/CustomerMobileMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const publicLinks = [
  { to: '/portfolio', label: 'Trang chủ' },
  { to: '/services', label: 'Dịch vụ' },
  { to: '/concepts', label: 'Concept' },
  { to: '/costumes', label: 'Trang phục' },
  { to: '/pricing', label: 'Bảng giá' },
];
const clientLinks = [
  { to: '/account/bookings/new', label: 'Đặt dịch vụ' },
  { to: '/costumes', label: 'Trang phục' },
  { to: '/account/orders', label: 'Đơn của tôi' },
];

export default function CustomerHeader({ source = 'portfolio' }: { source?: string }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const client = clientPortalEnabled && !!user?.roles?.includes(6);
  const accountAvailable = isAuthenticated && (!user?.roles?.includes(6) || clientPortalEnabled);
  const signOut = () => {
    logout();
    navigate('/portfolio');
  };
  const links = (client ? clientLinks : publicLinks).map((item) => (
    <Link
      key={item.to}
      to={item.to}
      className="customer-nav-link"
      aria-current={
        pathname === item.to ||
        (client &&
          item.to === '/account/orders' &&
          ((pathname.startsWith('/account/bookings/') && pathname !== '/account/bookings/new') ||
            pathname.startsWith('/account/rentals/')))
          ? 'page'
          : undefined
      }
    >
      {item.label}
    </Link>
  ));
  const booking = !client && clientPortalEnabled && (
    <CustomerButton asChild>
      <Link to={`/booking/start?source=${encodeURIComponent(source)}`}>Đặt lịch</Link>
    </CustomerButton>
  );
  return (
    <header
      className={`customer-header customer-header--public${!isAuthenticated ? ' customer-header--guest' : ''}`}
    >
      <CustomerContainer className="customer-header__row">
        <Link to={client ? '/account/orders' : '/portfolio'} className="customer-brand">
          <Logo size={36} appearance="customer" />
          <span className="customer-brand__name">Yume Studio</span>
        </Link>
        {isAuthenticated && (
          <nav
            aria-label={client ? 'Tài khoản khách hàng' : 'Điều hướng chính'}
            className="customer-header__nav"
          >
            {links}
          </nav>
        )}
        <div className="customer-header__utilities">
          <div className="customer-header__booking">{booking}</div>
          {accountAvailable ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="customer-nav-link customer-header__account"
                  aria-label="Tài khoản"
                  title="Tài khoản"
                >
                  <UserRound size={22} aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="customer-tokens customer-account-menu"
              >
                <DropdownMenuItem asChild className="customer-account-menu__item">
                  <Link to={client ? '/account/profile' : '/profile'}>Hồ sơ</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="customer-account-menu__item" onSelect={signOut}>
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : clientPortalEnabled ? (
            <Link to="/login" className="customer-nav-link">
              Đăng nhập
            </Link>
          ) : null}
        </div>
        {isAuthenticated && (
          <CustomerMobileMenu>
            {client && <p className="customer-menu__username">{user?.name || user?.username}</p>}
            <nav aria-label="Điều hướng chính trên điện thoại" className="customer-menu__links">
              {links}
              {accountAvailable && <Link to={client ? '/account/profile' : '/profile'}>Hồ sơ</Link>}
            </nav>
            {booking}
            {isAuthenticated && (
              <CustomerButton variant="secondary" onClick={signOut}>
                Đăng xuất
              </CustomerButton>
            )}
          </CustomerMobileMenu>
        )}
      </CustomerContainer>
    </header>
  );
}

import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clientRentalEnabled } from '../../config/features';
import Logo from '../atoms/Logo';
import { CustomerButton } from '../customer/CustomerButton';
import { CustomerContainer } from '../customer/CustomerContainer';
import { CustomerFooter } from '../customer/CustomerFooter';
import { CustomerMobileMenu } from '../customer/CustomerMobileMenu';

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || user?.username;
  const signOut = () => {
    logout();
    navigate('/portfolio');
  };
  const primary = (
    <>
      <NavLink to="/account/bookings" className="customer-nav-link">
        Dịch vụ của tôi
      </NavLink>
      {clientRentalEnabled && (
        <NavLink to="/account/rentals" className="customer-nav-link">
          Đơn thuê của tôi
        </NavLink>
      )}
      <NavLink to="/account/profile" className="customer-nav-link">
        Hồ sơ
      </NavLink>
    </>
  );
  return (
    <div className="customer-shell">
      <a href="#account-content" className="customer-skip-link">
        Bỏ qua điều hướng
      </a>
      <header className="customer-header">
        <CustomerContainer className="customer-header__row">
          <Link to="/portfolio" className="customer-brand">
            <Logo size={36} appearance="customer" />
            <span className="customer-brand__name">Yume Studio</span>
          </Link>
          <nav aria-label="Tài khoản khách hàng" className="customer-header__nav">
            {primary}
          </nav>
          <div className="customer-header__utilities">
            <span className="customer-header__username" title={name}>
              {name}
            </span>
            <CustomerButton variant="secondary" onClick={signOut}>
              Đăng xuất
            </CustomerButton>
          </div>
          <CustomerMobileMenu>
            <p className="customer-menu__username">{name}</p>
            <nav aria-label="Tài khoản khách hàng trên điện thoại" className="customer-menu__links">
              {primary}
              <NavLink to="/account/bookings/new">Đặt dịch vụ</NavLink>
              <Link to="/portfolio#packages">Khám phá dịch vụ</Link>
              <Link to="/rental-catalog">Trang phục & phụ kiện</Link>
            </nav>
            <CustomerButton variant="secondary" onClick={signOut}>
              Đăng xuất
            </CustomerButton>
          </CustomerMobileMenu>
        </CustomerContainer>
      </header>
      <CustomerContainer
        as="main"
        id="account-content"
        tabIndex={-1}
        className="customer-shell__main customer-shell__main--account"
      >
        <Outlet />
      </CustomerContainer>
      <CustomerFooter minimal account />
    </div>
  );
}

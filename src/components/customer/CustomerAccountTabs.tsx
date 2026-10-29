import { NavLink } from 'react-router-dom';
import { clientPortalEnabled } from '../../config/features';

export function CustomerAccountTabs() {
  return (
    <nav className="customer-account-tabs" aria-label="Loại dịch vụ của tôi">
      <NavLink to="/account/bookings" className="customer-nav-link">
        Chụp ảnh
      </NavLink>
      {clientPortalEnabled && (
        <NavLink to="/account/rentals" className="customer-nav-link">
          Đơn thuê
        </NavLink>
      )}
    </nav>
  );
}

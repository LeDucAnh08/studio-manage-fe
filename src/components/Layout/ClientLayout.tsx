import { Outlet } from 'react-router-dom';
import { CustomerContainer } from '../customer/CustomerContainer';
import CustomerHeader from './CustomerHeader';

export default function ClientLayout() {
  return (
    <div className="customer-shell">
      <a href="#account-content" className="customer-skip-link">
        Bỏ qua điều hướng
      </a>
      <CustomerHeader />
      <CustomerContainer
        as="main"
        id="account-content"
        tabIndex={-1}
        className="customer-shell__main customer-shell__main--account"
      >
        <Outlet />
      </CustomerContainer>
      {/* Footer tạm ẩn. Giữ CustomerFooter để bật lại khi cần. */}
    </div>
  );
}

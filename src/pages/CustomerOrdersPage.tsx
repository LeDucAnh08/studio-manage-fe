import * as Tabs from '@radix-ui/react-tabs';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConceptOrdersPage from './ConceptOrdersPage';
import { conceptBookingEnabled } from '../config/features';
import { CustomerBookingOrders } from '../components/customer/CustomerBookingOrders';
import { CustomerRentalOrders } from '../components/customer/CustomerRentalOrders';
import '../styles/customer-orders-workspace.css';

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab =
    conceptBookingEnabled && requested === 'concepts'
      ? 'concepts'
      : requested === 'rentals'
        ? 'rentals'
        : 'bookings';
  useEffect(() => {
    if (requested !== null && requested !== tab) {
      setParams(
        (current) => {
          current.set('tab', tab);
          return current;
        },
        { replace: true },
      );
    }
  }, [requested, tab, setParams]);
  return (
    <div className="customer-orders customer-orders-workspace">
      <header className="customer-orders-workspace__header">
        <div>
          <h1 className="customer-page-title">Đơn của tôi</h1>
          <p className="customer-copy">Theo dõi yêu cầu chụp ảnh và thuê trang phục của bạn.</p>
        </div>
      </header>
      {!user?.emailVerifiedAt && (
        <p className="customer-order-notice">
          Bổ sung và xác minh email để nhận thông báo khi studio duyệt đơn.{' '}
          <Link className="customer-link" to="/account/profile">
            Cập nhật email
          </Link>
        </p>
      )}
      <Tabs.Root
        value={tab}
        activationMode="manual"
        onValueChange={(value) => setParams({ tab: value })}
      >
        <Tabs.List aria-label="Loại đơn" className="customer-order-tabs">
          <Tabs.Trigger value="bookings">Chụp ảnh</Tabs.Trigger>
          <Tabs.Trigger value="rentals">Thuê trang phục</Tabs.Trigger>
          {conceptBookingEnabled && <Tabs.Trigger value="concepts">Chụp concept</Tabs.Trigger>}
        </Tabs.List>
        <Tabs.Content value="bookings" className="customer-order-panel">
          {tab === 'bookings' && <CustomerBookingOrders />}
        </Tabs.Content>
        <Tabs.Content value="rentals" className="customer-order-panel">
          {tab === 'rentals' && <CustomerRentalOrders />}
        </Tabs.Content>
        {conceptBookingEnabled && (
          <Tabs.Content value="concepts" className="customer-order-panel">
            {tab === 'concepts' && <ConceptOrdersPage />}
          </Tabs.Content>
        )}
      </Tabs.Root>
    </div>
  );
}

import * as Tabs from '@radix-ui/react-tabs';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CustomerBookingOrders } from '../components/customer/CustomerBookingOrders';
import RentalListPage from './RentalListPage';
import '../styles/customer-orders-workspace.css';

export default function CustomerOrdersPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab = requested === 'rentals' ? 'rentals' : 'bookings';
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
      <Tabs.Root
        value={tab}
        activationMode="manual"
        onValueChange={(value) => setParams({ tab: value })}
      >
        <Tabs.List aria-label="Loại đơn" className="customer-order-tabs">
          <Tabs.Trigger value="bookings">Chụp ảnh</Tabs.Trigger>
          <Tabs.Trigger value="rentals">Thuê trang phục</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="bookings" className="customer-order-panel">
          {tab === 'bookings' && <CustomerBookingOrders />}
        </Tabs.Content>
        <Tabs.Content value="rentals" className="customer-order-panel">
          {tab === 'rentals' && <RentalListPage embedded />}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

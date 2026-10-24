import * as Tabs from '@radix-ui/react-tabs';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clientRentalEnabled } from '../config/features';
import BookingsPage from './BookingsPage';
import RentalListPage from './RentalListPage';

export default function CustomerOrdersPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab = requested === 'rentals' && clientRentalEnabled ? 'rentals' : 'bookings';
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
    <div className="customer-orders">
      <div>
        <h1 className="customer-page-title">Đơn của tôi</h1>
        <p className="customer-copy">
          {clientRentalEnabled
            ? 'Theo dõi yêu cầu chụp ảnh và thuê trang phục của bạn.'
            : 'Theo dõi yêu cầu chụp ảnh của bạn.'}
        </p>
      </div>
      <Tabs.Root
        value={tab}
        activationMode="manual"
        onValueChange={(value) => setParams({ tab: value })}
      >
        <Tabs.List aria-label="Loại đơn" className="customer-order-tabs">
          <Tabs.Trigger value="bookings">Chụp ảnh</Tabs.Trigger>
          {clientRentalEnabled && <Tabs.Trigger value="rentals">Thuê trang phục</Tabs.Trigger>}
        </Tabs.List>
        <Tabs.Content value="bookings" className="customer-order-panel">
          {tab === 'bookings' && <BookingsPage embedded />}
        </Tabs.Content>
        {clientRentalEnabled && (
          <Tabs.Content value="rentals" className="customer-order-panel">
            {tab === 'rentals' && <RentalListPage embedded />}
          </Tabs.Content>
        )}
      </Tabs.Root>
    </div>
  );
}

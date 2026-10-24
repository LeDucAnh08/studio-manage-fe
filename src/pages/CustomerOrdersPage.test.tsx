import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAppearanceContext } from '../components/customer/CustomerAppearance';
import CustomerOrdersPage from './CustomerOrdersPage';
const mocks = vi.hoisted(() => ({
  rental: true,
  bookings: vi.fn(),
  rentals: vi.fn(),
  notifications: vi.fn(),
}));
vi.mock('../config/features', () => ({
  get clientRentalEnabled() {
    return mocks.rental;
  },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { roles: [6] } }) }));
vi.mock('../services/bookingService', () => ({
  bookingLabels: { pending: 'Chờ duyệt' },
  bookingService: { list: mocks.bookings, notifications: mocks.notifications },
}));
vi.mock('../services/rentalService', async () => ({
  ...(await vi.importActual('../services/rentalService')),
  rentalService: { list: mocks.rentals },
}));
function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="url">{location.search}</output>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  );
}
function open(search = '') {
  return render(
    <MemoryRouter initialEntries={['/account/orders' + search]}>
      <CustomerAppearanceContext.Provider value={true}>
        <CustomerOrdersPage />
        <Probe />
      </CustomerAppearanceContext.Provider>
    </MemoryRouter>,
  );
}
describe('Unified orders tabs', () => {
  beforeEach(() => {
    mocks.rental = true;
    mocks.bookings.mockResolvedValue({ data: [], pagination: { total: 0 } });
    mocks.rentals.mockResolvedValue({ data: [], pagination: { total: 0 } });
    mocks.notifications.mockResolvedValue([]);
  });
  it('loads only the active list, resets filters on switching and supports Back', async () => {
    open();
    await screen.findByText(/Chưa có yêu cầu phù hợp/);
    expect(mocks.bookings).toHaveBeenCalledWith(1, '');
    expect(mocks.rentals).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'pending' } });
    await waitFor(() => expect(mocks.bookings).toHaveBeenLastCalledWith(1, 'pending'));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Thuê trang phục' }), {
      button: 0,
      ctrlKey: false,
    });
    await screen.findByText('Chưa có đơn thuê');
    expect(mocks.rentals).toHaveBeenCalledWith(1);
    expect(screen.getByTestId('url')).toHaveTextContent('?tab=rentals');
    expect(screen.queryByLabelText('Trạng thái')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByText(/Chưa có yêu cầu phù hợp/);
    expect(mocks.bookings).toHaveBeenLastCalledWith(1, '');
    expect(screen.getByRole('tab', { name: 'Chụp ảnh' })).toHaveAttribute('aria-selected', 'true');
  });
  it('directly opens rentals without loading bookings', async () => {
    open('?tab=rentals');
    await screen.findByText('Chưa có đơn thuê');
    expect(mocks.bookings).not.toHaveBeenCalled();
    expect(mocks.notifications).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Yêu cầu thuê mới' })).toHaveAttribute(
      'href',
      '/rental/start',
    );
  });
  it.each(['?tab=unknown', '?tab=rentals'])(
    'normalizes %s when rentals are disabled',
    async (search) => {
      mocks.rental = false;
      open(search);
      await screen.findByText(/Chưa có yêu cầu phù hợp/);
      expect(screen.queryByRole('tab', { name: 'Thuê trang phục' })).not.toBeInTheDocument();
      expect(screen.getByTestId('url')).toHaveTextContent('?tab=bookings');
      expect(mocks.rentals).not.toHaveBeenCalled();
    },
  );
  it('retries a failed booking request independently', async () => {
    mocks.bookings.mockRejectedValueOnce(new Error('offline'));
    open();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByText(/Chưa có yêu cầu phù hợp/);
    expect(mocks.bookings).toHaveBeenCalledTimes(2);
    expect(mocks.rentals).not.toHaveBeenCalled();
  });
});

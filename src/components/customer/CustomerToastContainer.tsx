import { matchPath, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { clientPortalEnabled, clientRentalEnabled } from '../../config/features';

const publicPaths = [
  '/login',
  '/portfolio',
  '/costumes',
  '/form/:customer',
  '/member-intake/:token',
  '/feedback',
  '/feedback/:customer',
];

const portalPaths = [
  '/register',
  '/booking/start',
  '/account',
  '/account/bookings',
  '/account/bookings/new',
  '/account/bookings/:id',
  '/account/profile',
];

const rentalPaths = ['/rental/start', '/account/rentals', '/account/rentals/:id'];

function isCustomerSurface(pathname: string) {
  const matches = (paths: string[]) =>
    paths.some((path) => matchPath({ path, end: true }, pathname));
  return (
    matches(publicPaths) ||
    (clientPortalEnabled && matches(portalPaths)) ||
    (clientRentalEnabled && matches(rentalPaths))
  );
}

export default function CustomerToastContainer() {
  const { pathname } = useLocation();

  return (
    <ToastContainer
      position="bottom-right"
      autoClose={3000}
      hideProgressBar={false}
      // Toastify retains this class on existing toasts across navigation.
      toastClassName={isCustomerSurface(pathname) ? 'customer-toast customer-tokens' : undefined}
    />
  );
}

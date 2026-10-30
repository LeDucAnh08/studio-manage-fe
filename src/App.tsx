import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import StaffScope from './components/Layout/StaffScope';
import LoginPage from './pages/LoginPage';
import RegisterRequestPage from './pages/RegisterRequestPage';
import ClientRegisterPage from './pages/ClientRegisterPage';
import ClientLayout from './components/Layout/ClientLayout';
import PublicSiteLayout from './components/Layout/PublicSiteLayout';
import PublicMemberIntakePage from './pages/PublicMemberIntakePage';
import { NewBookingPage } from './pages/BookingsPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage';
import PublicDiscoveryPage from './pages/PublicDiscoveryPage';
import PublicPackageDetailPage from './pages/PublicPackageDetailPage';
import PackageContentPage from './pages/PackageContentPage';
import BookingWorkflowDetailPage from './pages/BookingWorkflowDetailPage';
import { navItems, adminItems, type NavItem } from './config/navItems';
import type { UserRole } from './types';
import StudentFormPage from './pages/StudentFormPage';
import FeedbackFormPage from './pages/FeedbackFormPage';
import PortfolioPage from './pages/PortfolioPage';
import RentalCatalogPage from './pages/RentalCatalogPage';
import NewRentalPage from './pages/NewRentalPage';
import RentalDetailPage from './pages/RentalDetailPage';
import ProfilePage from './pages/ProfilePage';
import CustomerScope from './components/customer/CustomerScope';
import CustomerToastContainer from './components/customer/CustomerToastContainer';
import 'react-toastify/dist/ReactToastify.css';
import { usePageTitle } from './hooks/usePageTitle';
import { TooltipProvider } from '@/components/ui';
import { clientPortalEnabled } from './config/features';

function PageTitleManager() {
  usePageTitle();
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (
      !['/portfolio', '/services', '/concepts', '/pricing', '/costumes'].includes(pathname) &&
      !pathname.startsWith('/pricing/') &&
      !pathname.startsWith('/account/')
    )
      return;
    const main =
      document.getElementById('main-content') || document.getElementById('account-content');
    main?.focus({ preventScroll: true });
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

function PortfolioEntry() {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();
  const legacy: Record<string, string> = {
    '#services': '/services',
    '#gallery': '/concepts',
    '#packages': '/pricing',
    '#process': '/services#process',
    '#feedback': '/feedback',
  };
  if (legacy[location.hash]) return <Navigate to={legacy[location.hash]} replace />;
  if (isBootstrapping) return <p role="status">Đang xác thực...</p>;
  if (clientPortalEnabled && user?.roles.includes(6))
    return <Navigate to="/account/orders" replace />;
  return <PortfolioPage />;
}

function BookingEntry() {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname: '/account/bookings/new', search: location.search, hash: location.hash }}
      state={location.state}
      replace
    />
  );
}

function BookingRequestsRedirect() {
  const location = useLocation();
  const { id } = useParams();
  return (
    <Navigate
      to={{
        pathname: id ? `/workflow-bookings/${id}` : '/workflow-bookings',
        search: location.search,
        hash: location.hash,
      }}
      state={location.state}
      replace
    />
  );
}

function ConceptEntry() {
  const { user, isBootstrapping } = useAuth();
  if (isBootstrapping) return <p role="status">Đang xác thực...</p>;
  if (clientPortalEnabled && user?.roles.includes(6))
    return <Navigate to="/account/orders" replace />;
  return <PublicDiscoveryPage page="concepts" />;
}

function SearchPreservingRedirect({ pathname }: { pathname: string }) {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname, search: location.search, hash: location.hash }}
      state={location.state}
      replace
    />
  );
}

function wrapProtected(element: JSX.Element, allowedRoles?: UserRole[]) {
  return allowedRoles ? (
    <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
  ) : (
    element
  );
}

function renderRouteItem(item: NavItem) {
  if (item.children) {
    return (
      <Route
        key={item.to}
        path={item.to.slice(1)}
        element={wrapProtected(<Outlet />, item.allowedRoles)}
      >
        {item.children.map((child) => {
          if (!child.component) return null;
          const Element = child.component;
          const element = wrapProtected(<Element />, child.allowedRoles);
          const childPath = child.to.startsWith('/') ? child.to.slice(1) : child.to;
          return childPath === '' ? (
            <Route key="index" index element={element} />
          ) : (
            <Route key={child.to} path={childPath} element={element} />
          );
        })}
      </Route>
    );
  }

  if (!item.component) return null;
  const Element = item.component;
  const element = wrapProtected(<Element />, item.allowedRoles);

  return item.index ? (
    <Route key={item.to} index element={element} />
  ) : (
    <Route key={item.to} path={item.to.slice(1)} element={element} />
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={150}>
          <BrowserRouter>
            <PageTitleManager />
            <Routes>
              <Route element={<CustomerScope />}>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/register"
                  element={
                    clientPortalEnabled ? (
                      <ClientRegisterPage />
                    ) : (
                      <Navigate to="/portfolio" replace />
                    )
                  }
                />
                <Route path="/services" element={<PublicDiscoveryPage page="services" />} />
                <Route path="/concepts" element={<ConceptEntry />} />
                <Route path="/pricing" element={<PublicDiscoveryPage page="pricing" />} />
                <Route path="/pricing/:id" element={<PublicPackageDetailPage />} />
                <Route path="/consultation" element={<Navigate to="/services" replace />} />
                <Route
                  path="/booking/start"
                  element={
                    clientPortalEnabled ? (
                      <ProtectedRoute allowedRoles={[6]}>
                        <BookingEntry />
                      </ProtectedRoute>
                    ) : (
                      <Navigate to="/services" replace />
                    )
                  }
                />
                {clientPortalEnabled && (
                  <Route
                    path="/account"
                    element={
                      <ProtectedRoute allowedRoles={[6]}>
                        <ClientLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="orders" replace />} />
                    <Route path="orders" element={<CustomerOrdersPage />} />
                    <Route
                      path="bookings"
                      element={<Navigate to="/account/orders?tab=bookings" replace />}
                    />
                    <Route path="bookings/new" element={<NewBookingPage />} />
                    <Route path="bookings/:id" element={<BookingWorkflowDetailPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route
                      path="rentals"
                      element={<Navigate to="/account/orders?tab=rentals" replace />}
                    />
                    <Route path="rentals/:id" element={<RentalDetailPage />} />
                  </Route>
                )}
                <Route path="/portfolio" element={<PortfolioEntry />} />
                <Route path="/costumes" element={<RentalCatalogPage />} />
                {clientPortalEnabled && (
                  <Route
                    path="/rental/start"
                    element={
                      <ProtectedRoute allowedRoles={[6]}>
                        <PublicSiteLayout source="costumes">
                          <NewRentalPage />
                        </PublicSiteLayout>
                      </ProtectedRoute>
                    }
                  />
                )}
                <Route
                  path="/rental-catalog"
                  element={<SearchPreservingRedirect pathname="/costumes" />}
                />
                <Route path="/form/:customer" element={<StudentFormPage />} />
                <Route
                  path="/member-intake/:token"
                  element={
                    <PublicSiteLayout source="portfolio">
                      <PublicMemberIntakePage />
                    </PublicSiteLayout>
                  }
                />
                <Route path="/feedback" element={<FeedbackFormPage />} />
                <Route path="/feedback/:customer" element={<FeedbackFormPage />} />
              </Route>
              <Route element={<StaffScope />}>
                <Route
                  path="/staff/login"
                  element={<SearchPreservingRedirect pathname="/login" />}
                />
                <Route path="/staff-register" element={<RegisterRequestPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute allowedRoles={[0, 1, 2, 3, 4, 5]}>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  {[...navItems, ...adminItems].map(renderRouteItem)}
                  <Route path="profile" element={<ProfilePage />} />
                  <Route
                    path="settings/packages/:id/content"
                    element={
                      <ProtectedRoute allowedRoles={[0, 1]}>
                        <PackageContentPage />
                      </ProtectedRoute>
                    }
                  />
                  {clientPortalEnabled && (
                    <Route
                      path="rental-orders/:id"
                      element={
                        <ProtectedRoute allowedRoles={[0, 1, 2, 4, 5]}>
                          <RentalDetailPage />
                        </ProtectedRoute>
                      }
                    />
                  )}
                  {clientPortalEnabled && (
                    <Route
                      path="workflow-bookings/:id"
                      element={
                        <ProtectedRoute allowedRoles={[0, 1, 3, 5]}>
                          <BookingWorkflowDetailPage />
                        </ProtectedRoute>
                      }
                    />
                  )}
                  {clientPortalEnabled && (
                    <Route
                      path="booking-requests"
                      element={
                        <ProtectedRoute allowedRoles={[0, 1]}>
                          <BookingRequestsRedirect />
                        </ProtectedRoute>
                      }
                    />
                  )}
                  {clientPortalEnabled && (
                    <Route
                      path="booking-requests/:id"
                      element={
                        <ProtectedRoute allowedRoles={[0, 1]}>
                          <BookingRequestsRedirect />
                        </ProtectedRoute>
                      }
                    />
                  )}
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <CustomerToastContainer />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterRequestPage from './pages/RegisterRequestPage';
import ClientRegisterPage from './pages/ClientRegisterPage';
import ClientLayout from './components/Layout/ClientLayout';
import PublicSiteLayout from './components/Layout/PublicSiteLayout';
import PublicMemberIntakePage from './pages/PublicMemberIntakePage';
import BookingsPage, { NewBookingPage } from './pages/BookingsPage';
import BookingWorkflowDetailPage from './pages/BookingWorkflowDetailPage';
import { navItems, adminItems, type NavItem } from './config/navItems';
import type { UserRole } from './types';
import StudentFormPage from './pages/StudentFormPage';
import FeedbackFormPage from './pages/FeedbackFormPage';
import PortfolioPage from './pages/PortfolioPage';
import RentalCatalogPage from './pages/RentalCatalogPage';
import NewRentalPage from './pages/NewRentalPage';
import RentalListPage from './pages/RentalListPage';
import RentalDetailPage from './pages/RentalDetailPage';
import ProfilePage from './pages/ProfilePage';
import CustomerScope from './components/customer/CustomerScope';
import CustomerToastContainer from './components/customer/CustomerToastContainer';
import 'react-toastify/dist/ReactToastify.css';
import { usePageTitle } from './hooks/usePageTitle';
import { TooltipProvider } from '@/components/ui';
import { clientPortalEnabled, clientRentalEnabled } from './config/features';

function PageTitleManager() {
  usePageTitle();
  return null;
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
              <Route path="/staff/login" element={<LoginPage />} />
              <Route path="/staff-register" element={<RegisterRequestPage />} />
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
                <Route path="/services" element={<Navigate to="/portfolio#services" replace />} />
                <Route path="/concepts" element={<Navigate to="/portfolio#gallery" replace />} />
                <Route path="/pricing" element={<Navigate to="/portfolio#packages" replace />} />
                <Route
                  path="/consultation"
                  element={<Navigate to="/portfolio#contact" replace />}
                />
                <Route
                  path="/booking/start"
                  element={
                    clientPortalEnabled ? (
                      <NewBookingPage />
                    ) : (
                      <Navigate to="/consultation" replace />
                    )
                  }
                />
                <Route
                  path="/account/bookings/new"
                  element={<SearchPreservingRedirect pathname="/booking/start" />}
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
                    <Route index element={<Navigate to="bookings" replace />} />
                    <Route path="bookings" element={<BookingsPage />} />
                    <Route path="bookings/:id" element={<BookingWorkflowDetailPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    {clientRentalEnabled && <Route path="rentals" element={<RentalListPage />} />}
                    {clientRentalEnabled && (
                      <Route path="rentals/:id" element={<RentalDetailPage />} />
                    )}
                  </Route>
                )}
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/costumes" element={<RentalCatalogPage />} />
                <Route
                  path="/rental/start"
                  element={
                    <PublicSiteLayout source="costumes">
                      <NewRentalPage />
                    </PublicSiteLayout>
                  }
                />
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
                {clientRentalEnabled && (
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
                    path="booking-requests/:id"
                    element={
                      <ProtectedRoute allowedRoles={[0, 1]}>
                        <BookingWorkflowDetailPage />
                      </ProtectedRoute>
                    }
                  />
                )}
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

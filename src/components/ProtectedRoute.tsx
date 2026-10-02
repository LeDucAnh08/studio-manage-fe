import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';
import type { UserRole } from '../types';
import { safeBookingReturnTo } from '../utils/returnTo';

interface Props {
  children: ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ children, requiredRole, allowedRoles }: Props) => {
  const location = useLocation();
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  // Wait for the bootstrap refresh check before making any redirect decision
  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated)
    return (
      <Navigate
        to={location.pathname === '/' ? '/portfolio' : '/login'}
        state={{ from: safeBookingReturnTo(location.pathname + location.search) }}
        replace
      />
    );
  const home = user?.roles?.includes(6)
    ? '/account/bookings'
    : user?.roles?.includes(5) && user.roles.length === 1
      ? '/manage/finance'
      : '/';
  if (requiredRole !== undefined && !user?.roles?.includes(requiredRole))
    return <Navigate to={home} replace />;
  if (allowedRoles && !user?.roles?.some((r) => allowedRoles.includes(r)))
    return <Navigate to={home} replace />;

  return <>{children}</>;
};

export default ProtectedRoute;

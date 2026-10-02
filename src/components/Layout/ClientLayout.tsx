import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui';

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/portfolio" className="font-bold text-xl">
            Yume Studio
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span>{user?.name || user?.username}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                navigate('/portfolio');
              }}
            >
              Đăng xuất
            </Button>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-4 pb-4 flex flex-wrap gap-5 text-sm">
          <NavLink
            to="/account/bookings"
            className={({ isActive }) => (isActive ? 'text-primary font-semibold' : '')}
          >
            Dịch vụ của tôi
          </NavLink>
          <Link to="/account/bookings/new">Đặt dịch vụ</Link>
          <NavLink to="/account/profile">Hồ sơ</NavLink>
          <Link to="/portfolio#packages">Khám phá dịch vụ</Link>
          <Link to="/rental-catalog">Trang phục & phụ kiện</Link>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

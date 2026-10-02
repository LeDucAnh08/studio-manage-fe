import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import Logo from '../atoms/Logo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { clientPortalEnabled } from '../../config/features';

const publicLinks = [
  { label: 'Dịch vụ', to: '/services' },
  { label: 'Concept', to: '/concepts' },
  { label: 'Trang phục', to: '/costumes' },
  { label: 'Quy trình', to: '/portfolio#process' },
  { label: 'Báo giá', to: '/pricing' },
];

interface PublicSiteLayoutProps {
  children: ReactNode;
  source: 'portfolio' | 'costumes';
}

export default function PublicSiteLayout({ children, source }: PublicSiteLayoutProps) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const accountPath = user?.roles?.includes(6) ? '/account/bookings' : user ? '/profile' : '/login';
  const accountLabel = user?.roles?.includes(6)
    ? 'Dịch vụ của tôi'
    : user?.name || user?.username || 'Tài khoản';
  const bookingHref = clientPortalEnabled
    ? `/booking/start?source=${encodeURIComponent(source)}`
    : '/consultation';

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-800 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-md bg-background px-4 py-3 text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Bỏ qua điều hướng
      </a>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 text-slate-800 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/portfolio#top" className="flex min-h-11 shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
            <Logo size={36} />
            <span className="font-bold text-lg text-gradient">Yume Studio</span>
          </Link>
          <nav aria-label="Điều hướng chính" className="hidden items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300 xl:flex">
            {publicLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2 transition hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 motion-reduce:transition-none"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={accountPath}
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2 transition hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 motion-reduce:transition-none"
            >
              {accountLabel}
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              aria-pressed={isDark}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 transition hover:border-amber-300 hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-white/10 motion-reduce:transition-none"
            >
              {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
            <Link
              to={bookingHref}
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-semibold text-white shadow-md transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:px-4 sm:text-sm motion-reduce:transition-none"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }}
            >
              {clientPortalEnabled ? 'Bắt đầu đặt lịch' : 'Nhận tư vấn'}
            </Link>
          </div>
        </div>
        <nav
          aria-label="Điều hướng trang trên thiết bị nhỏ"
          className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-2 xl:hidden sm:px-6"
        >
          {[...publicLinks, { label: user?.roles?.includes(6) ? 'Dịch vụ của tôi' : 'Tài khoản', to: accountPath }].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:border-amber-300 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-white/10 dark:text-slate-200 motion-reduce:transition-none"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>

      <footer className="border-t border-slate-200 py-10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 text-center text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:px-6 sm:text-left">
          <Link to="/portfolio#top" className="flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
            <Logo size={28} />
            <span className="font-semibold text-slate-700 dark:text-slate-200">Yume Studio</span>
          </Link>
          <p>© {new Date().getFullYear()} Yume Studio. Mọi quyền được bảo lưu.</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:justify-end">
            <Link to="/pricing" className="min-h-11 rounded-md px-2 py-3 hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              Báo giá
            </Link>
            <Link to="/consultation" className="min-h-11 rounded-md px-2 py-3 hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              Nhận tư vấn
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

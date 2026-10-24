import { useEffect, useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { adminItems, navItems, type NavItem } from '../config/navItems';

const APP_NAME = 'Yume Studio';

interface FlatRoute {
  path: string;
  label: string;
}

/**
 * Flatten navItems into a list of { absolutePath, label }
 * by concatenating parent + child paths (similar to how routes are registered in App.tsx).
 */
function flattenNavItems(items: NavItem[], parentPath = ''): FlatRoute[] {
  const result: FlatRoute[] = [];

  for (const item of items) {
    const segment = item.to.startsWith('/') ? item.to : `/${item.to}`;
    const fullPath =
      item.index || segment === '/'
        ? parentPath || '/'
        : `${parentPath}${segment}`.replace(/\/+/g, '/');

    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        const childSeg = child.to ? (child.to.startsWith('/') ? child.to : `/${child.to}`) : '';
        const childPath = (childSeg === '' ? fullPath : `${fullPath}${childSeg}`).replace(
          /\/+/g,
          '/',
        );
        result.push({ path: childPath, label: child.label });
      }
      // Also register the parent path itself in case it's accessed directly
      result.push({ path: fullPath, label: item.label });
    } else {
      result.push({ path: fullPath, label: item.label });
    }
  }

  return result;
}

// Manual entries for routes that are not in navItems (defined directly in App.tsx)
const EXTRA_ROUTES: FlatRoute[] = [
  { path: '/register', label: 'Đăng ký khách hàng' },
  { path: '/staff-register', label: 'Yêu cầu tài khoản nhân sự' },
  { path: '/account/bookings', label: 'Dịch vụ của tôi' },
  { path: '/account/bookings/new', label: 'Đặt dịch vụ' },
  { path: '/account/bookings/:id', label: 'Chi tiết dịch vụ' },
  { path: '/account/rentals', label: 'Dịch vụ của tôi' },
  { path: '/account/rentals/:id', label: 'Chi tiết đơn thuê' },
  { path: '/account/profile', label: 'Hồ sơ cá nhân' },
  { path: '/booking-requests/:id', label: 'Xét duyệt booking' },
  { path: '/login', label: 'Đăng nhập' },
  { path: '/staff/login', label: 'Đăng nhập nhân sự' },
  { path: '/portfolio', label: 'Giới thiệu studio' },
  { path: '/services', label: 'Dịch vụ' },
  { path: '/concepts', label: 'Concept' },
  { path: '/pricing', label: 'Bảng giá' },
  { path: '/costumes', label: 'Trang phục' },
  { path: '/account/orders', label: 'Đơn của tôi' },
  { path: '/account/rentals/:id', label: 'Chi tiết đơn thuê' },
  { path: '/rental/start', label: 'Yêu cầu thuê' },
  { path: '/form/:customer', label: 'Thông tin học sinh' },
  { path: '/feedback', label: 'Phản hồi' },
  { path: '/feedback/:customer', label: 'Phản hồi' },
];

export function usePageTitle() {
  const { pathname } = useLocation();

  const routes = useMemo<FlatRoute[]>(
    () => [...flattenNavItems(navItems), ...flattenNavItems(adminItems), ...EXTRA_ROUTES],
    [],
  );

  useEffect(() => {
    // Prefer the most specific match (longest path with no params if multiple match)
    const matches = routes
      .map((r) => ({ route: r, match: matchPath({ path: r.path, end: true }, pathname) }))
      .filter((m) => m.match);

    let chosen: FlatRoute | undefined;
    if (matches.length > 0) {
      matches.sort((a, b) => {
        const aHasParam = a.route.path.includes(':') ? 1 : 0;
        const bHasParam = b.route.path.includes(':') ? 1 : 0;
        if (aHasParam !== bHasParam) return aHasParam - bHasParam;
        return b.route.path.length - a.route.path.length;
      });
      chosen = matches[0].route;
    }

    document.title = chosen ? `${chosen.label} | ${APP_NAME}` : APP_NAME;
  }, [pathname, routes]);
}

export default usePageTitle;

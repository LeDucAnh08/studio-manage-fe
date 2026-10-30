import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronRight, Sun, Moon, Monitor, UserCircle, X } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { ROLE_LABELS } from '../../types';
import { navItems, adminItems, type NavItem } from '../../config/navItems';
import { getNavigationGroupForPath } from '../../config/navigation';
import { Logo } from '../atoms';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '../ui/dropdown-menu';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchSeasons, setSelectedSeason } from '../../store/slices/seasonsSlice';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLButtonElement>;
}

const mobileQuery = '(max-width: 767px)';

const Sidebar = ({ isOpen, onClose, triggerRef }: SidebarProps) => {
  const { user, logout } = useAuth();
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { list: seasons, selectedSeasonId } = useAppSelector((s) => s.seasons);
  const navRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const seasonId = useId();
  const [mobile, setMobile] = useState(() => window.matchMedia(mobileQuery).matches);
  const [openGroup, setOpenGroup] = useState<string | null>(() =>
    getNavigationGroupForPath(location.pathname),
  );

  useEffect(() => {
    dispatch(fetchSeasons());
  }, [dispatch]);

  useEffect(() => {
    const media = window.matchMedia(mobileQuery);
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) onClose();
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [onClose]);

  useEffect(() => {
    setOpenGroup(getNavigationGroupForPath(location.pathname));
  }, [location.pathname]);

  const scrollActiveLink = useCallback(() => {
    const activeLink = navRef.current?.querySelector<HTMLElement>('a[aria-current="page"]');
    const routeGroup = getNavigationGroupForPath(location.pathname);
    const activeGroupToggle =
      routeGroup && routeGroup === openGroup
        ? navRef.current?.querySelector<HTMLElement>(`[data-nav-group="${routeGroup}"]`)
        : null;
    const target = activeLink?.closest('[hidden]')
      ? activeGroupToggle
      : (activeLink ?? activeGroupToggle);
    target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [location.pathname, openGroup]);

  useEffect(() => {
    scrollActiveLink();
  }, [scrollActiveLink, mobile]);

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login', { replace: true });
  };

  const themeOptions: Array<{ mode: ThemeMode; label: string; icon: JSX.Element }> = [
    { mode: 'light', label: 'Sáng', icon: <Sun size={16} aria-hidden="true" /> },
    { mode: 'dark', label: 'Tối', icon: <Moon size={16} aria-hidden="true" /> },
    { mode: 'system', label: 'Hệ thống', icon: <Monitor size={16} aria-hidden="true" /> },
  ];
  const ThemeIcon = themeMode === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;
  const isAllowed = (item: NavItem) =>
    !item.allowedRoles || user?.roles?.some((r) => item.allowedRoles!.includes(r));

  const renderNavItem = (item: NavItem) => {
    if (item.hidden || !isAllowed(item)) return null;
    const ItemIcon = item.icon;
    if (item.children) {
      const children = item.children.filter((child) => !child.hidden && isAllowed(child));
      if (!children.length) return null;
      const expanded = openGroup === item.to;
      const panelId = `nav-group-${item.to.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
      return (
        <div key={item.to}>
          <button
            type="button"
            className="staff-nav-item justify-between"
            onClick={() => setOpenGroup((current) => (current === item.to ? null : item.to))}
            aria-expanded={expanded}
            aria-controls={panelId}
            data-nav-group={item.to}
          >
            <span className="flex items-center gap-3">
              {ItemIcon && (
                <span aria-hidden="true">
                  <ItemIcon className="h-4 w-4 shrink-0" />
                </span>
              )}
              {item.label}
            </span>
            <ChevronRight
              size={14}
              aria-hidden="true"
              className={expanded ? 'rotate-90' : undefined}
            />
          </button>
          <div id={panelId} hidden={!expanded} className="staff-nav-group">
            {children.map((child) => {
              const ChildIcon = child.icon;
              return (
                <NavLink
                  key={item.to + child.to}
                  to={item.to + child.to}
                  end
                  onClick={onClose}
                  className="staff-nav-item"
                >
                  {ChildIcon && (
                    <span aria-hidden="true">
                      <ChildIcon className="h-4 w-4 shrink-0" />
                    </span>
                  )}
                  {child.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        onClick={onClose}
        className="staff-nav-item"
      >
        {ItemIcon && (
          <span aria-hidden="true">
            <ItemIcon className="h-4 w-4 shrink-0" />
          </span>
        )}
        {item.label}
      </NavLink>
    );
  };

  const content = (
    <>
      <div className="staff-sidebar__header">
        <Logo size={32} />
        <div className="staff-brand">
          Yume Studio
          <p>Quản lý chụp ảnh</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="staff-icon-button" aria-label="Chế độ giao diện">
              <ThemeIcon size={18} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" aria-label="Chế độ giao diện">
            <DropdownMenuRadioGroup
              value={themeMode}
              onValueChange={(value) => setThemeMode(value as ThemeMode)}
            >
              {themeOptions.map((option) => (
                <DropdownMenuRadioItem key={option.mode} value={option.mode}>
                  {option.icon} {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {mobile && (
          <Dialog.Close asChild>
            <button
              ref={closeRef}
              type="button"
              className="staff-icon-button"
              aria-label="Đóng menu"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </Dialog.Close>
        )}
      </div>
      <nav ref={navRef} className="staff-sidebar__nav" aria-label="Chức năng nội bộ">
        <div className="staff-season">
          <label htmlFor={seasonId} className="staff-nav-label">
            Mùa chụp
          </label>
          <select
            id={seasonId}
            value={selectedSeasonId}
            onChange={(e) => dispatch(setSelectedSeason(e.target.value))}
          >
            <option value="">Tất cả mùa</option>
            {seasons.map((season) => (
              <option key={season._id} value={season._id}>
                {season.name}
              </option>
            ))}
          </select>
        </div>
        {navItems.map(renderNavItem)}
        {user?.roles?.some((role) =>
          adminItems.some((item) => item.allowedRoles?.includes(role)),
        ) && (
          <>
            <p className="staff-nav-label px-3 pt-4">Quản trị</p>
            {adminItems.map(renderNavItem)}
          </>
        )}
      </nav>
      <div className="staff-sidebar__user">
        <NavLink to="/profile" onClick={onClose} className="staff-profile-link">
          <span className="staff-avatar" aria-hidden="true">
            {(user?.name || user?.username || '?')[0].toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{user?.name || user?.username}</p>
            {user?.roles?.map((role) => (
              <span key={role} className="staff-role">
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>
          <UserCircle size={16} aria-hidden="true" />
        </NavLink>
        <button type="button" onClick={handleLogout} className="staff-logout">
          Đăng xuất →
        </button>
      </div>
    </>
  );

  if (!mobile)
    return (
      <aside className="staff-sidebar" aria-label="Điều hướng nội bộ">
        {content}
      </aside>
    );

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="staff-drawer-overlay" />
        <Dialog.Content
          id="staff-mobile-navigation"
          className="staff-sidebar staff-sidebar--mobile"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeRef.current?.focus();
            scrollActiveLink();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (window.matchMedia(mobileQuery).matches)
              triggerRef?.current?.focus({ preventScroll: true });
          }}
        >
          <Dialog.Title className="sr-only">Điều hướng nội bộ</Dialog.Title>
          <Dialog.Description className="sr-only">
            Chọn chức năng theo vai trò của bạn.
          </Dialog.Description>
          {content}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Sidebar;

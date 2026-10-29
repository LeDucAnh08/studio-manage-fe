import { useCallback, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import { Logo } from '../atoms';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="staff-shell">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} triggerRef={menuRef} />

      {/* Mobile top bar */}
      <div className="staff-topbar">
        <button
          ref={menuRef}
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="staff-icon-button"
          aria-label="Mở menu"
          aria-expanded={sidebarOpen}
          aria-haspopup="dialog"
          aria-controls={sidebarOpen ? 'staff-mobile-navigation' : undefined}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <Logo size={26} />
        <span>Yume Studio</span>
      </div>

      <main className="staff-main">
        <Breadcrumbs />
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

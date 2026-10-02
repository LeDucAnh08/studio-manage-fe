import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import { Logo } from '../atoms';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-20 flex items-center h-14 px-4 md:hidden"
        style={{
          background: 'var(--topbar-bg)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--topbar-border)',
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1 mr-3 transition-colors"
          style={{ color: 'var(--topbar-icon-color)' }}
          aria-label="Mở menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <Logo size={26} />
        <span className="ml-2 font-bold text-sm text-gradient">Yume Studio</span>
      </div>

      <main className="flex-1 md:ml-60 p-4 md:p-6 overflow-y-auto pt-[4.5rem] md:pt-6">
        <Breadcrumbs />
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

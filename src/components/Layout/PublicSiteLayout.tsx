import type { ReactNode } from 'react';
import { CustomerFooter } from '../customer/CustomerFooter';
import { CustomerHeader } from '../customer/CustomerHeader';

interface PublicSiteLayoutProps {
  children: ReactNode;
  source: 'portfolio' | 'costumes';
}

export default function PublicSiteLayout({ children, source }: PublicSiteLayoutProps) {
  return (
    <div className="customer-shell">
      <a href="#main-content" className="customer-skip-link">
        Bỏ qua điều hướng
      </a>
      <CustomerHeader source={source} />
      <main id="main-content" tabIndex={-1} className="customer-shell__main">
        {children}
      </main>
      <CustomerFooter />
    </div>
  );
}

import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { clientPortalEnabled } from '../../config/features';
import { CustomerFooter } from '../customer/CustomerFooter';
import CustomerHeader from './CustomerHeader';

export default function PublicSiteLayout({
  children,
  source,
}: {
  children: ReactNode;
  source: string;
}) {
  const { user } = useAuth();
  const client = clientPortalEnabled && !!user?.roles.includes(6);
  return (
    <div className="customer-shell">
      <a href="#main-content" className="customer-skip-link">
        Bỏ qua điều hướng
      </a>
      <CustomerHeader source={source} />
      <main id="main-content" tabIndex={-1} className="customer-shell__main">
        {children}
      </main>
      <CustomerFooter minimal={client} account={client} />
    </div>
  );
}

import type { ReactNode } from 'react';
import CustomerHeader from './CustomerHeader';

export default function PublicSiteLayout({
  children,
  source,
}: {
  children: ReactNode;
  source: string;
}) {
  return (
    <div className="customer-shell">
      <a href="#main-content" className="customer-skip-link">
        Bỏ qua điều hướng
      </a>
      <CustomerHeader source={source} />
      <main id="main-content" tabIndex={-1} className="customer-shell__main">
        {children}
      </main>
      {/* Footer tạm ẩn. Giữ CustomerFooter để bật lại khi cần. */}
    </div>
  );
}

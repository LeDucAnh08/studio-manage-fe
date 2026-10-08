import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerSurface } from './CustomerSurface';
import { CustomerStatusBadge } from './CustomerStatusBadge';
import '../../styles/customer-portfolio.css';

interface CustomerPackageCardProps {
  name: string;
  price: ReactNode;
  note?: string;
  featured?: boolean;
  featuredLabel?: string;
  selected?: boolean;
  children?: ReactNode;
  actions: ReactNode;
  className?: string;
}

export function CustomerPackageCard({
  name,
  price,
  note,
  featured,
  featuredLabel = 'Được yêu thích',
  selected,
  children,
  actions,
  className,
}: CustomerPackageCardProps) {
  return (
    <CustomerSurface
      as="article"
      className={cn(
        'customer-package-card',
        selected && 'customer-package-card--selected',
        className,
      )}
    >
      <div className="customer-package-card__heading">
        <div>
          {featured && <CustomerStatusBadge>{featuredLabel}</CustomerStatusBadge>}
          <h3 className="customer-package-card__title">{name}</h3>
        </div>
        {selected && <Check aria-label="Đang chọn" className="customer-package-card__check" />}
      </div>
      <div className="customer-package-card__price">{price}</div>
      {note && <p className="customer-package-card__note">{note}</p>}
      <div className="customer-package-card__features">{children}</div>
      <div className="customer-package-card__actions">{actions}</div>
    </CustomerSurface>
  );
}

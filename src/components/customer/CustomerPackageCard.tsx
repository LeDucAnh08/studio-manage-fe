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
  layout?: 'card' | 'row';
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
  layout = 'card',
}: CustomerPackageCardProps) {
  return (
    <CustomerSurface
      as="article"
      className={cn(
        'customer-package-card',
        selected && 'customer-package-card--selected',
        layout === 'row' && 'customer-package-card--row',
        className,
      )}
    >
      <div className="customer-package-card__overview">
        <div className="customer-package-card__heading">
          <div>
            {featured && <CustomerStatusBadge>{featuredLabel}</CustomerStatusBadge>}
            <h3 className="customer-package-card__title">{name}</h3>
          </div>
          {selected && <Check aria-label="Đang chọn" className="customer-package-card__check" />}
        </div>
        <div className="customer-package-card__price">{price}</div>
        {note && <p className="customer-package-card__note">{note}</p>}
      </div>
      <div className="customer-package-card__features">{children}</div>
      <div className="customer-package-card__actions">{actions}</div>
    </CustomerSurface>
  );
}

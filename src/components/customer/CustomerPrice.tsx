import { cn } from '@/lib/utils';
import '../../styles/customer-surfaces.css';

interface CustomerPriceProps {
  amount: number;
  unit?: string;
  label?: string;
  emphasis?: 'normal' | 'total';
  className?: string;
}

export function CustomerPrice({
  amount,
  unit,
  label,
  emphasis = 'normal',
  className,
}: CustomerPriceProps) {
  return (
    <span
      className={cn('customer-price', emphasis === 'total' && 'customer-price--total', className)}
    >
      {label && <span className="customer-price__label">{label}</span>}
      <span className="customer-price__amount">{amount.toLocaleString('vi-VN')} ₫</span>
      {unit && <span className="customer-price__unit">{unit}</span>}
    </span>
  );
}

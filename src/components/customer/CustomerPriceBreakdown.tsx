import type { ReactNode } from 'react';
import '../../styles/customer-orders.css';

interface BreakdownItem {
  label: string;
  value: ReactNode;
}

export function CustomerPriceBreakdown({ items }: { items: BreakdownItem[] }) {
  return (
    <dl className="customer-order-breakdown">
      {items.map((item) => (
        <div className="customer-order-breakdown__row" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SegmentedValue = string | number;

export interface SegmentedItem<T extends SegmentedValue> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends SegmentedValue> {
  value: T;
  items: SegmentedItem<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends SegmentedValue>({
  value,
  items,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      data-ui="segmented-control"
      className={cn(
        'inline-flex items-center rounded-lg border bg-card p-0.5 shadow-sm',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              'min-w-[5.25rem] rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 inline-flex items-center justify-center gap-1.5',
              isActive
                ? 'text-white shadow-[0_8px_18px_rgba(245,158,11,0.28)] [background:linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary)/.8)_100%)]'
                : 'bg-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.icon ? <span className="text-[0.8rem] leading-none">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

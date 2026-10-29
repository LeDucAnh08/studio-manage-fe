import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps extends Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid' | 'aria-required'
> {
  value?: string; // YYYY-MM-DD
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  disabled,
  className,
  ...controlProps
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  const handleSelect = (day: Date | undefined) => {
    onChange(day ? format(day, 'yyyy-MM-dd') : undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div data-ui="date-picker" className={cn('relative w-full', className)}>
        <PopoverTrigger asChild>
          <button
            {...controlProps}
            ref={triggerRef}
            data-ui="date-trigger"
            type="button"
            disabled={disabled}
            className={cn(
              // base
              'group relative flex w-full items-center h-9 px-3 rounded-md text-sm',
              'border border-input bg-background',
              'transition-all duration-200',
              // hover
              'hover:border-primary/50 hover:bg-primary/5',
              // focus / open
              open && ['border-primary/70', '[box-shadow:0_0_0_3px_hsl(38_92%_50%/0.18)]'],
              // disabled
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected && !disabled && 'pr-10',
            )}
          >
            {/* icon left */}
            <CalendarIcon
              className={cn(
                'mr-2 h-4 w-4 shrink-0 transition-colors duration-200',
                open ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70',
              )}
            />

            {/* label */}
            <span
              className={cn(
                'flex-1 text-left truncate',
                selected ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              {selected ? format(selected, 'dd/MM/yyyy') : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        {selected && !disabled && (
          <button
            type="button"
            data-ui="date-clear"
            aria-label={`Xoá ngày: ${controlProps['aria-label'] || placeholder}`}
            onClick={() => {
              onChange(undefined);
              triggerRef.current?.focus({ preventScroll: true });
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>

      <PopoverContent
        className={cn(
          'w-auto p-0 rounded-xl overflow-hidden',
          'border border-border/60',
          'shadow-xl shadow-black/10 dark:shadow-black/40',
        )}
        align="start"
        sideOffset={6}
      >
        {/* header accent bar */}
        <div
          data-ui="date-accent"
          className="h-1 w-full [background:linear-gradient(90deg,#f59e0b,#22d3ee)]"
        />
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

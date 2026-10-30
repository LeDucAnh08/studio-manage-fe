import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps extends Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid' | 'aria-required'
> {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  maxBadges?: number;
}

export const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  emptyText = 'Không có kết quả.',
  disabled,
  className,
  maxBadges = 4,
  ...controlProps
}: MultiSelectProps) => {
  const [open, setOpen] = React.useState(false);

  const toggle = (optValue: string) => {
    if (value.includes(optValue)) onChange(value.filter((v) => v !== optValue));
    else onChange([...value, optValue]);
  };

  const remove = (optValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optValue));
  };

  const selected = options.filter((o) => value.includes(o.value));
  const visible = selected.slice(0, maxBadges);
  const overflow = selected.length - visible.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          {...controlProps}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal min-h-9 h-auto py-1 [&_svg]:size-4',
            className,
          )}
        >
          <div className="flex flex-wrap items-center gap-1 flex-1 text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {visible.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant="secondary"
                    className="gap-1 px-1.5 py-0 font-normal"
                  >
                    {opt.label}
                    <span
                      role="button"
                      aria-label={`Bỏ chọn ${opt.label}`}
                      tabIndex={-1}
                      onClick={(e) => remove(opt.value, e)}
                      className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                ))}
                {overflow > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 font-normal">
                    +{overflow}
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <CommandItem key={opt.value} value={opt.label} onSelect={() => toggle(opt.value)}>
                    <Check
                      className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                    />
                    {opt.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

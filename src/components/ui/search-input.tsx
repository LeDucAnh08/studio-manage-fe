import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

export const SearchInput = ({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = 'Tìm kiếm…',
  className,
  'aria-label': label = 'Tìm kiếm',
}: SearchInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div data-ui="search-input" className={cn('flex gap-2 flex-wrap', className)}>
      <div className="relative flex-1 min-w-[12rem]">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          aria-label={label}
          className="pl-8 pr-8"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Xoá tìm kiếm"
            data-ui="search-clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button type="button" variant="secondary" onClick={onSearch}>
        Tìm
      </Button>
    </div>
  );
};

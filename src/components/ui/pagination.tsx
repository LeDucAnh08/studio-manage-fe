import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

function buildPageList(current: number, totalPages: number): (number | null)[] {
  const delta = 1;
  const range: (number | null)[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(totalPages - 1, current + delta);

  range.push(1);
  if (left > 2) range.push(null);
  for (let i = left; i <= right; i++) range.push(i);
  if (right < totalPages - 1) range.push(null);
  if (totalPages > 1) range.push(totalPages);

  return range;
}

export const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startItem = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, total);

  const pages = useMemo(() => buildPageList(safePage, totalPages), [safePage, totalPages]);

  const goTo = (p: number) => {
    if (p < 1 || p > totalPages || p === safePage) return;
    onPageChange(p);
  };

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t px-3 py-2',
        className,
      )}
    >
      <div className="text-xs sm:text-sm text-muted-foreground">
        {total === 0 ? (
          'Không có dữ liệu'
        ) : (
          <>
            Hiển thị <span className="font-medium text-foreground">{startItem}</span>–
            <span className="font-medium text-foreground">{endItem}</span> trên{' '}
            <span className="font-medium text-foreground">{total}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
            <span className="hidden sm:inline">Mỗi trang</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => goTo(1)}
            disabled={safePage === 1}
            aria-label="Trang đầu"
          >
            <ChevronsLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => goTo(safePage - 1)}
            disabled={safePage === 1}
            aria-label="Trang trước"
          >
            <ChevronLeft />
          </Button>

          {pages.map((p, idx) =>
            p === null ? (
              <span key={`gap-${idx}`} className="px-1 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                type="button"
                variant={p === safePage ? 'default' : 'ghost'}
                size="sm"
                className="h-8 min-w-8 px-2"
                onClick={() => goTo(p)}
              >
                {p}
              </Button>
            ),
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => goTo(safePage + 1)}
            disabled={safePage === totalPages}
            aria-label="Trang sau"
          >
            <ChevronRight />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => goTo(totalPages)}
            disabled={safePage === totalPages}
            aria-label="Trang cuối"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
};

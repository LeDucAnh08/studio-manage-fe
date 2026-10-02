import { Stars } from '@/components/ui/stars';
import { cn } from '@/lib/utils';
import type { FeedbackItem } from '@/types';

const ratingColor = (r: number) => {
  if (r >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (r >= 3) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

interface RatingBlockProps {
  label: string;
  item?: FeedbackItem | null;
  className?: string;
}

export const RatingBlock = ({ label, item, className }: RatingBlockProps) => {
  const rating = typeof item?.rating === 'number' && Number.isFinite(item.rating) ? item.rating : 0;
  return (
    <div className={cn('rounded-lg border bg-muted/30 px-3 py-2.5', className)}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <Stars value={rating} />
          <span className={cn('text-xs font-semibold', ratingColor(rating))}>
            {rating ? `${rating}/5` : 'Chưa đánh giá'}
          </span>
        </div>
      </div>
      {item?.description && (
        <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
          {item.description}
        </p>
      )}
    </div>
  );
};

import { useId, useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import '../../styles/customer-rating.css';

const ratingLabels = [
  'Chưa đánh giá',
  'Rất tệ',
  'Chưa tốt',
  'Bình thường',
  'Hài lòng',
  'Tuyệt vời',
];

interface CustomerRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  'aria-label'?: string;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

export function CustomerRatingInput({
  value,
  onChange,
  label,
  'aria-label': ariaLabel,
  className,
  id,
  required,
  disabled,
}: CustomerRatingInputProps) {
  const instanceId = useId();
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <fieldset id={id} disabled={disabled} className={cn('customer-rating', className)}>
      {label && (
        <legend className="customer-rating__label">
          {label}
          {required && (
            <span aria-hidden="true" className="customer-field__required">
              *
            </span>
          )}
        </legend>
      )}
      <div className="customer-rating__row" onMouseLeave={() => setHovered(0)}>
        <div
          className="customer-rating__options"
          role="radiogroup"
          aria-label={ariaLabel || label || 'Đánh giá'}
          aria-required={required || undefined}
          aria-describedby={instanceId + '-description'}
        >
          {[1, 2, 3, 4, 5].map((rating) => (
            <label
              key={rating}
              className="customer-rating__option"
              onMouseEnter={() => !disabled && setHovered(rating)}
            >
              <input
                type="radio"
                name={instanceId + '-rating'}
                value={rating}
                checked={rating === value}
                onChange={() => onChange(rating)}
                aria-label={rating + ' sao'}
              />
              <span className="customer-rating__star">
                <Star aria-hidden="true" className={rating <= active ? 'is-filled' : undefined} />
              </span>
            </label>
          ))}
        </div>
        <span id={instanceId + '-description'} className="customer-rating__description">
          {ratingLabels[active] || ratingLabels[0]}
        </span>
      </div>
    </fieldset>
  );
}

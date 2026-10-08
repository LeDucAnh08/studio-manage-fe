import type { ComponentType, ReactNode } from 'react';
import { CustomerSurface } from './CustomerSurface';
import '../../styles/customer-forms.css';

interface CustomerFeedbackSectionProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  required?: boolean;
  children: ReactNode;
}

export function CustomerFeedbackSection({
  icon: Icon,
  title,
  description,
  required,
  children,
}: CustomerFeedbackSectionProps) {
  return (
    <CustomerSurface className="customer-feedback-section" padding="compact">
      <header className="customer-feedback-section__header">
        <span className="customer-feedback-section__icon" aria-hidden="true">
          <Icon />
        </span>
        <div className="customer-form-header">
          <h2 className="customer-section-title">
            {title}
            {required && (
              <span className="customer-field__required" aria-hidden="true">
                *
              </span>
            )}
          </h2>
          <p className="customer-caption">{description}</p>
        </div>
      </header>
      <div className="customer-feedback-section__body">{children}</div>
    </CustomerSurface>
  );
}

import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CustomerOrderThumbnail } from './CustomerOrderThumbnail';

describe('customer order thumbnails', () => {
  it('uses an existing photo, falls back after failure and retries when the source changes', () => {
    const view = render(<CustomerOrderThumbnail src="/old.webp" service="rental" />);
    expect(view.container.querySelector('img')).toHaveAttribute('alt', '');
    fireEvent.error(view.container.querySelector('img')!);
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.querySelector('svg')).toBeInTheDocument();
    view.rerender(<CustomerOrderThumbnail src="/current.webp" service="rental" />);
    expect(view.container.querySelector('img')).toHaveAttribute('src', '/current.webp');
  });
});

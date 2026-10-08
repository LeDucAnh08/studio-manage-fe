import { useState, type FormEvent } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerImage } from './CustomerImage';
import { CustomerRatingInput } from './CustomerRatingInput';

describe('CustomerImage', () => {
  it('reserves the image dimensions, loads the hero first, and keeps a neutral frame on failure', () => {
    const { container, rerender } = render(
      <CustomerImage
        src="preview.webp"
        srcSet="preview.webp 640w, original.webp 4000w"
        sizes="320px"
        width={4000}
        height={6000}
        alt="Ảnh kỷ yếu của lớp"
        priority
      />,
    );
    const photo = screen.getByRole('img', { name: 'Ảnh kỷ yếu của lớp' });
    expect(photo).toHaveAttribute('width', '4000');
    expect(photo).toHaveAttribute('height', '6000');
    expect(photo).toHaveAttribute('loading', 'eager');
    expect(photo).toHaveAttribute('fetchpriority', 'high');
    expect(photo).toHaveAttribute('srcset', 'preview.webp 640w, original.webp 4000w');
    expect(container.firstElementChild).toHaveAttribute('data-status', 'loading');
    fireEvent.error(photo);
    expect(container.firstElementChild).toHaveAttribute('data-status', 'error');
    expect(screen.getByText('Không tải được ảnh')).toBeInTheDocument();
    expect(photo).toHaveAccessibleName('Ảnh kỷ yếu của lớp');

    rerender(<CustomerImage src="next.webp" width={640} height={640} alt="" />);
    const nextPhoto = container.querySelector('img')!;
    expect(nextPhoto).toHaveAttribute('loading', 'lazy');
    expect(container.firstElementChild).toHaveAttribute('data-status', 'loading');
    expect(screen.queryByText('Không tải được ảnh')).not.toBeInTheDocument();
    fireEvent.load(nextPhoto);
    expect(container.firstElementChild).toHaveAttribute('data-status', 'loaded');
  });

  it('recognizes a previously cached image without waiting for a second load event', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const naturalWidth = vi
      .spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get')
      .mockReturnValue(640);
    const { container } = render(
      <CustomerImage src="cached.webp" width={640} height={960} alt="" />,
    );
    expect(container.firstElementChild).toHaveAttribute('data-status', 'loaded');
    complete.mockRestore();
    naturalWidth.mockRestore();
  });
});

describe('CustomerRatingInput', () => {
  it('keeps independent native radio groups and value descriptions without submitting the form', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    function Ratings() {
      const [crew, setCrew] = useState(0);
      const [album, setAlbum] = useState(5);
      return (
        <form onSubmit={onSubmit}>
          <CustomerRatingInput
            aria-label="Đánh giá ekip"
            value={crew}
            onChange={setCrew}
            required
          />
          <CustomerRatingInput aria-label="Đánh giá album" value={album} onChange={setAlbum} />
        </form>
      );
    }
    render(<Ratings />);
    const crew = screen.getByRole('radiogroup', { name: 'Đánh giá ekip' });
    const album = screen.getByRole('radiogroup', { name: 'Đánh giá album' });
    expect(crew).toHaveAttribute('aria-required', 'true');
    expect(crew).toHaveAccessibleDescription('Chưa đánh giá');
    fireEvent.click(within(crew).getByRole('radio', { name: '4 sao' }));
    expect(crew).toHaveAccessibleDescription('Hài lòng');
    expect(within(crew).getByRole('radio', { name: '4 sao' })).toBeChecked();
    expect(within(album).getByRole('radio', { name: '5 sao' })).toBeChecked();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.mouseEnter(within(crew).getByRole('radio', { name: '1 sao' }).parentElement!);
    expect(crew).toHaveAccessibleDescription('Rất tệ');
    fireEvent.mouseLeave(crew.parentElement!);
    expect(crew).toHaveAccessibleDescription('Hài lòng');
  });
});

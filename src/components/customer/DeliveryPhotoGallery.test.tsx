import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeliveryPhotoGallery } from './DeliveryPhotoGallery';

const mocks = vi.hoisted(() => ({
  image: vi.fn(),
  auth: { user: { _id: 'client-a' }, token: 'token-a' },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../services/bookingDeliveryService', () => ({
  bookingDeliveryService: { image: mocks.image },
}));
const photos = [{ id: 'photo', name: 'edited.jpg', width: 1200, height: 800 }];
describe('Private gallery image lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth = { user: { _id: 'client-a' }, token: 'token-a' };
    URL.createObjectURL = vi.fn(() => 'blob:authorized-photo');
    URL.revokeObjectURL = vi.fn();
  });
  it('discards a response from the previous account and releases every created object URL', async () => {
    const oldBlob = new Blob(['old-private-photo']),
      newBlob = new Blob(['new-private-photo']);
    let resolveOld!: (blob: Blob) => void;
    mocks.image.mockImplementation((_booking: string, _photo: string, thumb: boolean) =>
      thumb
        ? Promise.resolve(new Blob(['thumb']))
        : mocks.auth.user._id === 'client-a'
          ? new Promise<Blob>((resolve) => {
              resolveOld = resolve;
            })
          : Promise.resolve(newBlob),
    );
    const page = render(<DeliveryPhotoGallery bookingId="booking" photos={photos} />);
    await waitFor(() => expect(mocks.image).toHaveBeenCalled());
    mocks.auth = { user: { _id: 'client-b' }, token: 'token-b' };
    page.rerender(<DeliveryPhotoGallery bookingId="booking" photos={photos} />);
    await waitFor(() =>
      expect(
        within(screen.getByRole('figure', { name: 'Ảnh đang xem' })).getByRole('img'),
      ).toHaveAttribute('src', 'blob:authorized-photo'),
    );
    await act(async () => resolveOld(oldBlob));
    expect(vi.mocked(URL.createObjectURL).mock.calls.some(([blob]) => blob === oldBlob)).toBe(
      false,
    );
    expect(vi.mocked(URL.createObjectURL).mock.calls.some(([blob]) => blob === newBlob)).toBe(true);
    expect(mocks.image.mock.calls[0][3]).toBeInstanceOf(AbortSignal);
    page.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:authorized-photo');
  });
  it('navigates with arrows, keyboard and thumbnails while downloading the selected image', async () => {
    mocks.image.mockResolvedValue(new Blob(['private-photo']));
    render(
      <DeliveryPhotoGallery
        bookingId="booking"
        photos={[...photos, { ...photos[0], id: 'second', name: 'second.jpg' }]}
      />,
    );
    const viewer = screen.getByRole('figure', { name: 'Ảnh đang xem' });
    await within(viewer).findByRole('img', { name: 'edited.jpg' });
    expect(screen.getByRole('button', { name: 'Ảnh trước' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ảnh tiếp' }));
    await within(viewer).findByRole('img', { name: 'second.jpg' });
    expect(screen.getByRole('link', { name: 'Tải ảnh đang xem' })).toHaveAttribute(
      'download',
      'second.jpg',
    );
    expect(screen.getByRole('button', { name: 'Ảnh tiếp' })).toBeDisabled();
    fireEvent.keyDown(viewer, { key: 'ArrowLeft' });
    await within(viewer).findByRole('img', { name: 'edited.jpg' });
    fireEvent.click(screen.getByRole('button', { name: 'Xem ảnh second.jpg' }));
    await within(viewer).findByRole('img', { name: 'second.jpg' });
    expect(screen.getByRole('button', { name: 'Xem ảnh second.jpg' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

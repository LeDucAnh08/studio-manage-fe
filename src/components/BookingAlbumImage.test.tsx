import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { albumClient, type AlbumPhoto } from '@/services/bookingAlbumService';
import { AlbumImage } from './BookingAlbumImage';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../services/api', () => ({ default: mocks }));

describe('Drive album image requests', () => {
  beforeEach(() => {
    mocks.get.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('limits both album clients to two requests, prioritizes full images and discards cancelled thumbnails', async () => {
    const starts: string[] = [];
    const finish = new Map<string, (failure?: Error) => void>();
    const blob = new Blob(['image'], { type: 'image/webp' });
    mocks.get.mockImplementation((url: string, config: { signal: AbortSignal }) => {
      const photo = url.split('/').pop()!;
      starts.push(photo);
      return new Promise((resolve, reject) => {
        config.signal.addEventListener('abort', () => reject(config.signal.reason), { once: true });
        finish.set(photo, (failure) => {
          if (failure) reject(failure);
          else resolve({ data: blob });
        });
      });
    });

    const studio = albumClient(true, 'booking');
    const customer = albumClient(false, 'shared-album', 'test-link');
    const controllers = Array.from({ length: 5 }, () => new AbortController());
    const [first, second, waiting, cancelled, opened] = [
      studio.image('first', true, controllers[0].signal),
      customer.image('second', true, controllers[1].signal),
      customer.image('waiting', true, controllers[2].signal),
      customer.image('cancelled', true, controllers[3].signal),
      customer.image('opened', false, controllers[4].signal),
    ];
    const settled = Promise.allSettled([first, second, waiting, cancelled, opened]);
    try {
      expect(starts).toEqual(['first', 'second']);
      controllers[3].abort();
      await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });

      finish.get('first')!(new Error('Drive busy'));
      await expect(first).rejects.toThrow('Drive busy');
      expect(starts).toEqual(['first', 'second', 'opened']);

      finish.get('opened')!();
      await expect(opened).resolves.toBe(blob);
      expect(starts).toEqual(['first', 'second', 'opened', 'waiting']);

      finish.get('waiting')!();
      finish.get('second')!();
      await expect(waiting).resolves.toBe(blob);
      await expect(second).resolves.toBe(blob);
    } finally {
      controllers.forEach((controller) => controller.abort());
      await settled;
    }
  });

  it('backs off after a busy API or Drive and reports a source error without retrying it', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const message = 'Không đọc được ảnh/thư mục Drive. Kiểm tra chế độ chia sẻ và nguồn ảnh.';
    const inaccessible = Object.assign(new Blob(), {
      text: async () => JSON.stringify({ message }),
    });
    mocks.get
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockRejectedValue({ response: { status: 409, data: inaccessible } });

    const photo: AlbumPhoto = {
      id: 'photo',
      source: 'drive',
      driveId: 'drive-photo',
      name: 'IMG_001.jpg',
      width: 100,
      height: 80,
      folderId: 'school',
      deliveryVersion: 0,
      available: true,
      selected: false,
      note: '',
    };
    await act(async () => {
      render(<AlbumImage client={albumClient(true, 'booking')} photo={photo} />);
    });

    expect(mocks.get).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1200));
    expect(mocks.get).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(2399));
    expect(mocks.get).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(mocks.get).toHaveBeenCalledTimes(3);
    expect(screen.getByText(message)).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(20000));
    expect(mocks.get).toHaveBeenCalledTimes(3);
  });
});

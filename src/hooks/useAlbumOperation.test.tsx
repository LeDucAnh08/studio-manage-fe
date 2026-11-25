import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAlbumOperation } from './useAlbumOperation';
import { SESSION_ENDED } from '../services/authSession';

const mocks = vi.hoisted(() => ({ latest: vi.fn(), get: vi.fn() }));
vi.mock('../services/backgroundJobService', () => ({ backgroundJobService: mocks }));
const pending = {
  id: 'job-1',
  service: 'yearbook' as const,
  orderId: 'order-1',
  status: 'pending' as const,
  message: '',
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.latest.mockResolvedValue(pending);
});
afterEach(() => vi.useRealTimers());

describe('album operation tracking', () => {
  it('restores pending work, shows progress and refreshes only after success', async () => {
    const complete = vi.fn().mockResolvedValue(undefined);
    mocks.get
      .mockResolvedValueOnce({ ...pending, status: 'running' })
      .mockResolvedValueOnce({ ...pending, status: 'succeeded' });
    const { result, unmount } = renderHook(() =>
      useAlbumOperation('yearbook', 'order-1', true, complete),
    );
    await act(async () => {});
    expect(result.current.pending).toBe(true);
    expect(complete).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current.message).toMatch('Đang đồng bộ');
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current.pending).toBe(false);
    expect(complete).toHaveBeenCalledOnce();
    unmount();
  });
  it('keeps a failed operation visible without discarding the current album', async () => {
    mocks.get.mockResolvedValue({ ...pending, status: 'failed', message: 'Album đã thay đổi.' });
    const complete = vi.fn();
    const { result, unmount } = renderHook(() =>
      useAlbumOperation('yearbook', 'order-1', true, complete),
    );
    await act(async () => {});
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current.failed).toBe(true);
    expect(result.current.message).toMatch('gửi yêu cầu mới');
    expect(complete).not.toHaveBeenCalled();
    unmount();
  });
  it('stops polling immediately when the account session ends', async () => {
    const { result, unmount } = renderHook(() =>
      useAlbumOperation('yearbook', 'order-1', true, vi.fn()),
    );
    await act(async () => {});
    act(() => window.dispatchEvent(new Event(SESSION_ENDED)));
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(mocks.get).not.toHaveBeenCalled();
    expect(result.current.message).toBe('');
    unmount();
  });
  it('does not expose operation requests in customer-only views', async () => {
    const { unmount } = renderHook(() => useAlbumOperation('concept', 'order-1', false, vi.fn()));
    await act(async () => {});
    expect(mocks.latest).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
    unmount();
  });
  it('refreshes after a retried submission returns an already completed operation', async () => {
    mocks.latest.mockResolvedValue(null);
    const complete = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() =>
      useAlbumOperation('yearbook', 'order-1', true, complete),
    );
    await act(async () => {});
    await act(async () => result.current.watch({ ...pending, status: 'succeeded' }));
    expect(complete).toHaveBeenCalledOnce();
    expect(result.current.pending).toBe(false);
    unmount();
  });
  it('aborts an in-flight request and ignores its result after navigation', async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.get.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const complete = vi.fn();
    const { unmount } = renderHook(() => useAlbumOperation('yearbook', 'order-1', true, complete));
    await act(async () => {});
    await act(() => vi.advanceTimersByTimeAsync(500));
    const signal = mocks.get.mock.calls[0][1] as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => resolve({ ...pending, status: 'succeeded' }));
    expect(complete).not.toHaveBeenCalled();
  });
});

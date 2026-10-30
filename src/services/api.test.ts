import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';

const originalAdapter = api.defaults.adapter;
let previousToken: string | null;
let previousUser: string | null;

function observeLocation(path: string) {
  const url = new URL(path, 'https://studio.example');
  const navigate = vi.fn();
  vi.stubGlobal('window', {
    location: {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      get href() {
        return url.href;
      },
      set href(value: string) {
        navigate(value);
      },
    },
  });
  return navigate;
}

describe('API authentication failure redirects', () => {
  beforeEach(() => {
    previousToken = localStorage.getItem('token');
    previousUser = localStorage.getItem('user');
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ username: 'test-user', roles: [6] }));
    api.defaults.adapter = async (config) => {
      throw new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, {
        data: { message: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      });
    };
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    vi.unstubAllGlobals();
    if (previousToken === null) localStorage.removeItem('token');
    else localStorage.setItem('token', previousToken);
    if (previousUser === null) localStorage.removeItem('user');
    else localStorage.setItem('user', previousUser);
  });

  it('keeps a login 401 on the form without clearing credentials or navigating', async () => {
    const navigate = observeLocation('/login?returnTo=%2Faccount%2Fbookings');
    await expect(
      api.post('/auth/login', { username: 'test-user', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem('token')).toBe('test-token');
    expect(JSON.parse(localStorage.getItem('user') || 'null')).toEqual({
      username: 'test-user',
      roles: [6],
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    '/account/bookings/booking-1?source=portfolio#payment',
    '/booking/start?package=package-1&source=pricing#review',
    '/rental/start?item=costume-1#review',
  ])(
    'clears expired credentials and preserves the complete customer return path %s',
    async (path) => {
      const navigate = observeLocation(path);
      await expect(api.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith('/login?returnTo=' + encodeURIComponent(path));
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    },
  );

  it('sends an expired staff session to the shared login', async () => {
    const navigate = observeLocation('/profile?tab=password#change');
    await expect(api.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it.each(['/register?returnTo=%2Fbooking%2Fstart', '/portfolio#contact'])(
    'keeps the customer login entry without a return parameter for public path %s',
    async (path) => {
      const navigate = observeLocation(path);
      await expect(api.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith('/login');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    },
  );
});

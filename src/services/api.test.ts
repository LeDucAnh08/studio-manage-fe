import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { SESSION_ENDED } from './authSession';

const originalAdapter = api.defaults.adapter;
const token = (exp = Date.now() / 1000 + 3600) =>
  `header.${btoa(JSON.stringify({ exp }))}.signature`;
const unauthorized = (config: InternalAxiosRequestConfig) =>
  new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, {
    data: {},
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  });

describe('API session boundary', () => {
  const ended = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', token());
    localStorage.setItem('user', JSON.stringify({ roles: [6] }));
    window.addEventListener(SESSION_ENDED, ended);
    api.defaults.adapter = async (config) => {
      throw unauthorized(config);
    };
  });
  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    window.removeEventListener(SESSION_ENDED, ended);
    localStorage.clear();
  });
  it('clears rejected sessions and immediately notifies mounted guards', async () => {
    await expect(api.get('/public/packages')).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(ended).toHaveBeenCalledOnce();
  });
  it('leaves a failed login on its form without terminating another session', async () => {
    await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem('token')).not.toBeNull();
    expect(ended).not.toHaveBeenCalled();
  });
  it.each([token(1), 'malformed', `header.${btoa('{}')}.signature`])(
    'cancels expired or malformed credentials before any protected request: %s',
    async (credential) => {
      localStorage.setItem('token', credential);
      const adapter = vi.fn();
      api.defaults.adapter = adapter;
      await expect(api.post('/concept-orders', {})).rejects.toMatchObject({ code: 'ERR_CANCELED' });
      expect(adapter).not.toHaveBeenCalled();
      expect(ended).toHaveBeenCalledOnce();
    },
  );
  it('allows anonymous portfolio statistics after clearing an expired token', async () => {
    localStorage.setItem('token', token(1));
    api.defaults.adapter = async (config) => {
      expect(config.headers.Authorization).toBeUndefined();
      return {
        data: { classes: 4, schools: 2 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    expect((await api.get('/public/portfolio-stats')).status).toBe(200);
    expect(ended).toHaveBeenCalledOnce();
  });
  it('does not let an old 401 terminate a newer login', async () => {
    let reject!: () => void;
    api.defaults.adapter = (config) =>
      new Promise((_resolve, fail) => {
        reject = () => fail(unauthorized(config));
      });
    const request = api.get('/auth/me');
    await vi.waitFor(() => expect(reject).toBeTypeOf('function'));
    localStorage.setItem('token', token(Date.now() / 1000 + 7200));
    reject();
    await expect(request).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem('token')).not.toBeNull();
    expect(ended).not.toHaveBeenCalled();
  });
});

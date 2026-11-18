import axios, { CanceledError } from 'axios';
import { endSession, tokenExpiresAt } from './authSession';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !['/auth/login', '/auth/register'].includes(config.url || '')) {
    if (tokenExpiresAt(token) <= Date.now()) {
      endSession(token);
      if (config.url !== '/public/portfolio-stats')
        throw new CanceledError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return config;
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      const authorization = error.config?.headers?.Authorization;
      const requestToken =
        typeof authorization === 'string' && authorization.startsWith('Bearer ')
          ? authorization.slice(7)
          : undefined;
      if (requestToken || !localStorage.getItem('token')) endSession(requestToken);
    }
    return Promise.reject(error);
  },
);

export default api;

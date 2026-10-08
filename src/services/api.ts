import axios from 'axios';
import { loginEntryForPath } from '../utils/loginEntry';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const canResume =
        path.startsWith('/account/') ||
        path.startsWith('/booking/start') ||
        path.startsWith('/rental/start');
      window.location.href = canResume
        ? `/login?returnTo=${encodeURIComponent(path)}`
        : loginEntryForPath(window.location.pathname);
    }
    return Promise.reject(error);
  },
);

export default api;

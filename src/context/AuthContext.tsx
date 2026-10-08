import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';
import { clearBookingDraft, reconcileBookingDraftAccount } from '../services/bookingDraft';
import { clearRentalDraft, reconcileRentalDraft } from '../services/rentalDraft';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    if (!stored || stored === 'undefined' || stored === 'null') return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(
    () => !!localStorage.getItem('token'),
  );

  // On mount: if a token exists, call /auth/refresh to validate it and get a
  // fresh token + up-to-date user data (e.g. role changes since last login).
  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    authService
      .refresh()
      .then((res) => {
        reconcileBookingDraftAccount(res.user, user);
        reconcileRentalDraft(res.user);
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
      })
      .catch(() => {
        // Token is invalid/expired — clear everything; axios interceptor will
        // redirect to /login, but we also clean up state here defensively.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsBootstrapping(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await authService.login(username, password);
      reconcileBookingDraftAccount(res.user, user);
      reconcileRentalDraft(res.user);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res.user;
    },
    [user],
  );

  const logout = useCallback(() => {
    clearBookingDraft();
    clearRentalDraft();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, updateUser, isAuthenticated: !!token, isBootstrapping }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

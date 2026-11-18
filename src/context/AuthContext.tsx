import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';
import { clearBookingDraft, reconcileBookingDraftAccount } from '../services/bookingDraft';
import { clearRentalDraft, reconcileRentalDraft } from '../services/rentalDraft';
import { endSession, SESSION_ENDED, tokenExpiresAt } from '../services/authSession';

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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(
    () => !!localStorage.getItem('token'),
  );

  const generation = useRef(0);
  const invalidatePending = useCallback(() => {
    generation.current++;
  }, []);
  const clearState = useCallback(() => {
    invalidatePending();
    setToken(null);
    setUser(null);
    setIsBootstrapping(false);
  }, [invalidatePending]);
  const saveSession = useCallback((res: { token: string; user: User }) => {
    reconcileBookingDraftAccount(res.user);
    reconcileRentalDraft(res.user);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setIsBootstrapping(false);
  }, []);
  const bootstrap = useCallback(
    async (renew = true) => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken || tokenExpiresAt(storedToken) <= Date.now()) {
        endSession(storedToken || undefined);
        return;
      }
      const request = ++generation.current;
      setIsBootstrapping(true);
      try {
        const res = renew
          ? await authService.refresh()
          : { token: storedToken, user: await authService.getMe() };
        if (request === generation.current && localStorage.getItem('token') === storedToken)
          saveSession(res);
      } catch {
        if (request === generation.current) endSession(storedToken);
      }
    },
    [saveSession],
  );

  useEffect(() => {
    const storage = (event: StorageEvent) => {
      if (event.key === 'token' || event.key === null) void bootstrap(false);
    };
    window.addEventListener(SESSION_ENDED, clearState);
    window.addEventListener('storage', storage);
    void bootstrap();
    return () => {
      invalidatePending();
      window.removeEventListener(SESSION_ENDED, clearState);
      window.removeEventListener('storage', storage);
    };
  }, [bootstrap, clearState, invalidatePending]);

  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      if (localStorage.getItem('token') !== token) {
        void bootstrap(false);
        return;
      }
      const remaining = tokenExpiresAt(token) - Date.now();
      if (remaining <= 0) endSession(token);
      else {
        clearTimeout(timer);
        timer = setTimeout(check, Math.min(remaining, 2_147_483_647));
      }
    };
    check();
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [token, bootstrap]);

  const login = useCallback(
    async (username: string, password: string) => {
      const request = ++generation.current;
      setIsBootstrapping(false);
      const res = await authService.login(username, password);
      if (request !== generation.current) throw new Error('Phiên đăng nhập đã thay đổi.');
      reconcileBookingDraftAccount(res.user, user);
      saveSession(res);
      return res.user;
    },
    [user, saveSession],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem('yume-concept-draft-v1');
    clearBookingDraft();
    clearRentalDraft();
    endSession();
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
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user && !!token,
        isBootstrapping,
      }}
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

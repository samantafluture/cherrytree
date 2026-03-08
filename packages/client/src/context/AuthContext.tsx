/**
 * Authentication context — session state, login/logout actions.
 *
 * @example
 *   const { user, login, logout } = useAuth();
 *
 * @consumers App.tsx, components/
 * @depends api/client.ts
 */

import type { User } from '@cherrytree/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { api, getToken, setToken } from '../api';

type AuthUser = Pick<User, 'id' | 'email' | 'username'>;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (
    email: string,
    username: string,
    password: string,
  ) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    // Validate the token by making a simple API call
    api.outlines.list().then((res) => {
      if (res.error) {
        setToken(null);
        setUser(null);
      }
      // If the token works, we just know we're authed but don't have user data
      // We'll set a minimal user from localStorage
      const stored = localStorage.getItem('cherrytree_user');
      if (stored && !res.error) {
        setUser(JSON.parse(stored) as AuthUser);
      } else if (res.error) {
        setToken(null);
      }
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    if (res.error || !res.data) return res.error?.message ?? 'Login failed';
    setToken(res.data.token);
    const authUser: AuthUser = res.data.user
      ? {
          id: res.data.user.id,
          email: res.data.user.email,
          username: res.data.user.username,
        }
      : { id: '', email, username: '' };
    setUser(authUser);
    localStorage.setItem('cherrytree_user', JSON.stringify(authUser));
    return null;
  }, []);

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      const res = await api.auth.register(email, username, password);
      if (res.error || !res.data) {
        return res.error?.message ?? 'Registration failed';
      }
      setToken(res.data.token);
      const authUser: AuthUser = {
        id: res.data.user.id,
        email: res.data.user.email,
        username: res.data.user.username,
      };
      setUser(authUser);
      localStorage.setItem('cherrytree_user', JSON.stringify(authUser));
      return null;
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.auth.logout();
    setToken(null);
    setUser(null);
    localStorage.removeItem('cherrytree_user');
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

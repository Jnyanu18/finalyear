'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { withApiOrigin } from '@/lib/api-base';

export type AppUser = {
  id: string;
  email: string;
};

type AuthActionResult = {
  ok: boolean;
  error?: string;
};

const TOKEN_KEY = 'agrinexus_token';
const USER_KEY = 'agrinexus_user';

type AuthContextValue = {
  user: AppUser | null;
  isUserLoading: boolean;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (email: string, password: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function postAuth(
  paths: string[],
  email: string,
  password: string
): Promise<{ user: AppUser | null; error?: string }> {
  let lastError = 'Authentication failed.';
  for (const path of paths) {
    try {
      const response = await fetch(withApiOrigin(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await readJson(response);
      if (!response.ok) {
        lastError = body?.error || body?.message || `Authentication failed (${response.status}).`;
        if (response.status === 404) {
          continue;
        }
        return { user: null, error: lastError };
      }
      const data = body?.data ?? body;
      const token = data?.token;
      const user = data?.user || body?.user || null;
      if (token) {
        localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
      }
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      return { user };
    } catch {
      lastError = 'Unable to reach auth service.';
    }
  }
  return { user: null, error: lastError };
}

async function getMe(paths: string[], token: string | null) {
  for (const path of paths) {
    try {
      const response = await fetch(withApiOrigin(path), {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
      });
      const body = await readJson(response);
      if (!response.ok) {
        if (response.status === 404) {
          continue;
        }
        return { user: null, ok: false };
      }
      const data = body?.data ?? body;
      return { user: data?.user || body?.user || null, ok: true };
    } catch {
      // try next path
    }
  }
  return { user: null, ok: false };
}

async function postLogout(paths: string[], token: string | null) {
  for (const path of paths) {
    try {
      const response = await fetch(withApiOrigin(path), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.status === 404) {
        continue;
      }
      return;
    } catch {
      // try next path
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const rawToken = localStorage.getItem(TOKEN_KEY);
      const token = rawToken ? JSON.parse(rawToken) : null;
      const result = await getMe(['/api/v1/auth/me', '/api/auth/me'], token);
      if (!result.user && !result.ok) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      setUser(result.user);
    } catch {
      setUser(null);
    } finally {
      setIsUserLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    const result = await postAuth(['/api/v1/auth/login', '/api/auth/login'], email, password);
    if (!result.user) {
      return { ok: false, error: result.error };
    }
    setUser(result.user);
    return { ok: true };
  }, []);

  const register = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    const result = await postAuth(['/api/v1/auth/register', '/api/auth/register'], email, password);
    if (!result.user) {
      return { ok: false, error: result.error };
    }
    setUser(result.user);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    try {
      const rawToken = localStorage.getItem(TOKEN_KEY);
      const token = rawToken ? JSON.parse(rawToken) : null;
      await postLogout(['/api/v1/auth/logout', '/api/auth/logout'], token);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isUserLoading, refreshUser, login, register, logout }),
    [isUserLoading, login, logout, refreshUser, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('Auth hooks must be used inside AuthProvider.');
  }
  return context;
}

export function useUser() {
  const { user, isUserLoading } = useAuthContext();
  return { user, isUserLoading };
}

export function useAuth() {
  return useAuthContext();
}

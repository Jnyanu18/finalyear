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

async function postAuth(path: string, email: string, password: string): Promise<{ user: AppUser | null; error?: string }> {
  try {
    const response = await fetch(withApiOrigin(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const body = await readJson(response);
    if (!response.ok) {
      return { user: null, error: body?.error || 'Authentication failed.' };
    }
    return { user: body?.user || null };
  } catch {
    return { user: null, error: 'Unable to reach auth service.' };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch(withApiOrigin('/api/auth/me'), {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await readJson(response);
      setUser(body?.user || null);
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
    const result = await postAuth('/api/auth/login', email, password);
    if (!result.user) {
      return { ok: false, error: result.error };
    }
    setUser(result.user);
    return { ok: true };
  }, []);

  const register = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    const result = await postAuth('/api/auth/register', email, password);
    if (!result.user) {
      return { ok: false, error: result.error };
    }
    setUser(result.user);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(withApiOrigin('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
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

"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import type { AuthUser } from "./types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  can: (perm: string) => boolean;
}

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
  can: () => false,
});

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!api.getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.me());
    } catch {
      api.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/login";
  }, []);

  const can = useCallback(
    (perm: string) => !!user && user.permissions.includes(perm),
    [user]
  );

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refresh, can }}>
      {children}
    </AuthCtx.Provider>
  );
}

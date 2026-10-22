"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokens } from "./api";
import type { Me, TokenResponse } from "./types";

type AuthState = {
  user: Me | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name?: string;
    organization_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  const reload = useCallback(async () => {
    if (!tokens.access && !tokens.refresh) {
      setUser(null);
      setStatus("anonymous");
      return;
    }
    try {
      setUser(await api<Me>("/organizations/me"));
      setStatus("authenticated");
    } catch {
      tokens.clear();
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- session restore reads localStorage, only available after mount
    reload();
    const onUnauthorized = () => {
      setUser(null);
      setStatus("anonymous");
    };
    window.addEventListener("mk:unauthorized", onUnauthorized);
    return () => window.removeEventListener("mk:unauthorized", onUnauthorized);
  }, [reload]);

  const login = useCallback(
    async (email: string, password: string) => {
      const t = await api<TokenResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      tokens.set(t);
      await reload();
    },
    [reload],
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      full_name?: string;
      organization_name: string;
    }) => {
      const t = await api<TokenResponse>("/auth/register", {
        method: "POST",
        body: data,
        auth: false,
      });
      tokens.set(t);
      await reload();
    },
    [reload],
  );

  const logout = useCallback(async () => {
    const refresh = tokens.refresh;
    if (refresh) {
      await api("/auth/logout", { method: "POST", body: { refresh_token: refresh }, auth: false }).catch(() => {});
    }
    tokens.clear();
    setUser(null);
    setStatus("anonymous");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout, reload }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function canWrite(user: Me | null) {
  const role = user?.membership?.role_code ?? "";
  return ["owner", "auditor", "admin"].includes(role);
}

"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api";

export type User = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "hr" | "employee";
  employee_id: number | null;
  employee_code: string | null;
  must_change_password: boolean;
  company_name: string;
};

type Ctx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); setLoading(false); return; }
    try { setUser(await api<User>("/auth/me")); } catch { tokenStore.clear(); setUser(null); }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onLogout = () => setUser(null);
    window.addEventListener("hcm-logout", onLogout);
    return () => window.removeEventListener("hcm-logout", onLogout);
  }, [refresh]);

  const setSession = (token: string, u: User) => { tokenStore.set(token); setUser(u); };
  const login = async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>("/auth/login", { body: { email, password } });
    setSession(r.token, r.user);
    return r.user;
  };
  const logout = () => { api("/auth/logout", { method: "POST" }).catch(() => {}); tokenStore.clear(); setUser(null); };

  return <AuthCtx.Provider value={{ user, loading, login, setSession, logout, refresh }}>{children}</AuthCtx.Provider>;
}

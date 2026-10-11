import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Me = { email: string; credits: number; unlimited?: boolean; nextRefillAt: number };

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as any).error ?? "Error");
  return data as T;
}

type Ctx = { me: Me | null; loaded: boolean; reload: () => Promise<void>; logout: () => Promise<void> };
const AuthCtx = createContext<Ctx>({ me: null, loaded: false, reload: async () => {}, logout: async () => {} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(() => api<Me>("/api/me").then(setMe).catch(() => setMe(null)).finally(() => setLoaded(true)), []);
  const logout = useCallback(async () => { await api("/api/auth/logout", {}); setMe(null); }, []);
  useEffect(() => { reload(); }, [reload]);
  return <AuthCtx.Provider value={{ me, loaded, reload, logout }}>{children}</AuthCtx.Provider>;
}

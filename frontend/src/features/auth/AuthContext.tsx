import React, { createContext, useEffect, useState } from "react";
import { getMe, login as loginApi } from "./api";

export type Role = "CUSTOMER" | "STAFF" | "ADMIN";
export type User = { id: number; name: string; role: Role };

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthCtx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rbos_token");
    (async () => {
      if (!token) return setLoading(false);
      try {
        const me = await getMe();
        setUser(me);
      } catch {
        localStorage.removeItem("rbos_token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user } = await loginApi({ email, password });
    localStorage.setItem("rbos_token", token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("rbos_token");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

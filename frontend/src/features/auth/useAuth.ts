// src/features/auth/useAuth.ts
import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const AUTH_DEBUG_TAG = "RBOS_AUTH_v1";


export type User = {
  userId?: string;
  id?: string;
  email: string;
  role: string;
  name?: string;
  fullName?: string;
  full_name?: string;
  avatarUrl?: string;
};

export type AuthContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  signup: (data: { full_name?: string; name?: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};


const AuthContext = createContext<AuthContextType | undefined>(undefined);


const storage = sessionStorage;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);


  const saveMe = (me: User | null) => {
    if (me) {
      try { storage.setItem("rbos_user", JSON.stringify(me)); } catch {}
    } else {
      storage.removeItem("rbos_user");
    }
    setUser(me);
  };


  const fetchMe = async (): Promise<User | null> => {
    try {
      const r = await fetch("/RBOS/api/auth/me", { credentials: "include" });
      if (r.ok) {
        const me = (await r.json()) as User;
        saveMe(me);
        return me;
      }
    } catch {}

    saveMe(null);
    return null;
  };


  useEffect(() => {

    const raw = storage.getItem("rbos_user");
    if (raw) { try { setUser(JSON.parse(raw)); } catch {} }


    (async () => { await fetchMe(); })();
  }, []);

  const loginWithCredentials = async (email: string, password: string) => {
    const res = await fetch("/RBOS/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      let msg = "Login failed";
      try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
      throw new Error(msg);
    }
    const me = await fetchMe();
    if (!me) throw new Error("Could not load user profile after login.");
  };

  const signup = async (data: { full_name?: string; name?: string; email: string; phone?: string; password: string }) => {
    const payload = {
      full_name: data.full_name ?? data.name ?? "",
      email: data.email,
      phone: data.phone ?? "",
      password: data.password,
    };
    const res = await fetch("/RBOS/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = "Registration failed";
      try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
      throw new Error(msg);
    }
    await fetchMe();
  };

  const logout = async () => {
    try { await fetch("/RBOS/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    saveMe(null);
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { user, setUser, loginWithCredentials, signup, logout } },
    children
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() called outside <AuthProvider>");
  }
  return ctx;
}

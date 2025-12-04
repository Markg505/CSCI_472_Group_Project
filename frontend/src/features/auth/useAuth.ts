import { createContext, useCallback, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, type LoginResponse, API_BASE } from '../../api/client';

export const AUTH_DEBUG_TAG = "useAuth";

export type User = {
  userId?: string;
  id?: string;
  email: string;
  role: string;
  name?: string;
  fullName?: string;
  full_name?: string;
  avatarUrl?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

export type AuthContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  signup: (data: {
    full_name?: string;
    name?: string;
    email: string;
    phone?: string;
    password: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    address2?: string;
  }) => Promise<void>;
  updateProfile: (data: {
    fullName: string;
    email: string;
    phone?: string;
    address: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
  }) => Promise<User>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  refreshProfile: () => Promise<User | null>;
  logout: () => Promise<void>;
};


const AuthContext = createContext<AuthContextType | undefined>(undefined);


const storage = sessionStorage;

const AUTH_BASE = `${API_BASE}/auth`;

async function extractMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.clone().json();
    if (body?.message) return body.message as string;
  } catch {
  }
  try {
    const text = await res.text();
    if (text) return text;
  } catch {
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);


  const saveMe = useCallback((me: User | null) => {
    if (me) {
      try { storage.setItem("rbos_user", JSON.stringify(me)); } catch {
      }
    } else {
      storage.removeItem("rbos_user");
    }
    setUser(me);
  }, []);


  const fetchMe = useCallback(async (): Promise<User | null> => {
    try {
      const r = await fetch(`${AUTH_BASE}/me`, { credentials: "include" });
      if (r.ok) {
        const me = (await r.json()) as User;
        saveMe(me);
        return me;
      }
    } catch {
    }

    saveMe(null);
    return null;
  }, [saveMe]);


  useEffect(() => {

    const raw = storage.getItem("rbos_user");
    if (raw) { try { setUser(JSON.parse(raw)); } catch { } }


    (async () => { await fetchMe(); })();
  }, [fetchMe]);

  const loginWithCredentials = async (email: string, password: string) => {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      let msg = "Login failed";
      try { const j = await res.json(); if (j?.message) msg = j.message; } catch {
      }
      throw new Error(msg);
    }
    try {
      const loginDetails = (await res.json()) as LoginResponse;
      const cartToken = loginDetails?.cartToken ?? loginDetails?.cart?.cartToken;
      if (cartToken) {
        apiClient.updateCartToken(cartToken);
      }
      if (loginDetails?.cart?.conflicts) {
        try {
          sessionStorage.setItem('rbos_cart_conflicts', JSON.stringify(loginDetails.cart.conflicts));
        } catch {
        }
      }
    } catch {
    }
    const me = await fetchMe();
    if (!me) throw new Error("Could not load user profile after login.");
  };

  const signup = async (data: {
    full_name?: string;
    name?: string;
    email: string;
    phone?: string;
    password: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    address2?: string;
  }) => {
    const payload = {
      full_name: data.full_name ?? data.name ?? "",
      email: data.email,
      phone: data.phone ?? "",
      password: data.password,
      address: data.address,
      address2: data.address2 ?? "",
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
    };
    const res = await fetch(`${AUTH_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = "Registration failed";
      try { const j = await res.json(); if (j?.message) msg = j.message; } catch { /* Ignore JSON parse errors */ }
      throw new Error(msg);
    }
    await fetchMe();
  };

  const updateProfile = async (data: { fullName: string; email: string; phone?: string; address: string; address2?: string; city: string; state: string; postalCode: string }) => {
    const res = await fetch(`${AUTH_BASE}/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone ?? "",
        address: data.address,
        address2: data.address2 ?? "",
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
      }),
    });

    if (!res.ok) {
      throw new Error(await extractMessage(res, "Profile update failed"));
    }

    const updated = (await res.json()) as User;
    saveMe(updated);
    return updated;
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
    const res = await fetch(`${AUTH_BASE}/me/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    });

    if (!res.ok) {
      throw new Error(await extractMessage(res, "Password update failed"));
    }
  };

  const refreshProfile = async () => fetchMe();

  const logout = async () => {
    try { await fetch(`${AUTH_BASE}/logout`, { method: "POST", credentials: "include" }); } catch {
    }
    saveMe(null);
  };

  return createElement(
    AuthContext.Provider,
    { value: { user, setUser, loginWithCredentials, signup, updateProfile, changePassword, refreshProfile, logout } },
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

import { createContext, useCallback, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, type LoginResponse, type User as ApiClientUser, type ProfileUpdatePayload } from '../../api/client';

export const AUTH_DEBUG_TAG = "useAuth";

export type User = ApiClientUser;

export type AuthContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  signup: (data: { full_name?: string; name?: string; email: string; phone?: string; password: string }) => Promise<void>;
  updateProfile: (data: ProfileUpdatePayload) => Promise<User>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  refreshProfile: () => Promise<User | null>;
  logout: () => Promise<void>;
};


const AuthContext = createContext<AuthContextType | undefined>(undefined);


const storage = sessionStorage;

async function extractMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.clone().json();
    if (body?.message) return body.message as string;
  } catch {
    // ignore
  }
  try {
    const text = await res.text();
    if (text) return text;
  } catch {
    // ignore
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);


  const saveMe = useCallback((me: User | null) => {
    if (me) {
      try { storage.setItem("rbos_user", JSON.stringify(me)); } catch {
        // Ignore storage errors (e.g., quota exceeded)
      }
    } else {
      storage.removeItem("rbos_user");
    }
    setUser(me);
  }, []);


  const fetchMe = useCallback(async (): Promise<User | null> => {
    try {
      const r = await fetch("/RBOS/api/auth/me", { credentials: "include" });
      if (r.ok) {
        const me = (await r.json()) as User;
        saveMe(me);
        return me;
      }
    } catch {
      // Ignore fetch errors - user is not authenticated
    }

    saveMe(null);
    return null;
  }, [saveMe]);


  useEffect(() => {

    const raw = storage.getItem("rbos_user");
    if (raw) { try { setUser(JSON.parse(raw)); } catch { /* Ignore parse errors */ } }


    (async () => { await fetchMe(); })();
  }, [fetchMe]);

  const loginWithCredentials = async (email: string, password: string) => {
    const res = await fetch("/RBOS/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      let msg = "Login failed";
      try { const j = await res.json(); if (j?.message) msg = j.message; } catch {
        // Ignore JSON parse errors - use default message
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
          // ignore session storage errors
        }
      }
    } catch {
      // login response body not required
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
      try { const j = await res.json(); if (j?.message) msg = j.message; } catch { /* Ignore JSON parse errors */ }
      throw new Error(msg);
    }
    await fetchMe();
  };

  const updateProfile = async (data: ProfileUpdatePayload) => {
    if (!user?.userId) {
      throw new Error("User not authenticated");
    }
    const updated = await apiClient.updateMyProfile(user.userId, data);
    saveMe(updated);
    return updated;
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
    const res = await fetch("/RBOS/api/auth/me/password", {
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
    try { await fetch("/RBOS/api/auth/logout", { method: "POST", credentials: "include" }); } catch {
      // Ignore logout errors - proceed with local cleanup
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
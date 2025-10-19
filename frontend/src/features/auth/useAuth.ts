import { useContext } from "react";
import { AuthCtx, type AuthContextValue } from "./AuthContext";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

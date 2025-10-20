import { http } from "../../lib/http";

export async function login(body: { email: string; password: string }) {
  // TEMP: mock while backend is not ready:
  // Remove this block when Java /auth/login is live.
  if (import.meta.env.DEV) {
    await new Promise(r => setTimeout(r, 400));
    if (body.email && body.password) {
      return {
        token: "dev.fake.jwt",
        user: { id: 1, name: "Dev User", role: "CUSTOMER" as const },
      };
    }
    throw new Error("Invalid credentials");
  }

  const { data } = await http.post("/auth/login", body);
  return data as { token: string; user: { id: number; name: string; role: "CUSTOMER"|"STAFF"|"ADMIN" } };
}

export async function getMe() {
  const { data } = await http.get("/auth/me");
  return data as { id: number; name: string; role: "CUSTOMER"|"STAFF"|"ADMIN" };
}

import { http } from "../../lib/http";

export type User = { id: string; name: string; role: "CUSTOMER" | "STAFF" | "ADMIN" };

export async function login(body: { email: string; password: string }) {
  // TEMP: mock while backend is not ready:
  // Remove this block when Java /auth/login is live.
  if (import.meta.env.DEV) {
    await new Promise(r => setTimeout(r, 400));
    if (body.email && body.password) {
      return {
        token: "dev.fake.jwt",
        user: { id: '1', name: "Dev User", role: "CUSTOMER" as const },
      };
    }
    throw new Error("Invalid credentials");
  }

  const { data } = await http.post("/auth/login", body);
  return data as { token: string; user: User };
}

export async function getMe() {
  const { data } = await http.get("/auth/me");
  return data as User;
}

export async function signup(body: {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}) {
  // TEMP: mock while backend is not ready:
  // Remove this block when Java /auth/signup is live.
  const idNumber = (Math.floor(Math.random() * 1000) + 2)
  if (import.meta.env.DEV) {
    await new Promise(r => setTimeout(r, 400));
    // Mock successful signup
    return {
      token: "dev.fake.jwt",
      user: { 
        id: idNumber.toString(), // Different ID from login mock
        name: body.full_name, 
        role: "CUSTOMER" as const 
      },
    };
  }

  // Real implementation when backend is ready
  const { data } = await http.post("/auth/signup", body);
  return data as { token: string; user: User };
}
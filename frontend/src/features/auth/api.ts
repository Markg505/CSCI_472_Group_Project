import { http } from "../../lib/http";

export type User = { id: string; name: string; role: "CUSTOMER" | "STAFF" | "ADMIN" };

export async function login(body: { email: string; password: string }) {
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
  const { data } = await http.post("/auth/register", body);
  return data as { token: string; user: User };
}
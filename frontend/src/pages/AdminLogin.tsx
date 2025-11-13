import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

type FormData = { email: string; password: string };

export default function AdminLoginPage() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const onSubmit = async (v: FormData) => {
    try {
      const res = await fetch("/RBOS/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: v.email.trim().toLowerCase(),
          password: v.password,
        }),
      });

      if (!res.ok) {
        let msg = "Login failed";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      // Get user profile
      const meRes = await fetch("/RBOS/api/auth/me", { credentials: "include" });
      if (!meRes.ok) {
        throw new Error("Could not load user profile after login.");
      }

      const me = await meRes.json();
      
      // Verify user is admin or staff
      if (me.role !== 'admin' && me.role !== 'staff') {
        throw new Error("Unauthorized: Admin or staff access required");
      }

      try { 
        localStorage.setItem("rbos_user", JSON.stringify(me)); 
      } catch { /* ignore */ }
      
      console.log("Admin login OK, /me =", me);
      setUser(me);
      
      // Redirect to admin dashboard
      navigate("/admin");
    } catch (e) {
      const error = e as Error;
      alert(error?.message ?? "Login failed");
    }
  };

  return (
    <section className="container-xl py-16">
      <div className="max-w-md mx-auto p-8 rounded-3xl bg-card border border-white/10 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="h2">Admin Login</h1>
          <p className="text-sm text-mute mt-2">Staff and Administrator access only</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm text-mute mb-1">Email</label>
            <input
              type="email"
              {...register("email", { required: true })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="admin@rbos.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm text-mute mb-1">Password</label>
            <input
              type="password"
              {...register("password", { required: true })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in as Admin"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-mute">
          <Link to="/" className="text-gold hover:underline">
            ← Back to home
          </Link>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400">
          <p className="font-semibold mb-1">Test Credentials:</p>
          <p>Email: admin@rbos.com</p>
          <p>Password: admin123</p>
        </div>
      </div>
    </section>
  );
}

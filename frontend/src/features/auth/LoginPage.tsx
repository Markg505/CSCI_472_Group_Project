import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, AUTH_DEBUG_TAG } from "./useAuth"; 

type FormData = { email: string; password: string };

export default function LoginPage() {
  
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>();
  const navigate = useNavigate();
    console.log("LoginPage tag =", AUTH_DEBUG_TAG);
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
        } catch {}
        throw new Error(msg);
      }

      
      let me: any = null;
      try {
        const meRes = await fetch("/RBOS/api/auth/me", { credentials: "include" });
        if (meRes.ok) me = await meRes.json();
      } catch {}

      if (me) {
        try { localStorage.setItem("rbos_user", JSON.stringify(me)); } catch {}
        console.log("Login OK, /me =", me); setUser(me); console.log("LoginPage setUser done");
      } else {

        throw new Error("Could not load user profile after login.");
      }

      navigate("/");
    } catch (e: any) {
      alert(e?.message ?? "Login failed");
    }
  };

  return (
    <section className="container-xl py-16">
      <div className="max-w-md mx-auto p-8 rounded-3xl bg-card border border-white/10 shadow-2xl">
        <h1 className="h2">Sign in</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm text-mute mb-1">Email</label>
            <input
              type="email"
              {...register("email", { required: true })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="you@example.com"
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
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-mute">
          <div>
            Don’t have an account?{" "}
            <Link to="/register" className="text-gold hover:underline">Register</Link>
          </div>
          <div>
            <Link to="/reset-password" className="text-gold hover:underline">Reset password</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

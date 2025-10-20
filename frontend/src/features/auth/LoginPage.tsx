import { useForm } from "react-hook-form";
import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";

type FormData = { email: string; password: string };

export default function LoginPage() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>();
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (v: FormData) => {
    try {
      await login(v.email, v.password);
      navigate("/");
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Login failed");
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
              {...register("email")}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-mute mb-1">Password</label>
            <input
              type="password"
              {...register("password")}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="••••••••"
            />
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}

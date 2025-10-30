import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";



type FormData = {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  confirm: string;
};

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();
  const { signup } = useAuth(); // expect signup({ full_name, email, phone, password })
  const navigate = useNavigate();

  const pwd = watch("password");

  const onSubmit = async (v: FormData) => {
    try {
      await signup({
        full_name: v.full_name.trim(),
        email: v.email.trim().toLowerCase(),
        phone: v.phone?.trim() || "",
        password: v.password,
      });
      navigate("/");
    } catch (e: any) {
      // surface unique-email/validation errors from API
      alert(e?.response?.data?.message ?? "Registration failed");
    }
  };

  return (
    <section className="container-xl py-16">
      <div className="max-w-md mx-auto p-8 rounded-3xl bg-card border border-white/10 shadow-2xl">
        <h1 className="h2 text-center">Create Your Account</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm text-mute mb-1">Full name</label>
            <input
              type="text"
              {...register("full_name", { required: "Name is required", minLength: { value: 2, message: "Too short" } })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="Jane Doe"
            />
            {errors.full_name && <p className="mt-1 text-xs text-red-400">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-mute mb-1">Email</label>
            <input
              type="email"
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" },
              })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-mute mb-1">Phone (optional)</label>
            <input
              type="tel"
              {...register("phone", {
                pattern: { value: /^[+()\-\s0-9]{7,20}$/, message: "Enter a valid phone" },
              })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="(555) 123-4567"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-mute mb-1">Password</label>
            <input
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Use at least 8 characters" },
              })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-mute mb-1">Confirm password</label>
            <input
              type="password"
              {...register("confirm", {
                required: "Please confirm your password",
                validate: (v) => v === pwd || "Passwords do not match",
              })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="••••••••"
            />
            {errors.confirm && <p className="mt-1 text-xs text-red-400">{errors.confirm.message}</p>}
          </div>

          <button className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-mute">
          Already have an account?{" "}
          <Link to="/login" className="text-gold hover:underline">Sign in</Link>
        </div>
      </div>
    </section>
  );
}

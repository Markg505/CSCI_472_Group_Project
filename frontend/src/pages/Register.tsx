import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

type FormData = {
  fullName: string;
  email: string;
  phone?: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  password: string;
  confirm: string;
};

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    watch,
    getValues,  
    formState: { errors, isSubmitting },
  } = useForm<FormData>();
  const { signup } = useAuth(); 
  const navigate = useNavigate();

  const pwd = watch("password");

const onSubmit = async (v: FormData) => {
  
  console.log("DEBUG onSubmit - v:", v);

  
  const fromV_snake = (v as any)['full_name'];
  const fromV_camel = (v as any).fullName;
  const fromGet_snake = (getValues as any) ? (getValues as any)('full_name') : undefined;
  const fromGet_camel = (getValues as any) ? (getValues as any)('fullName') : undefined;

  
  const dom_snake = (document.querySelector('input[name="full_name"]') as HTMLInputElement | null)?.value;
  const dom_camel = (document.querySelector('input[name="fullName"]') as HTMLInputElement | null)?.value;

  const rawName = fromV_snake ?? fromV_camel ?? fromGet_snake ?? fromGet_camel ?? dom_snake ?? dom_camel ?? "";
  const fullName = String(rawName).trim();

  console.log("DEBUG DOM value for name (snake):", dom_snake, " (camel):", dom_camel);
  console.log("DEBUG resolved fullName:", fullName);

 
  const payload = {
    full_name: fullName, 
    email: v.email?.trim().toLowerCase(),
    password: v.password,
    ...(v.phone?.trim() ? { phone: v.phone.trim() } : {}),
    address: v.address.trim(),
    address2: v.address2?.trim() ?? "",
    city: v.city.trim(),
    state: v.state.trim(),
    postalCode: v.postalCode.trim(),
  };

  console.log("DEBUG payload:", payload);

  try {
    await signup(payload as any);
    alert("Account created — a confirmation email has been sent to your address.");
    navigate("/");
  } catch (err: any) {
    console.error("Registration error:", err);
    alert(err?.message ?? "Registration failed");
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
              {...register("fullName", {
                required: "Name is required",
                minLength: { value: 2, message: "Too short" },
              })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="Name"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-400">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-mute mb-1">Email</label>
            <input
              type="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email",
                },
              })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
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
            {errors.phone && (
              <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-mute mb-1">Street address</label>
            <input
              type="text"
              {...register("address", { required: "Address is required" })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="123 Main St"
            />
            {errors.address && (
              <p className="mt-1 text-xs text-red-400">{errors.address.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-mute mb-1">Address line 2 (optional)</label>
            <input
              type="text"
              {...register("address2")}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="Apt / Suite"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-mute mb-1">City</label>
              <input
                type="text"
                {...register("city", { required: "City is required" })}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
                placeholder="Springfield"
              />
              {errors.city && (
                <p className="mt-1 text-xs text-red-400">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-mute mb-1">State</label>
              <input
                type="text"
                {...register("state", { required: "State is required" })}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
                placeholder="CA"
              />
              {errors.state && (
                <p className="mt-1 text-xs text-red-400">{errors.state.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-mute mb-1">Postal code</label>
            <input
              type="text"
              {...register("postalCode", { required: "Postal code is required" })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="90210"
            />
            {errors.postalCode && (
              <p className="mt-1 text-xs text-red-400">{errors.postalCode.message}</p>
            )}
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
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-mute mb-1">Confirm password</label>
            <input
              type="password"
              {...register("confirm", {
                required: "Please confirm your password",
                validate: (val) => val === pwd || "Passwords do not match",
              })}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-gold"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.confirm && (
              <p className="mt-1 text-xs text-red-400">{errors.confirm.message}</p>
            )}
          </div>

          <button className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-mute">
          Already have an account?{" "}
          <Link to="/login" className="text-gold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

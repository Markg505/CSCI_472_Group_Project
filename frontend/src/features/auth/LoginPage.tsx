import { useForm } from "react-hook-form";
import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";

type FormData = { email: string; password: string };

export default function LoginPage() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>();
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (values: FormData) => {
    try {
      await login(values.email, values.password);
      navigate("/"); // or send to role-specific pages later
    } catch (e: any) {
      alert(e?.response?.data?.message ?? "Login failed");
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "40px auto" }}>
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <label>Email</label>
        <input {...register("email")} type="email" />
        <label>Password</label>
        <input {...register("password")} type="password" />
        <button disabled={isSubmitting} style={{ marginTop: 12 }}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

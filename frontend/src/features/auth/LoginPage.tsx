import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/api/authApi";
import { useAuthStore } from "@/store/authStore";
import { ROUTES } from "@/routes/appRoutes";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { LoginResponseType } from "@/@types/auth.types";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [totp, setTotp] = useState("");
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  function finishLogin(payload: LoginResponseType) {
    if (!payload.user || !payload.access || !payload.refresh) {
      toast.error("Respuesta de login incompleta.");
      return;
    }
    setAuth(payload.user, payload.access, payload.refresh);
    toast.success(`Bienvenido, ${payload.user.first_name}`);
    navigate(payload.mfa_setup_required ? ROUTES.SETTINGS : ROUTES.DASHBOARD);
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      const payload = res.data;
      if (payload.mfa_required && payload.temp_token) {
        setTempToken(payload.temp_token);
        setTotp("");
        return;
      }
      finishLogin(payload);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || "Credenciales inválidas.");
    } finally {
      setLoading(false);
    }
  };

  const onMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempToken) return;
    setLoading(true);
    try {
      const res = await authApi.loginMfa({ temp_token: tempToken, totp_code: totp.trim() });
      finishLogin(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || "Código MFA inválido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-app lg:grid lg:grid-cols-2">
      <aside className="relative hidden h-full overflow-hidden lg:block" aria-hidden="true">
        <img
          src="/login-visual-1.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
        <div className="absolute inset-0 flex flex-col justify-between p-8 text-white">
          <div>
            <p className="text-sm font-semibold tracking-tight">SGA-CO</p>
            <p className="mt-1 text-sm text-white/80">Sistema de Gestión de Activos</p>
          </div>
          <p className="max-w-xs text-2xl font-semibold leading-snug tracking-tight">
            Inventario claro, control continuo.
          </p>
        </div>
      </aside>

      <section className="login-panel relative flex h-full items-center justify-center overflow-y-auto px-6 py-10">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle compact />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-semibold tracking-tight text-ink">SGA-CO</p>
            <p className="mt-1 text-sm text-accent">Sistema de Gestión de Activos</p>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {tempToken ? "Verificación MFA" : "Iniciar sesión"}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {tempToken
              ? "Ingresa el código de 6 dígitos de tu aplicación autenticadora."
              : "Accede con tu correo institucional."}
          </p>

          <div className="mt-8">
            {tempToken ? (
              <form onSubmit={onMfaSubmit} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="totp">
                    Código
                  </label>
                  <div className="relative">
                    <ShieldCheck size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                    <input
                      id="totp"
                      value={totp}
                      onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="input-field pl-9 text-center font-mono tracking-[0.4em]"
                      placeholder="000000"
                      autoFocus
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading || totp.length !== 6} className="btn-primary w-full py-2.5">
                  {loading ? "Verificando..." : "Verificar"}
                </button>
                <button
                  type="button"
                  className="w-full text-sm text-ink-subtle hover:text-ink"
                  onClick={() => { setTempToken(null); setTotp(""); }}
                >
                  Volver al inicio de sesión
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="email">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                    <input
                      id="email"
                      {...register("email")}
                      type="email"
                      className="input-field pl-9"
                      placeholder="usuario@empresa.com"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="password">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                    <input
                      id="password"
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      className="input-field pl-9 pr-10"
                      placeholder="••••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? "Verificando..." : "Ingresar"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

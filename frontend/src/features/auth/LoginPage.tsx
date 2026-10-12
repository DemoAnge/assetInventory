import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/api/authApi";
import { useAuthStore } from "@/store/authStore";
import { ROUTES } from "@/routes/appRoutes";
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
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SGA-CO</h1>
          <p className="text-primary-200 text-sm mt-1">Sistema de Gestión de Activos</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {tempToken ? "Verificación MFA" : "Iniciar sesión"}
          </h2>

          {tempToken ? (
          <form onSubmit={onMfaSubmit} className="space-y-5">
            <p className="text-sm text-gray-600">
              Ingresa el código de 6 dígitos de tu aplicación autenticadora.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Código</label>
              <div className="relative">
                <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="input-field pl-9 tracking-[0.4em] text-center font-mono"
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
              className="w-full text-sm text-gray-500 hover:text-gray-800"
              onClick={() => { setTempToken(null); setTotp(""); }}
            >
              Volver al inicio de sesión
            </button>
          </form>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  className="input-field pl-9 pr-10"
                  placeholder="••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
    </div>
  );
}

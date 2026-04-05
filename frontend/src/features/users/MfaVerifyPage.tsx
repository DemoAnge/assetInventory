import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/api/authApi";
import { useAuthStore } from "@/store/authStore";

export default function MfaVerifyPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const refs = useRef<HTMLInputElement[]>([]);
  const { setAuth, setMfaVerified } = useAuthStore();
  const navigate = useNavigate();

  const tempToken = sessionStorage.getItem("mfa_temp_token") ?? "";

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[idx] = val;
    setCode(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
    if (next.every((d) => d !== "") && val) {
      handleSubmit(next.join(""));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleSubmit = async (token?: string) => {
    const totp = token ?? code.join("");
    if (totp.length < 6) return;
    setLoading(true);
    try {
      const res = await authApi.loginMfa({ temp_token: tempToken, totp_code: totp });
      const payload = res.data;
      setAuth(payload.user!, payload.access!, payload.refresh!, true);
      setMfaVerified(true);
      sessionStorage.removeItem("mfa_temp_token");
      toast.success("Autenticación completa.");
      navigate("/dashboard");
    } catch {
      toast.error("Código incorrecto. Intenta de nuevo.");
      setCode(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verificación MFA</h1>
          <p className="text-primary-200 text-sm mt-1">
            Ingresa el código de tu aplicación autenticadora
          </p>
        </div>

        <div className="card p-8">
          <p className="text-sm text-gray-600 text-center mb-6">
            Código TOTP de 6 dígitos
          </p>

          <div className="flex gap-2 justify-center mb-6">
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { if (el) refs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              />
            ))}
          </div>

          <button
            onClick={() => handleSubmit()}
            disabled={loading || code.some((d) => d === "")}
            className="btn-primary w-full py-2.5"
          >
            {loading ? "Verificando..." : "Confirmar"}
          </button>

          <button
            onClick={() => navigate("/login")}
            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}

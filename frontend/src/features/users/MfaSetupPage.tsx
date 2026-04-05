import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/api/authApi";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";

export default function MfaSetupPage() {
  const [step, setStep] = useState<"qr" | "confirm" | "done">("qr");
  const [confirmCode, setConfirmCode] = useState("");
  const { user, setMfaVerified } = useAuthStore();
  const navigate = useNavigate();

  const setupQuery = useQuery({
    queryKey: ["mfa-setup"],
    queryFn: () => authApi.mfaSetup().then((r) => r.data),
    enabled: step === "qr",
  });

  const confirmMutation = useMutation({
    mutationFn: (token: string) => authApi.mfaConfirm(token),
    onSuccess: () => {
      setStep("done");
      setMfaVerified(true);
      toast.success("MFA activado correctamente.");
    },
    onError: () => toast.error("Código inválido. Intenta de nuevo."),
  });

  return (
    <div className="max-w-lg mx-auto">
      <div className="card p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={24} className="text-primary-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configurar MFA</h2>
            <p className="text-sm text-gray-500">Autenticación de dos factores (TOTP)</p>
          </div>
        </div>

        {user?.mfa_required && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              ⚠️ Tu rol <strong>{user.role}</strong> requiere MFA obligatorio.
            </p>
          </div>
        )}

        {step === "qr" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              1. Instala Google Authenticator o Authy en tu dispositivo.<br />
              2. Escanea el código QR.<br />
              3. Ingresa el código de 6 dígitos para confirmar.
            </p>
            {setupQuery.isLoading && <p className="text-center text-gray-500">Generando QR...</p>}
            {setupQuery.data && (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={`data:image/png;base64,${setupQuery.data.qr_code_base64}`}
                  alt="QR MFA"
                  className="w-48 h-48 border rounded-lg"
                />
                <div className="w-full p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Clave manual:</p>
                  <code className="text-sm font-mono text-gray-800 break-all">
                    {setupQuery.data.secret}
                  </code>
                </div>
                <button onClick={() => setStep("confirm")} className="btn-primary w-full">
                  Ya escaneé el QR →
                </button>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Ingresa el código de 6 dígitos de tu app:</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
              className="input-field text-center text-2xl font-bold tracking-widest"
              placeholder="000000"
            />
            <div className="flex gap-3">
              <button onClick={() => setStep("qr")} className="btn-secondary flex-1">
                ← Atrás
              </button>
              <button
                onClick={() => confirmMutation.mutate(confirmCode)}
                disabled={confirmCode.length < 6 || confirmMutation.isPending}
                className="btn-primary flex-1"
              >
                {confirmMutation.isPending ? "Verificando..." : "Activar MFA"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-4">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-900">¡MFA activado!</h3>
            <p className="text-sm text-gray-600">
              Desde ahora necesitarás tu app autenticadora para ingresar al sistema.
            </p>
            <button onClick={() => navigate("/dashboard")} className="btn-primary w-full">
              Ir al Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { ShieldCheck, Eye, EyeOff, Lock, Smartphone } from "lucide-react";
import { useChangePassword } from "@/hooks/useSettings";
import { authApi } from "@/api/authApi";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

function PasswordInput({ label, value, onChange, required = false }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className="input-field pr-10"
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export function SecurityTab() {
  const changePassword = useChangePassword();
  const [form, setForm] = useState({ old_password: "", new_password: "", confirm_new_password: "" });
  const [clientError, setClientError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError("");

    if (form.new_password.length < 10) {
      setClientError("La nueva contraseña debe tener al menos 10 caracteres.");
      return;
    }
    if (form.new_password !== form.confirm_new_password) {
      setClientError("Las contraseñas no coinciden.");
      return;
    }

    changePassword.mutate(form, {
      onSuccess: () => setForm({ old_password: "", new_password: "", confirm_new_password: "" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Lock size={16} className="text-primary-500" /> Cambiar contraseña
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          La contraseña debe tener al menos 10 caracteres y no puede ser demasiado común.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <PasswordInput
            label="Contraseña actual"
            value={form.old_password}
            onChange={v => setForm(f => ({ ...f, old_password: v }))}
            required
          />
          <PasswordInput
            label="Nueva contraseña"
            value={form.new_password}
            onChange={v => setForm(f => ({ ...f, new_password: v }))}
            required
          />
          <PasswordInput
            label="Confirmar nueva contraseña"
            value={form.confirm_new_password}
            onChange={v => setForm(f => ({ ...f, confirm_new_password: v }))}
            required
          />

          {clientError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {clientError}
            </p>
          )}

          <div className="pt-2">
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={changePassword.isPending}>
              <ShieldCheck size={15} />
              {changePassword.isPending ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </div>
        </form>
      </div>

      <MfaCard />

      {/* Indicaciones de seguridad */}
      <div className="card p-6 bg-blue-50 border-blue-100">
        <h4 className="text-sm font-semibold text-blue-800 mb-3">Recomendaciones de seguridad</h4>
        <ul className="space-y-1.5 text-sm text-blue-700">
          <li>• Usa al menos 10 caracteres combinando letras, números y símbolos.</li>
          <li>• No reutilices contraseñas de otros servicios.</li>
          <li>• Cámbiala periódicamente (cada 90 días).</li>
          <li>• No la compartas con nadie.</li>
          <li>• Admin y Contabilidad deben activar MFA.</li>
        </ul>
      </div>
    </div>
  );
}

function MfaCard() {
  const { user, setUser } = useAuthStore();
  const [setup, setSetup] = useState<{ qr_code_base64: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const required = !!user?.mfa_required;
  const enabled = !!user?.mfa_enabled;

  async function startSetup() {
    setBusy(true);
    try {
      const res = await authApi.mfaSetup();
      setSetup({ qr_code_base64: res.data.qr_code_base64, secret: res.data.secret });
      setCode("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || "No se pudo iniciar MFA.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.mfaConfirm(code.trim());
      if (user) setUser({ ...user, mfa_enabled: true });
      setSetup(null);
      setCode("");
      toast.success("MFA habilitado.");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || "Código inválido.");
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.mfaDisable({ token: code.trim(), password });
      if (user) setUser({ ...user, mfa_enabled: false });
      setCode("");
      setPassword("");
      toast.success("MFA deshabilitado.");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || "No se pudo deshabilitar MFA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Smartphone size={16} className="text-primary-500" /> Autenticación en dos pasos (MFA)
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {required
          ? "Tu rol exige MFA. Actívalo con una app autenticadora (Google Authenticator, Authy, etc.)."
          : "Protege tu cuenta con un código de un solo uso."}
      </p>

      {required && !enabled && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          MFA pendiente de configuración.
        </p>
      )}

      {enabled && !setup && (
        <form onSubmit={disableMfa} className="space-y-3 max-w-sm">
          <p className="text-sm text-green-700">MFA está activo.</p>
          <input
            className="input-field"
            type="password"
            placeholder="Contraseña actual"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            className="input-field tracking-[0.3em] font-mono"
            placeholder="Código de 6 dígitos"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <button type="submit" className="btn-secondary" disabled={busy || code.length !== 6}>
            {busy ? "Procesando..." : "Deshabilitar MFA"}
          </button>
        </form>
      )}

      {!enabled && !setup && (
        <button type="button" className="btn-primary" onClick={startSetup} disabled={busy}>
          {busy ? "Generando..." : "Activar MFA"}
        </button>
      )}

      {setup && (
        <form onSubmit={confirmSetup} className="space-y-4 max-w-sm">
          <img
            src={`data:image/png;base64,${setup.qr_code_base64}`}
            alt="Código QR MFA"
            className="w-44 h-44 border border-gray-200 rounded-lg"
          />
          <p className="text-xs text-gray-500 break-all">
            Clave manual: <span className="font-mono">{setup.secret}</span>
          </p>
          <input
            className="input-field tracking-[0.3em] font-mono"
            placeholder="Código de 6 dígitos"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy || code.length !== 6}>
              {busy ? "Confirmando..." : "Confirmar"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setSetup(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

import { useState } from "react";
import { ShieldCheck, Eye, EyeOff, Lock } from "lucide-react";
import { useChangePassword } from "@/hooks/useSettings";

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

      {/* Indicaciones de seguridad */}
      <div className="card p-6 bg-blue-50 border-blue-100">
        <h4 className="text-sm font-semibold text-blue-800 mb-3">Recomendaciones de seguridad</h4>
        <ul className="space-y-1.5 text-sm text-blue-700">
          <li>• Usa al menos 10 caracteres combinando letras, números y símbolos.</li>
          <li>• No reutilices contraseñas de otros servicios.</li>
          <li>• Cámbiala periódicamente (cada 90 días).</li>
          <li>• No la compartas con nadie.</li>
        </ul>
      </div>
    </div>
  );
}

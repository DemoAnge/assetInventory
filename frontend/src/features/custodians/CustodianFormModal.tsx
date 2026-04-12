import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useCreateCustodian, useUpdateCustodian } from "@/hooks/useCustodians";
import type { CustodianType, CustodianFormType } from "@/@types/custodian.types";

interface Props {
  custodian?: CustodianType;
  onClose: () => void;
}

const INITIAL: CustodianFormType = {
  first_name: "",
  last_name:  "",
  id_number:  "",
  position:   "",
};

/** Valida cédula ecuatoriana (módulo 10). Devuelve mensaje de error o null si es válida. */
function validateEcuadorCedula(value: string): string | null {
  if (!/^\d{10}$/.test(value)) return "La cédula debe tener exactamente 10 dígitos.";

  const province = parseInt(value.slice(0, 2), 10);
  if (province < 1 || province > 24)
    return "Los dos primeros dígitos no corresponden a una provincia válida (01–24).";

  if (parseInt(value[2], 10) >= 6)
    return "El tercer dígito no es válido para persona natural.";

  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let total = 0;
  for (let i = 0; i < 9; i++) {
    let d = parseInt(value[i], 10) * coef[i];
    if (d >= 10) d -= 9;
    total += d;
  }
  const check = (10 - (total % 10)) % 10;
  if (check !== parseInt(value[9], 10))
    return "La cédula ecuatoriana no es válida (dígito verificador incorrecto).";

  return null;
}

export function CustodianFormModal({ custodian, onClose }: Props) {
  const isEdit = !!custodian;
  const [form, setForm] = useState<CustodianFormType>(() =>
    custodian
      ? { first_name: custodian.first_name, last_name: custodian.last_name,
          id_number: custodian.id_number, position: custodian.position }
      : INITIAL
  );
  const [errors, setErrors] = useState<Partial<Record<keyof CustodianFormType, string>>>({});

  const create = useCreateCustodian();
  const update = useUpdateCustodian(custodian?.id ?? 0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  function set<K extends keyof CustodianFormType>(key: K, value: CustodianFormType[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.first_name.trim()) e.first_name = "El nombre es obligatorio.";
    if (!form.last_name.trim())  e.last_name  = "El apellido es obligatorio.";
    if (!form.position.trim())   e.position   = "El cargo es obligatorio.";
    if (!form.id_number.trim()) {
      e.id_number = "La cédula es obligatoria.";
    } else {
      const cedulaError = validateEcuadorCedula(form.id_number.trim());
      if (cedulaError) e.id_number = cedulaError;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form, id_number: form.id_number.trim() };
    if (isEdit) {
      update.mutate(payload, { onSuccess: onClose });
    } else {
      create.mutate(payload, { onSuccess: onClose });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? `Editar — ${custodian.full_name}` : "Nuevo Responsable"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                className={`input-field ${errors.first_name ? "border-red-400" : ""}`}
                value={form.first_name}
                onChange={e => set("first_name", e.target.value)}
                placeholder="Ej: Carlos"
                autoFocus
              />
              {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                className={`input-field ${errors.last_name ? "border-red-400" : ""}`}
                value={form.last_name}
                onChange={e => set("last_name", e.target.value)}
                placeholder="Ej: Mendoza"
              />
              {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cédula <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-gray-400 ml-2">(10 dígitos, Ecuador)</span>
            </label>
            <input
              className={`input-field font-mono ${errors.id_number ? "border-red-400" : ""}`}
              value={form.id_number}
              onChange={e => set("id_number", e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 1712345678"
              maxLength={10}
            />
            {errors.id_number && <p className="text-xs text-red-500 mt-1">{errors.id_number}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cargo <span className="text-red-500">*</span>
            </label>
            <input
              className={`input-field ${errors.position ? "border-red-400" : ""}`}
              value={form.position}
              onChange={e => set("position", e.target.value)}
              placeholder="Ej: Jefe de TI"
            />
            {errors.position && <p className="text-xs text-red-500 mt-1">{errors.position}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

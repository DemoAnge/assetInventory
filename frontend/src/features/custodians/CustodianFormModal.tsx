import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCreateCustodian, useUpdateCustodian } from "@/hooks/useCustodians";
import { locationsApi } from "@/api/locationsApi";
import type { CustodianType, CustodianFormType } from "@/@types/custodian.types";

interface Props {
  custodian?:     CustodianType;
  initialValues?: Partial<CustodianFormType>;
  onClose: () => void;
}

const INITIAL: CustodianFormType = {
  first_name: "",
  last_name:  "",
  id_number:  null,
  phone:      null,
  position:   "",
  agency:     null,
  is_active:  true,
};


export function CustodianFormModal({ custodian, initialValues, onClose }: Props) {
  const isEdit = !!custodian;

  const [form, setForm] = useState<CustodianFormType>(() => {
    if (custodian) {
      return {
        first_name: custodian.first_name,
        last_name:  custodian.last_name,
        id_number:  custodian.id_number,
        phone:      custodian.phone,
        position:   custodian.position,
        agency:     custodian.agency,
        is_active:  custodian.is_active,
      };
    }
    return { ...INITIAL, ...initialValues };
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CustodianFormType, string>>>({});

  const { data: agenciesData } = useQuery({
    queryKey: ["agencies-select"],
    queryFn:  () => locationsApi.getAgencies({ is_active: true, page_size: 100 }).then(r => r.data),
  });

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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: CustodianFormType = {
      ...form,
      id_number: form.id_number?.trim() || null,
      phone:     form.phone?.trim()     || null,
    };
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? `Editar — ${custodian.full_name}` : "Nuevo Custodio"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nombre y Apellido */}
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

          {/* Cédula y Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° Identificación
                <span className="text-xs font-normal text-gray-400 ml-1">(opcional)</span>
              </label>
              <input
                className={`input-field font-mono ${errors.id_number ? "border-red-400" : ""}`}
                value={form.id_number ?? ""}
                onChange={e => set("id_number", e.target.value || null)}
                placeholder="Ej: 1234567890"
                maxLength={20}
              />
              {errors.id_number && <p className="text-xs text-red-500 mt-1">{errors.id_number}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
                <span className="text-xs font-normal text-gray-400 ml-1">(opcional)</span>
              </label>
              <input
                className="input-field"
                value={form.phone ?? ""}
                onChange={e => set("phone", e.target.value || null)}
                placeholder="Ej: 0991234567"
                maxLength={15}
              />
            </div>
          </div>

          {/* Cargo */}
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

          {/* Agencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agencia
              <span className="text-xs font-normal text-gray-400 ml-1">(opcional)</span>
            </label>
            <select
              className="input-field"
              value={form.agency ?? ""}
              onChange={e => set("agency", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Sin agencia —</option>
              {agenciesData?.results.map(a => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Estado (solo en edición) */}
          {isEdit && (
            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={e => set("is_active", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Custodio activo
              </label>
            </div>
          )}

          {/* Botones */}
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

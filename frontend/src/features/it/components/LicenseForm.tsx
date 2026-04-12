import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { itApi, type SoftwareLicense, type SoftwareLicenseFormData } from "@/api/itApi";
import toast from "react-hot-toast";

interface Props {
  license?: SoftwareLicense;
  onClose: () => void;
}

export function LicenseForm({ license, onClose }: Props) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<SoftwareLicenseFormData>({
    defaultValues: license
      ? {
          software_name: license.software_name,
          version:       license.version,
          license_type:  license.license_type,
          seats:         license.seats,
          used_seats:    license.used_seats,
          vendor:        license.vendor,
          purchase_date: license.purchase_date ?? "",
          expiry_date:   license.expiry_date ?? "",
          cost:          license.cost,
          notes:         license.notes,
        }
      : { license_type: "PERPETUA", seats: 1, used_seats: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: SoftwareLicenseFormData) =>
      license ? itApi.updateLicense(license.id, data) : itApi.createLicense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["it-licenses"] });
      toast.success(license ? "Licencia actualizada" : "Licencia creada");
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al guardar"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl my-8 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{license ? "Editar licencia" : "Nueva licencia"}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Software *</label>
              <input className="input w-full" {...register("software_name", { required: true })} placeholder="Microsoft Office 365" />
              {errors.software_name && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Versión</label>
              <input className="input w-full" {...register("version")} placeholder="2024" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select className="input w-full" {...register("license_type", { required: true })}>
                <option value="PERPETUA">Perpetua</option>
                <option value="SUSCRIPCION">Suscripción</option>
                <option value="OEM">OEM</option>
                <option value="OPEN_SOURCE">Open Source</option>
                <option value="VOLUMEN">Por volumen</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° licencias *</label>
              <input type="number" className="input w-full" {...register("seats", { required: true, min: 1, valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">En uso</label>
              <input type="number" className="input w-full" {...register("used_seats", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input className="input w-full" {...register("vendor")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
              <input type="number" step="0.01" className="input w-full" {...register("cost")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">F. compra</label>
              <input type="date" className="input w-full" {...register("purchase_date")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">F. vencimiento</label>
              <input type="date" className="input w-full" {...register("expiry_date")} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clave de licencia</label>
            <input className="input w-full font-mono text-sm" {...register("license_key")} placeholder="XXXXX-XXXXX-XXXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea className="input w-full h-16 resize-none" {...register("notes")} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

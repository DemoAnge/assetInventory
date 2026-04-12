import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Shield, X } from "lucide-react";
import { itApi, type ITAssetProfile, type ITAssetProfileFormData } from "@/api/itApi";
import toast from "react-hot-toast";

interface Props {
  profile?: ITAssetProfile;
  onClose: () => void;
}

export function ITProfileForm({ profile, onClose }: Props) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<ITAssetProfileFormData>({
    defaultValues: profile ?? { risk_level: "BAJO" },
  });

  const mutation = useMutation({
    mutationFn: (data: ITAssetProfileFormData) =>
      profile ? itApi.updateProfile(profile.id, data) : itApi.createProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["it-profiles"] });
      toast.success(profile ? "Perfil actualizado" : "Perfil TI creado");
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al guardar"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{profile ? "Editar perfil TI" : "Nuevo perfil TI"}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {profile ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              <Shield size={16} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Activo vinculado</p>
                <span className="font-mono text-primary-600 font-semibold">{profile.asset_code}</span>
                <span className="text-gray-600 text-sm ml-2">{profile.asset_name}</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID del activo *</label>
              <input
                type="number"
                className="input w-full"
                {...register("asset", { required: true, valueAsNumber: true })}
                placeholder="Ingresa el ID numérico del activo"
              />
              {errors.asset && <p className="text-red-500 text-xs mt-1">Requerido</p>}
              <p className="text-xs text-gray-400 mt-1">Puedes obtener el ID desde la lista de activos tecnológicos.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de riesgo *</label>
              <select className="input w-full" {...register("risk_level", { required: true })}>
                <option value="BAJO">Bajo</option>
                <option value="MEDIO">Medio</option>
                <option value="ALTO">Alto</option>
                <option value="CRITICO">Crítico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hostname</label>
              <input className="input w-full" {...register("hostname")} placeholder="PC-ADMIN-01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección IP</label>
              <input className="input w-full" {...register("ip_address")} placeholder="192.168.1.100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
              <input className="input w-full" {...register("mac_address")} placeholder="AA:BB:CC:DD:EE:FF" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sistema operativo</label>
              <input className="input w-full" {...register("os_name")} placeholder="Windows 11" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Versión SO</label>
              <input className="input w-full" {...register("os_version")} placeholder="23H2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Procesador</label>
              <input className="input w-full" {...register("processor")} placeholder="Intel Core i7-12700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RAM (GB)</label>
              <input type="number" className="input w-full" {...register("ram_gb", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Almacenamiento (GB)</label>
              <input type="number" className="input w-full" {...register("storage_gb", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Antivirus</label>
              <input className="input w-full" {...register("antivirus")} placeholder="Windows Defender" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Último escaneo</label>
              <input type="date" className="input w-full" {...register("last_scan_date")} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_server" className="rounded" {...register("is_server")} />
              <label htmlFor="is_server" className="text-sm text-gray-700">Es servidor</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_network_device" className="rounded" {...register("is_network_device")} />
              <label htmlFor="is_network_device" className="text-sm text-gray-700">Es dispositivo de red</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas TI</label>
            <textarea className="input w-full h-20 resize-none" {...register("notes")} />
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

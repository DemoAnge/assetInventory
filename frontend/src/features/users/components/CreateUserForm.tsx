import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { usersApi, type UserCreateData } from "@/api/usersApi";
import { locationsApi } from "@/api/locationsApi";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import toast from "react-hot-toast";

interface Props {
  onClose: () => void;
}

export function CreateUserForm({ onClose }: Props) {
  const qc = useQueryClient();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UserCreateData>({
    defaultValues: { role: "AUDITOR" },
  });

  const agencyValue = watch("agency");

  const { data: agenciesData, isLoading: agenciesLoading } = useQuery({
    queryKey: ["agencies-select"],
    queryFn: () => locationsApi.getAgencies({ page_size: 100 }).then((r) => r.data.results),
    staleTime: 60_000,
  });

  const agencyOptions = (agenciesData ?? []).map((a) => ({ value: a.id, label: a.name }));

  const mutation = useMutation({
    mutationFn: (data: UserCreateData) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado correctamente");
      onClose();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      const msg = data?.detail ?? data?.email?.[0] ?? data?.password?.[0] ?? "Error al crear usuario";
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo usuario</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input className="input w-full" {...register("first_name", { required: true })} />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
              <input className="input w-full" {...register("last_name", { required: true })} />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" className="input w-full" {...register("email", { required: true })} />
              {errors.email && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input className="input w-full" {...register("cedula")} placeholder="1234567890" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input className="input w-full" {...register("phone")} placeholder="0991234567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select className="input w-full" {...register("role", { required: true })}>
                <option value="AUDITOR">Auditor</option>
                <option value="TI">TI</option>
                <option value="CONTABILIDAD">Contabilidad</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agencia</label>
              <SearchableSelect
                options={agencyOptions}
                value={agencyValue ?? null}
                onChange={(id) => setValue("agency", id ?? undefined)}
                placeholder="Buscar agencia..."
                loading={agenciesLoading}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
              <input type="password" className="input w-full" {...register("password", { required: true, minLength: 8 })} />
              {errors.password && <p className="text-red-500 text-xs mt-1">Mínimo 8 caracteres</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña *</label>
              <input type="password" className="input w-full" {...register("confirm_password", { required: true })} />
              {errors.confirm_password && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
            Los roles <strong>ADMIN</strong> y <strong>CONTABILIDAD</strong> tendrán MFA obligatorio al siguiente inicio de sesión.
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

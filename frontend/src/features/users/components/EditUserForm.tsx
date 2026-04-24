import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { usersApi, type UserType, type UserUpdateData } from "@/api/usersApi";
import { locationsApi } from "@/api/locationsApi";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import toast from "react-hot-toast";

interface Props {
  user: UserType;
  onClose: () => void;
}

export function EditUserForm({ user, onClose }: Props) {
  const qc = useQueryClient();
  const { register, handleSubmit, setValue, watch } = useForm<UserUpdateData>({
    defaultValues: {
      first_name: user.first_name,
      last_name:  user.last_name,
      cedula:     user.cedula,
      phone:      user.phone,
      role:       user.role,
      agency:     user.agency ?? undefined,
      is_active:  user.is_active,
    },
  });

  const agencyValue = watch("agency");

  const { data: agenciesData, isLoading: agenciesLoading } = useQuery({
    queryKey: ["agencies-select"],
    queryFn: () => locationsApi.getAgencies({ page_size: 100 }).then((r) => r.data.results),
    staleTime: 60_000,
  });

  const agencyOptions = (agenciesData ?? []).map((a) => ({ value: a.id, label: a.name }));

  const mutation = useMutation({
    mutationFn: (data: UserUpdateData) => usersApi.update(user.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario actualizado");
      onClose();
    },
    onError: () => toast.error("Error al actualizar"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Editar usuario</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input w-full" {...register("first_name")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input className="input w-full" {...register("last_name")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input className="input w-full" {...register("cedula")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input className="input w-full" {...register("phone")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select className="input w-full" {...register("role")}>
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
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_active_edit" className="rounded" {...register("is_active")} />
            <label htmlFor="is_active_edit" className="text-sm text-gray-700">Usuario activo</label>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

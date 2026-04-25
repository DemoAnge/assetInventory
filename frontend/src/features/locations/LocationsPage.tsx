import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronDown, ChevronRight, Building2, LayoutGrid, MapPin, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { locationsApi } from "@/api/locationsApi";
import type { AgencyType, DepartmentType, AreaType } from "@/@types/location.types";
import toast from "react-hot-toast";

// ── Formulario agencia ─────────────────────────────────────────────────────────
function AgencyForm({ agency, onClose }: { agency?: AgencyType; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<Partial<AgencyType>>({
    defaultValues: agency ?? { is_active: true, is_main: false },
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<AgencyType>) =>
      agency ? locationsApi.updateAgency(agency.id, data) : locationsApi.createAgency(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agencies"] });
      toast.success(agency ? "Agencia actualizada" : "Agencia creada");
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al guardar"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{agency ? "Editar agencia" : "Nueva agencia"}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Código *</label>
              <input className="input w-full" {...register("code", { required: true })} placeholder="AG-001" />
              {errors.code && <p className="text-red-500 text-xs">Requerido</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
              <input className="input w-full" {...register("name", { required: true })} placeholder="Agencia Principal" />
              {errors.name && <p className="text-red-500 text-xs">Requerido</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
              <input className="input w-full" {...register("address")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ciudad</label>
              <input className="input w-full" {...register("city")} placeholder="Quito" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Provincia</label>
              <input className="input w-full" {...register("province")} placeholder="Pichincha" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
              <input className="input w-full" {...register("phone")} />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded" {...register("is_main")} />
              Sede principal
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded" {...register("is_active")} />
              Activa
            </label>
          </div>
          <div className="flex gap-3 justify-end pt-1">
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

// ── Formulario departamento ────────────────────────────────────────────────────
function DepartmentForm({ dept, agencies, onClose }: { dept?: DepartmentType; agencies: AgencyType[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<Partial<DepartmentType>>({
    defaultValues: dept ?? { is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<DepartmentType>) =>
      dept ? locationsApi.updateDepartment(dept.id, data) : locationsApi.createDepartment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agencies"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success(dept ? "Departamento actualizado" : "Departamento creado");
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al guardar"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{dept ? "Editar departamento" : "Nuevo departamento"}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Agencia *</label>
            <select className="input w-full" {...register("agency", { required: true, valueAsNumber: true })}>
              <option value="">Seleccionar...</option>
              {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {errors.agency && <p className="text-red-500 text-xs">Requerido</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Código *</label>
              <input className="input w-full" {...register("code", { required: true })} placeholder="DEP-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
              <input className="input w-full" {...register("name", { required: true })} placeholder="Sistemas" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <input className="input w-full" {...register("description")} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="rounded" {...register("is_active")} />
            Activo
          </label>
          <div className="flex gap-3 justify-end pt-1">
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

// ── Formulario área ────────────────────────────────────────────────────────────
function AreaForm({ area, departments, onClose }: { area?: AreaType; departments: DepartmentType[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<Partial<AreaType>>({
    defaultValues: area ?? { is_active: true },
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<AreaType>) =>
      area ? locationsApi.updateArea(area.id, data) : locationsApi.createArea(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agencies"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success(area ? "Área actualizada" : "Área creada");
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al guardar"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{area ? "Editar área" : "Nueva área"}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Departamento *</label>
            <select className="input w-full" {...register("department", { required: true, valueAsNumber: true })}>
              <option value="">Seleccionar...</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.agency_name} / {d.name}</option>)}
            </select>
            {errors.department && <p className="text-red-500 text-xs">Requerido</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Código *</label>
              <input className="input w-full" {...register("code", { required: true })} placeholder="AREA-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
              <input className="input w-full" {...register("name", { required: true })} placeholder="Sala de servidores" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Piso</label>
              <input className="input w-full" {...register("floor")} placeholder="2do piso" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <input className="input w-full" {...register("description")} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="rounded" {...register("is_active")} />
            Activa
          </label>
          <div className="flex gap-3 justify-end pt-1">
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

// ── Árbol de agencia ──────────────────────────────────────────────────────────
function AgencyTree({
  agency,
  departments,
  onEditAgency,
  onEditDept,
  onEditArea,
}: {
  agency: AgencyType;
  departments: DepartmentType[];
  onEditAgency: () => void;
  onEditDept: (d: DepartmentType) => void;
  onEditArea: (a: AreaType) => void;
}) {
  const [open, setOpen] = useState(true);
  const agencyDepts = departments.filter((d) => d.agency === agency.id);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Agencia header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <button onClick={() => setOpen((o) => !o)} className="text-gray-400 hover:text-gray-600">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <Building2 size={16} className="text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 text-sm">{agency.name}</span>
          <span className="ml-2 text-xs text-gray-400">{agency.code}</span>
          {agency.is_main && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">Principal</span>
          )}
          {!agency.is_active && (
            <span className="ml-2 text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">Inactiva</span>
          )}
        </div>
        <div className="text-xs text-gray-400">{agency.total_assets} activos</div>
        <div className="text-xs text-gray-500">{agency.city}</div>
        <button className="text-xs text-blue-600 hover:underline ml-2" onClick={onEditAgency}>Editar</button>
      </div>

      {/* Departamentos */}
      {open && (
        <div className="divide-y divide-gray-100">
          {agencyDepts.length === 0 && (
            <p className="px-8 py-3 text-xs text-gray-400">Sin departamentos</p>
          )}
          {agencyDepts.map((dept) => (
            <div key={dept.id}>
              <div className="flex items-center gap-3 px-8 py-2.5 bg-white hover:bg-gray-50">
                <LayoutGrid size={14} className="text-purple-400 shrink-0" />
                <span className="text-sm text-gray-700 flex-1">{dept.name}</span>
                <span className="text-xs text-gray-400">{dept.code}</span>
                {!dept.is_active && <span className="text-xs text-gray-400">Inactivo</span>}
                <button className="text-xs text-blue-600 hover:underline" onClick={() => onEditDept(dept)}>Editar</button>
              </div>
              {/* Áreas */}
              {dept.areas.map((area) => (
                <div key={area.id} className="flex items-center gap-3 px-14 py-2 hover:bg-gray-50 border-t border-gray-50">
                  <MapPin size={13} className="text-green-400 shrink-0" />
                  <span className="text-xs text-gray-600 flex-1">{area.name}</span>
                  <span className="text-xs text-gray-400">{area.code}</span>
                  {area.floor && <span className="text-xs text-gray-400">{area.floor}</span>}
                  <button className="text-xs text-blue-600 hover:underline" onClick={() => onEditArea(area)}>Editar</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
type Modal =
  | { type: "agency"; data?: AgencyType }
  | { type: "department"; data?: DepartmentType }
  | { type: "area"; data?: AreaType }
  | null;

export default function LocationsPage() {
  const [modal, setModal] = useState<Modal>(null);

  const { data: agenciesData, isLoading } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => locationsApi.getAgencies({ page_size: 100 }).then((r) => r.data),
  });

  const { data: deptsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => locationsApi.getDepartments({ page_size: 200 }).then((r) => r.data),
  });

  const agencies = agenciesData?.results ?? [];
  const departments = deptsData?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ubicaciones</h1>
          <p className="text-gray-500 text-sm mt-1">Jerarquía Agencia → Departamento → Área</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => setModal({ type: "area" })}>
            <Plus size={14} /> Nueva área
          </button>
          <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => setModal({ type: "department" })}>
            <Plus size={14} /> Nuevo departamento
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setModal({ type: "agency" })}>
            <Plus size={14} /> Nueva agencia
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Building2 size={13} className="text-blue-500" /> Agencia</span>
        <span className="flex items-center gap-1"><LayoutGrid size={13} className="text-purple-400" /> Departamento</span>
        <span className="flex items-center gap-1"><MapPin size={13} className="text-green-400" /> Área</span>
      </div>

      {/* Árbol */}
      {isLoading && <p className="text-gray-400 text-center py-8">Cargando estructura...</p>}
      <div className="space-y-4">
        {agencies.map((agency) => (
          <AgencyTree
            key={agency.id}
            agency={agency}
            departments={departments}
            onEditAgency={() => setModal({ type: "agency", data: agency })}
            onEditDept={(d) => setModal({ type: "department", data: d })}
            onEditArea={(a) => setModal({ type: "area", data: a })}
          />
        ))}
        {!isLoading && agencies.length === 0 && (
          <div className="card p-8 text-center text-gray-400">
            <Building2 size={32} className="mx-auto mb-2 opacity-30" />
            <p>No hay agencias registradas. Crea la primera agencia para comenzar.</p>
          </div>
        )}
      </div>

      {/* Modales */}
      {modal?.type === "agency" && (
        <AgencyForm agency={modal.data} onClose={() => setModal(null)} />
      )}
      {modal?.type === "department" && (
        <DepartmentForm dept={modal.data} agencies={agencies} onClose={() => setModal(null)} />
      )}
      {modal?.type === "area" && (
        <AreaForm area={modal.data} departments={departments} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

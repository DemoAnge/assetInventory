import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench, AlertTriangle, Calendar, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { maintenanceApi, type MaintenanceRecord, type MaintenanceFormData } from "@/api/maintenanceApi";
import toast from "react-hot-toast";

const STATUS_STYLES: Record<string, string> = {
  PROGRAMADO:  "bg-blue-100 text-blue-700",
  EN_PROCESO:  "bg-yellow-100 text-yellow-700",
  COMPLETADO:  "bg-green-100 text-green-700",
  CANCELADO:   "bg-gray-100 text-gray-600",
  VENCIDO:     "bg-red-100 text-red-700",
};

const TYPE_STYLES: Record<string, string> = {
  PREVENTIVO:  "bg-teal-100 text-teal-700",
  CORRECTIVO:  "bg-orange-100 text-orange-700",
  PREDICTIVO:  "bg-purple-100 text-purple-700",
  GARANTIA:    "bg-blue-100 text-blue-700",
  EMERGENCIA:  "bg-red-100 text-red-700",
};

function MaintenanceForm({ record, onClose }: { record?: MaintenanceRecord; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<MaintenanceFormData>({
    defaultValues: record ? {
      asset: record.asset,
      maintenance_type: record.maintenance_type,
      status: record.status,
      scheduled_date: record.scheduled_date,
      completed_date: record.completed_date ?? "",
      next_maintenance: record.next_maintenance ?? "",
      technician: record.technician,
      supplier: record.supplier,
      work_order: record.work_order,
      description: record.description,
      findings: record.findings,
      cost: record.cost,
      downtime_hours: record.downtime_hours,
    } : { status: "PROGRAMADO", maintenance_type: "PREVENTIVO" },
  });

  const status = watch("status");

  const mutation = useMutation({
    mutationFn: (data: MaintenanceFormData) =>
      record ? maintenanceApi.update(record.id, data) : maintenanceApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success(record ? "Registro actualizado" : "Mantenimiento creado");
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Error al guardar";
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {record ? "Editar mantenimiento" : "Nuevo mantenimiento"}
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID del activo *</label>
              <input type="number" className="input w-full" {...register("asset", { required: true, valueAsNumber: true })} />
              {errors.asset && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select className="input w-full" {...register("maintenance_type", { required: true })}>
                <option value="PREVENTIVO">Preventivo</option>
                <option value="CORRECTIVO">Correctivo</option>
                <option value="PREDICTIVO">Predictivo</option>
                <option value="GARANTIA">Garantía</option>
                <option value="EMERGENCIA">Emergencia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
              <select className="input w-full" {...register("status", { required: true })}>
                <option value="PROGRAMADO">Programado</option>
                <option value="EN_PROCESO">En proceso</option>
                <option value="COMPLETADO">Completado</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="VENCIDO">Vencido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha programada *</label>
              <input type="date" className="input w-full" {...register("scheduled_date", { required: true })} />
            </div>
            {status === "COMPLETADO" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha realización *</label>
                <input type="date" className="input w-full" {...register("completed_date")} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Próximo mantenimiento</label>
              <input type="date" className="input w-full" {...register("next_maintenance")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Técnico *</label>
              <input className="input w-full" {...register("technician", { required: true })} placeholder="Nombre del técnico" />
              {errors.technician && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input className="input w-full" {...register("supplier")} placeholder="Empresa proveedora" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden de trabajo</label>
              <input className="input w-full" {...register("work_order")} placeholder="OT-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
              <input type="number" step="0.01" className="input w-full" {...register("cost")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horas fuera de servicio</label>
              <input type="number" step="0.5" className="input w-full" {...register("downtime_hours")} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <textarea className="input w-full h-20 resize-none" {...register("description", { required: true })} placeholder="Descripción del mantenimiento..." />
            {errors.description && <p className="text-red-500 text-xs mt-1">Requerido</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hallazgos</label>
            <textarea className="input w-full h-20 resize-none" {...register("findings")} placeholder="Hallazgos durante el mantenimiento..." />
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

function RecordRow({ record, onEdit }: { record: MaintenanceRecord; onEdit: () => void }) {
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.asset_code}</td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{record.asset_name}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium rounded px-2 py-0.5 ${TYPE_STYLES[record.maintenance_type] ?? "bg-gray-100 text-gray-600"}`}>
          {record.maintenance_type_display}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium rounded px-2 py-0.5 ${STATUS_STYLES[record.status] ?? "bg-gray-100 text-gray-600"}`}>
          {record.status_display}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{record.scheduled_date}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{record.technician}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{record.cost ? `$${record.cost}` : "—"}</td>
      <td className="px-4 py-3">
        <button className="text-xs text-blue-600 hover:underline" onClick={onEdit}>Editar</button>
      </td>
    </tr>
  );
}

export default function MaintenancePage() {
  const [tab, setTab] = useState<"all" | "upcoming" | "overdue">("all");
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);

  const params: Record<string, unknown> = { page };
  if (filterType) params.maintenance_type = filterType;
  if (filterStatus) params.status = filterStatus;

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance", "all", params],
    queryFn: () => maintenanceApi.getAll(params).then((r) => r.data),
    enabled: tab === "all",
  });

  const { data: upcoming } = useQuery({
    queryKey: ["maintenance", "upcoming"],
    queryFn: () => maintenanceApi.getUpcoming().then((r) => r.data),
    enabled: tab === "upcoming",
  });

  const { data: overdue } = useQuery({
    queryKey: ["maintenance", "overdue"],
    queryFn: () => maintenanceApi.getOverdue().then((r) => r.data),
    enabled: tab === "overdue",
  });

  const listData = tab === "upcoming" ? upcoming : tab === "overdue" ? overdue : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mantenimiento</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de mantenimientos preventivos y correctivos</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> Nuevo mantenimiento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "all", label: "Todos", icon: <Wrench size={14} /> },
          { key: "upcoming", label: "Próximos 30 días", icon: <Calendar size={14} /> },
          { key: "overdue", label: "Vencidos", icon: <AlertTriangle size={14} /> },
        ].map((t) => (
          <button
            key={t.key}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab(t.key as typeof tab)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Filters (only for "all" tab) */}
      {tab === "all" && (
        <div className="card p-4 flex flex-wrap gap-3">
          <select className="input w-44" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">Todos los tipos</option>
            <option value="PREVENTIVO">Preventivo</option>
            <option value="CORRECTIVO">Correctivo</option>
            <option value="PREDICTIVO">Predictivo</option>
            <option value="GARANTIA">Garantía</option>
            <option value="EMERGENCIA">Emergencia</option>
          </select>
          <select className="input w-44" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option value="PROGRAMADO">Programado</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="COMPLETADO">Completado</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="VENCIDO">Vencido</option>
          </select>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {tab === "overdue" && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle size={14} />
            Mantenimientos con fecha vencida y sin completar
          </div>
        )}
        {tab === "upcoming" && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 text-sm text-blue-700">
            <Calendar size={14} />
            Mantenimientos programados en los próximos 30 días
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Código", "Activo", "Tipo", "Estado", "Fecha prog.", "Técnico", "Costo", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              )}
              {tab === "all" && data?.results.map((r) => (
                <RecordRow key={r.id} record={r} onEdit={() => { setEditing(r); setShowForm(true); }} />
              ))}
              {listData?.map((r) => (
                <RecordRow key={r.id} record={r} onEdit={() => { setEditing(r); setShowForm(true); }} />
              ))}
              {tab === "all" && !isLoading && data?.results.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin registros</td></tr>
              )}
              {listData?.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin registros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {tab === "all" && data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm text-gray-600 px-3 py-2">Página {page} de {data.total_pages}</span>
          <button className="btn-secondary text-sm" disabled={page === data.total_pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      )}

      {(showForm) && (
        <MaintenanceForm record={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </div>
  );
}

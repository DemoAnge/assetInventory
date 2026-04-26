import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench, AlertTriangle, Calendar, X, RefreshCw, Clock, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import {
  maintenanceApi,
  type MaintenanceRecord,
  type MaintenanceFormData,
} from "@/api/maintenanceApi";
import { AssetSearchSelect } from "@/components/shared/AssetSearchSelect";
import { TechnicianSearchSelect } from "@/components/shared/TechnicianSearchSelect";

// ── Constantes de estilos ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PROGRAMADO:       "bg-blue-100 text-blue-700",
  EN_PROCESO:       "bg-yellow-100 text-yellow-700",
  ESPERA_REPUESTOS: "bg-orange-100 text-orange-700",
  COMPLETADO:       "bg-green-100 text-green-700",
  CANCELADO:        "bg-gray-100 text-gray-600",
  VENCIDO:          "bg-red-100 text-red-700",
};

const TYPE_STYLES: Record<string, string> = {
  PREVENTIVO:  "bg-teal-100 text-teal-700",
  CORRECTIVO:  "bg-orange-100 text-orange-700",
  PREDICTIVO:  "bg-purple-100 text-purple-700",
  GARANTIA:    "bg-blue-100 text-blue-700",
  EMERGENCIA:  "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = [
  { value: "PROGRAMADO",  label: "Programado" },
  { value: "EN_PROCESO",  label: "En proceso" },
  { value: "ESPERA_REPUESTOS", label: "En espera de repuestos" },
  { value: "COMPLETADO",  label: "Completado" },
  { value: "CANCELADO",   label: "Cancelado" },
  { value: "VENCIDO",     label: "Vencido" },
];

// ── Timeline de logs de estado ───────────────────────────────────────────────

function StatusTimeline({ record, onStatusAdded }: { record: MaintenanceRecord; onStatusAdded: () => void }) {
  const qc = useQueryClient();
  const [showAddLog, setShowAddLog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const addLogMutation = useMutation({
    mutationFn: () => maintenanceApi.addStatusLog(record.id, { status: newStatus, notes: newNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      setShowAddLog(false);
      setNewStatus("");
      setNewNotes("");
      toast.success("Estado actualizado.");
      onStatusAdded();
    },
    onError: () => toast.error("Error al actualizar el estado."),
  });

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
          <Clock size={11} /> Historial de estados
        </h4>
        <button type="button" onClick={() => setShowAddLog(!showAddLog)}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
          <Plus size={11} /> Cambiar estado
        </button>
      </div>

      {/* Formulario inline para nuevo log */}
      {showAddLog && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <select
            className="input-field text-sm"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          >
            <option value="">— Seleccionar nuevo estado —</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <textarea
            className="input-field text-sm resize-none"
            rows={2}
            placeholder="Observaciones del cambio de estado..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAddLog(false)} className="btn-secondary text-xs flex-1">
              Cancelar
            </button>
            <button type="button"
              disabled={!newStatus || addLogMutation.isPending}
              onClick={() => addLogMutation.mutate()}
              className="btn-primary text-xs flex-1">
              {addLogMutation.isPending ? "Guardando..." : "Guardar cambio"}
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {record.status_logs.length === 0 && (
          <p className="text-xs text-gray-400">Sin cambios de estado registrados.</p>
        )}
        {record.status_logs.map((log, i) => (
          <div key={log.id} className="flex items-start gap-2 text-xs">
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-2 h-2 rounded-full mt-1 ${STATUS_STYLES[log.status]?.includes("blue") ? "bg-blue-400" : STATUS_STYLES[log.status]?.includes("green") ? "bg-green-400" : STATUS_STYLES[log.status]?.includes("yellow") ? "bg-yellow-400" : "bg-gray-400"}`} />
              {i < record.status_logs.length - 1 && <div className="w-px h-4 bg-gray-200 mt-0.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[log.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {log.status_display}
                </span>
                <span className="text-gray-400">{new Date(log.changed_at).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                {log.changed_by_name && <span className="text-gray-500">{log.changed_by_name}</span>}
              </div>
              {log.notes && <p className="text-gray-600 mt-0.5 truncate">{log.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Formulario de mantenimiento ──────────────────────────────────────────────

function MaintenanceForm({ record, onClose }: { record?: MaintenanceRecord; onClose: () => void }) {
  const qc = useQueryClient();

  // Estado del formulario
  const [assetId, setAssetId] = useState<number | null>(record?.asset ?? null);
  const [technicianRef, setTechnicianRef] = useState<number | null>(record?.technician_ref ?? null);
  const [technicianName, setTechnicianName] = useState(record?.technician ?? "");
  const [workOrder, setWorkOrder] = useState(record?.work_order ?? "");
  const [workOrderLoading, setWorkOrderLoading] = useState(false);
  const [form, setForm] = useState<Partial<MaintenanceFormData>>({
    maintenance_type: record?.maintenance_type ?? "PREVENTIVO",
    status: record?.status ?? "PROGRAMADO",
    scheduled_date: record?.scheduled_date ?? "",
    completed_date: record?.completed_date ?? "",
    next_maintenance: record?.next_maintenance ?? "",
    supplier: record?.supplier ?? "",
    description: record?.description ?? "",
    findings: record?.findings ?? "",
    cost: record?.cost ?? "",
    downtime_hours: record?.downtime_hours ?? "",
  });

  const [statusLogs, setStatusLogs] = useState(record?.status_logs ?? []);

  const f = (key: keyof MaintenanceFormData, val: unknown) =>
    setForm((p) => ({ ...p, [key]: val }));

  // Auto-cargar OT al abrir form nuevo
  const fetchNextOT = async () => {
    setWorkOrderLoading(true);
    try {
      const res = await maintenanceApi.getNextOT();
      setWorkOrder(res.data.work_order);
    } catch { /* ignore */ }
    finally { setWorkOrderLoading(false); }
  };

  // Inicializar OT si es nuevo registro
  const [otInitialized, setOtInitialized] = useState(false);
  if (!record && !otInitialized && !workOrder) {
    setOtInitialized(true);
    fetchNextOT();
  }

  const mutation = useMutation({
    mutationFn: (data: MaintenanceFormData) =>
      record ? maintenanceApi.update(record.id, data) : maintenanceApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success(record ? "Registro actualizado" : "Mantenimiento creado");
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail
        ?? Object.values(err?.response?.data ?? {})[0]
        ?? "Error al guardar";
      toast.error(String(msg));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) { toast.error("Seleccione un activo."); return; }
    if (!form.scheduled_date) { toast.error("Ingrese la fecha programada."); return; }
    if (!form.description) { toast.error("Ingrese la descripción."); return; }

    mutation.mutate({
      ...form,
      asset: assetId,
      technician: technicianName,
      technician_ref: technicianRef,
      work_order: workOrder || undefined,
      // Evitar enviar strings vacíos en campos opcionales numéricos y de fecha
      cost: form.cost !== "" ? form.cost : undefined,
      downtime_hours: form.downtime_hours !== "" ? form.downtime_hours : undefined,
      completed_date: form.completed_date || undefined,
      next_maintenance: form.next_maintenance || undefined,
      findings: form.findings || undefined,
      supplier: form.supplier || undefined,
    } as MaintenanceFormData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {record ? `Editar mantenimiento — ${record.work_order}` : "Nuevo mantenimiento"}
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Activo */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Activo *</label>
              <AssetSearchSelect
                value={assetId}
                onChange={(id) => setAssetId(id)}
                placeholder="Buscar activo por código o nombre..."
              />
            </div>

            {/* Tipo y estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select className="input-field" value={form.maintenance_type}
                onChange={(e) => f("maintenance_type", e.target.value)}>
                <option value="PREVENTIVO">Preventivo</option>
                <option value="CORRECTIVO">Correctivo</option>
                <option value="PREDICTIVO">Predictivo</option>
                <option value="GARANTIA">Garantía</option>
                <option value="EMERGENCIA">Emergencia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado inicial *</label>
              <select className="input-field" value={form.status}
                onChange={(e) => f("status", e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Fechas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha programada *</label>
              <input type="date" className="input-field" value={form.scheduled_date}
                onChange={(e) => f("scheduled_date", e.target.value)} />
            </div>
            {form.status === "COMPLETADO" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha realización *</label>
                <input type="date" className="input-field" value={form.completed_date}
                  onChange={(e) => f("completed_date", e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Próximo mantenimiento</label>
              <input type="date" className="input-field" value={form.next_maintenance}
                onChange={(e) => f("next_maintenance", e.target.value)} />
            </div>

            {/* Orden de trabajo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Orden de trabajo
                {!record && <span className="text-xs text-gray-400 ml-1">(auto-generada)</span>}
              </label>
              <div className="relative">
                <input className="input-field pr-8 font-mono" value={workOrder}
                  onChange={(e) => setWorkOrder(e.target.value)}
                  placeholder={workOrderLoading ? "Generando..." : "OT-2026-001"} />
                {!record && (
                  <button type="button" onClick={fetchNextOT}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
                    title="Regenerar OT">
                    <RefreshCw size={13} className={workOrderLoading ? "animate-spin" : ""} />
                  </button>
                )}
              </div>
            </div>

            {/* Técnico */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Técnico responsable</label>
              <TechnicianSearchSelect
                value={technicianRef}
                onChange={(id, name) => {
                  setTechnicianRef(id);
                  if (name) setTechnicianName(name);
                  if (!id) setTechnicianName("");
                }}
                placeholder="Buscar técnico interno o externo..."
              />
              {!technicianRef && (
                <input
                  type="text"
                  className="input-field mt-2 text-sm"
                  placeholder="O escribir nombre del técnico manualmente..."
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                />
              )}
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input className="input-field" value={form.supplier}
                onChange={(e) => f("supplier", e.target.value)} placeholder="Empresa proveedora" />
            </div>

            {/* Costo y horas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
              <input type="number" step="0.01" className="input-field" value={form.cost}
                onChange={(e) => f("cost", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horas fuera de servicio</label>
              <input type="number" step="0.5" className="input-field" value={form.downtime_hours}
                onChange={(e) => f("downtime_hours", e.target.value)} />
            </div>
          </div>

          {/* Descripción y hallazgos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <textarea className="input-field resize-none" rows={3}
              value={form.description}
              onChange={(e) => f("description", e.target.value)}
              placeholder="Descripción del trabajo a realizar o realizado..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hallazgos</label>
            <textarea className="input-field resize-none" rows={2}
              value={form.findings}
              onChange={(e) => f("findings", e.target.value)}
              placeholder="Hallazgos durante el mantenimiento..." />
          </div>

          {/* Timeline de estados (solo en edición) */}
          {record && (
            <StatusTimeline
              record={{ ...record, status_logs: statusLogs }}
              onStatusAdded={() => {
                maintenanceApi.getById(record.id).then((r) => setStatusLogs(r.data.status_logs));
              }}
            />
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : record ? "Guardar cambios" : "Crear mantenimiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Fila de la tabla ─────────────────────────────────────────────────────────

function RecordRow({ record, onEdit }: { record: MaintenanceRecord; onEdit: () => void }) {
  const hasLogs = record.status_logs?.length > 0;
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="px-4 py-3 text-sm font-medium text-primary-600 font-mono">{record.asset_code}</td>
      <td className="px-4 py-3 text-xs font-mono text-gray-500">{record.asset_serial_number ?? "—"}</td>
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
        {hasLogs && (
          <span className="ml-1 text-xs text-gray-400" title={`${record.status_logs.length} cambio(s) de estado`}>
            ({record.status_logs.length})
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{record.scheduled_date}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{record.technician_name ?? record.technician ?? "—"}</td>
      <td className="px-4 py-3 text-sm font-mono text-gray-500">{record.work_order || "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{record.cost ? `$${record.cost}` : "—"}</td>
      <td className="px-4 py-3">
        <button className="text-xs text-blue-600 hover:underline flex items-center gap-1" onClick={onEdit}>
          Ver / Editar <ChevronRight size={11} />
        </button>
      </td>
    </tr>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

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
          <p className="text-gray-500 text-sm mt-1">
            Gestión de mantenimientos con trazabilidad completa de estados y órdenes de trabajo.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2"
          onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> Nuevo mantenimiento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "all",      label: "Todos",            icon: <Wrench size={14} /> },
          { key: "upcoming", label: "Próximos 30 días", icon: <Calendar size={14} /> },
          { key: "overdue",  label: "Vencidos",         icon: <AlertTriangle size={14} /> },
        ].map((t) => (
          <button key={t.key}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab(t.key as typeof tab)}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Filtros (solo para tab "all") */}
      {tab === "all" && (
        <div className="card p-4 flex flex-wrap gap-3">
          <select className="input w-44" value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">Todos los tipos</option>
            <option value="PREVENTIVO">Preventivo</option>
            <option value="CORRECTIVO">Correctivo</option>
            <option value="PREDICTIVO">Predictivo</option>
            <option value="GARANTIA">Garantía</option>
            <option value="EMERGENCIA">Emergencia</option>
          </select>
          <select className="input w-44" value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      {/* Tabla */}
      <div className="card overflow-hidden">
        {tab === "overdue" && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle size={14} /> Mantenimientos con fecha vencida y sin completar
          </div>
        )}
        {tab === "upcoming" && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 text-sm text-blue-700">
            <Calendar size={14} /> Mantenimientos programados en los próximos 30 días
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Código", "Serie", "Activo", "Tipo", "Estado", "Fecha prog.", "Técnico", "OT", "Costo", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              )}
              {tab === "all" && data?.results.map((r) => (
                <RecordRow key={r.id} record={r} onEdit={() => { setEditing(r); setShowForm(true); }} />
              ))}
              {listData?.map((r) => (
                <RecordRow key={r.id} record={r} onEdit={() => { setEditing(r); setShowForm(true); }} />
              ))}
              {tab === "all" && !isLoading && (data?.results.length === 0) && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Sin registros</td></tr>
              )}
              {listData?.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Sin registros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {tab === "all" && data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm text-gray-600 px-3 py-2">Página {page} de {data.total_pages}</span>
          <button className="btn-secondary text-sm" disabled={page === data.total_pages}
            onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      )}

      {showForm && (
        <MaintenanceForm
          record={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

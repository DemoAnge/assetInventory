import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Info } from "lucide-react";
import { format } from "date-fns";
import { auditApi, type AuditLogEntry } from "@/api/auditApi";
import { useAuthStore } from "@/store/authStore";

// Valores exactos de AuditAction en el backend
const ACTION_STYLES: Record<string, string> = {
  ASSET_ACTIVATION:   "bg-green-100 text-green-700",
  ASSET_DEACTIVATION: "bg-red-100 text-red-700",
  CREATE:             "bg-green-100 text-green-700",
  UPDATE:             "bg-blue-100 text-blue-700",
  DELETE:             "bg-red-100 text-red-700",
  ASSET_TRANSFER:     "bg-purple-100 text-purple-700",
  ASSET_SALE:         "bg-orange-100 text-orange-700",
  MAINTENANCE:        "bg-yellow-100 text-yellow-700",
  DEPRECIATION:       "bg-indigo-100 text-indigo-700",
  LOGIN:              "bg-gray-100 text-gray-600",
  LOGOUT:             "bg-gray-100 text-gray-600",
  VIEW:               "bg-gray-100 text-gray-500",
  REPORT_GENERATED:   "bg-teal-100 text-teal-700",
  DOCUMENT_GENERATED: "bg-teal-100 text-teal-700",
  INVOICE_SCANNED:    "bg-cyan-100 text-cyan-700",
  COMPLIANCE_CHECK:   "bg-pink-100 text-pink-700",
  PASSWORD_CHANGE:    "bg-amber-100 text-amber-700",
  MFA_ENABLED:        "bg-emerald-100 text-emerald-700",
  MFA_DISABLED:       "bg-rose-100 text-rose-700",
};

const ACTION_LABELS: Record<string, string> = {
  ASSET_ACTIVATION:   "Ingreso activo",
  ASSET_DEACTIVATION: "Baja activo",
  CREATE:             "Creación",
  UPDATE:             "Modificación",
  DELETE:             "Eliminación",
  ASSET_TRANSFER:     "Traslado",
  ASSET_SALE:         "Venta",
  MAINTENANCE:        "Mantenimiento",
  DEPRECIATION:       "Depreciación",
  LOGIN:              "Login",
  LOGOUT:             "Logout",
  VIEW:               "Consulta",
  REPORT_GENERATED:   "Reporte",
  DOCUMENT_GENERATED: "Documento",
  INVOICE_SCANNED:    "Factura escaneada",
  COMPLIANCE_CHECK:   "Cumplimiento",
  PASSWORD_CHANGE:    "Cambio contraseña",
  MFA_ENABLED:        "MFA activado",
  MFA_DISABLED:       "MFA desactivado",
};

const SCOPE_LABELS: Record<string, { label: string; color: string }> = {
  TI:           { label: "Viendo: activos TI, módulo TI, mantenimiento y movimientos", color: "bg-blue-50 border-blue-200 text-blue-700" },
  CONTABILIDAD: { label: "Viendo: activos, contabilidad, movimientos y documentos",    color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  AUDITOR:      { label: "Acceso completo — todos los módulos",                        color: "bg-purple-50 border-purple-200 text-purple-700" },
  ADMIN:        { label: "Acceso completo — todos los módulos",                        color: "bg-gray-50 border-gray-200 text-gray-600" },
};

function SummaryKpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`card p-4 border-l-4 ${color}`}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function LogRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100 text-sm">
      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
        {format(new Date(entry.action_date), "dd/MM/yyyy HH:mm")}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium rounded px-2 py-0.5 ${ACTION_STYLES[entry.action] ?? "bg-gray-100 text-gray-600"}`}>
          {ACTION_LABELS[entry.action] ?? entry.action}
        </span>
      </td>
      <td className="px-4 py-3 font-medium text-gray-900">{entry.object_code || "—"}</td>
      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{entry.object_name || "—"}</td>
      <td className="px-4 py-3 text-gray-600">{entry.user_email}</td>
      <td className="px-4 py-3">
        <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">{entry.user_role}</span>
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{entry.ip_address || "—"}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{entry.module}</td>
    </tr>
  );
}

export default function AuditPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<"all" | "ingresos" | "bajas" | "modificaciones">("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const dateParams = {
    ...(fechaDesde ? { fecha_desde: fechaDesde } : {}),
    ...(fechaHasta ? { fecha_hasta: fechaHasta } : {}),
  };

  const allParams: Record<string, unknown> = { page, ...dateParams };
  if (search) allParams.search = search;

  const { data: allData, isLoading } = useQuery({
    queryKey: ["audit", "all", allParams],
    queryFn: () => auditApi.getAll(allParams).then((r) => r.data),
    enabled: tab === "all",
  });

  const { data: ingresosData } = useQuery({
    queryKey: ["audit", "ingresos", { page, ...dateParams }],
    queryFn: () => auditApi.getIngresos({ page, ...dateParams }).then((r) => r.data),
    enabled: tab === "ingresos",
  });

  const { data: bajasData } = useQuery({
    queryKey: ["audit", "bajas", { page, ...dateParams }],
    queryFn: () => auditApi.getBajas({ page, ...dateParams }).then((r) => r.data),
    enabled: tab === "bajas",
  });

  const { data: modsData } = useQuery({
    queryKey: ["audit", "modificaciones", { page, ...dateParams }],
    queryFn: () => auditApi.getModificaciones({ page, ...dateParams }).then((r) => r.data),
    enabled: tab === "modificaciones",
  });

  const { data: resumen } = useQuery({
    queryKey: ["audit", "resumen", dateParams],
    queryFn: () => auditApi.getResumen(dateParams).then((r) => r.data),
  });

  const currentData =
    tab === "ingresos" ? ingresosData :
    tab === "bajas" ? bajasData :
    tab === "modificaciones" ? modsData :
    allData;

  function handleTabChange(t: typeof tab) {
    setTab(t);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
          <p className="text-gray-500 text-sm mt-1">Trazabilidad inmutable de todas las operaciones del sistema</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          🔒 Registros inmutables — no se pueden editar ni eliminar
        </div>
      </div>

      {/* Banner de scope por rol */}
      {user?.role && SCOPE_LABELS[user.role] && (
        <div className={`flex items-center gap-2 text-xs border rounded-lg px-3 py-2 ${SCOPE_LABELS[user.role].color}`}>
          <Info size={14} />
          <span><strong>{user.role}:</strong> {SCOPE_LABELS[user.role].label}</span>
        </div>
      )}

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryKpi label="Total eventos" value={resumen.total_eventos} color="border-gray-400" />
          <SummaryKpi label="Ingresos" value={resumen.ingresos} color="border-green-500" />
          <SummaryKpi label="Bajas" value={resumen.bajas} color="border-red-500" />
          <SummaryKpi label="Modificaciones" value={resumen.modificaciones} color="border-blue-500" />
        </div>
      )}

      {/* Date filters */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            className="input"
            value={fechaDesde}
            onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            className="input"
            value={fechaHasta}
            onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
          />
        </div>
        {(fechaDesde || fechaHasta) && (
          <button
            className="btn-secondary text-sm"
            onClick={() => { setFechaDesde(""); setFechaHasta(""); setPage(1); }}
          >
            Limpiar fechas
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {[
          { key: "all", label: "Todo" },
          { key: "ingresos", label: "Ingresos" },
          { key: "bajas", label: "Bajas" },
          { key: "modificaciones", label: "Modificaciones" },
        ].map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange(t.key as typeof tab)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search (only for "all") */}
      {tab === "all" && (
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Buscar por código, usuario..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Fecha", "Acción", "Código", "Nombre activo", "Usuario", "Rol", "IP", "Módulo"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              )}
              {!isLoading && currentData?.results.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin registros</td></tr>
              )}
              {currentData?.results.map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {currentData && currentData.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm text-gray-600 px-3 py-2">Página {page} de {currentData.total_pages}</span>
          <button className="btn-secondary text-sm" disabled={page === currentData.total_pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      )}
    </div>
  );
}

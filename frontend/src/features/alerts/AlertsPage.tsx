import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, AlertTriangle, RefreshCw, Check } from "lucide-react";
import { format } from "date-fns";
import { alertsApi, type AlertType } from "@/api/alertsApi";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const SEVERITY_STYLES: Record<string, string> = {
  CRITICA: "bg-red-100 text-red-700 border-red-300",
  ALTA:    "bg-orange-100 text-orange-700 border-orange-300",
  MEDIA:   "bg-yellow-100 text-yellow-700 border-yellow-300",
  BAJA:    "bg-blue-100 text-blue-700 border-blue-300",
};

const TYPE_ICONS: Record<string, string> = {
  GARANTIA_VENCE:     "🛡️",
  GARANTIA_VENCIDA:   "❌",
  MANTENIMIENTO_DUE:  "🔧",
  MANTENIMIENTO_VENC: "⚠️",
  DEPRECIACION_TOTAL: "📉",
  LICENCIA_VENCE:     "📋",
  LICENCIA_VENCIDA:   "🚫",
  ACTIVO_CRITICO:     "🔴",
  SEGURIDAD:          "🔒",
  BAJA_PENDIENTE:     "📦",
  TRASLADO:           "🚚",
  CUSTOM:             "🔔",
};

function ResolveModal({ alert, onClose }: { alert: AlertType; onClose: () => void }) {
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => alertsApi.resolve(alert.id, { resolution_note: note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-summary"] });
      toast.success("Alerta resuelta");
      onClose();
    },
    onError: () => toast.error("Error al resolver"),
  });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Resolver alerta</h2>
        <p className="text-sm text-gray-600">{alert.title}</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nota de resolución (opcional)</label>
          <textarea
            className="input w-full h-24 resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe la acción tomada..."
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Resolviendo..." : "Resolver"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { user, accessToken } = useAuthStore();
  const qc = useQueryClient();
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterResolved, setFilterResolved] = useState("false");
  const [page, setPage] = useState(1);
  const [resolving, setResolving] = useState<AlertType | null>(null);

  const params: Record<string, unknown> = { page };
  if (filterSeverity) params.severity = filterSeverity;
  if (filterResolved !== "") params.is_resolved = filterResolved;

  const { data, isLoading } = useQuery({
    queryKey: ["alerts", params],
    queryFn: () => alertsApi.getAll(params).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["alerts-summary"],
    queryFn: () => alertsApi.getSummary().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: () => alertsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-summary"] });
      toast.success("Todas marcadas como leídas");
    },
  });

  const markRead = useMutation({
    mutationFn: (id: number) => alertsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-summary"] });
    },
  });

  const runEngine = useMutation({
    mutationFn: () => alertsApi.runEngine(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-summary"] });
      toast.success(`Engine ejecutado: ${JSON.stringify(res.data.results)}`);
    },
    onError: () => toast.error("Sin permiso para ejecutar el engine"),
  });

  // WebSocket: escuchar alertas nuevas en tiempo real
  useEffect(() => {
    if (!accessToken) return;
    const nodeUrl = import.meta.env.VITE_NODE_URL ?? "http://localhost:4000";
    const socket = io(nodeUrl, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });
    socket.on("new_alert", () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts-summary"] });
      toast("Nueva alerta recibida", { icon: "🔔" });
    });
    return () => { socket.disconnect(); };
  }, [accessToken, qc]);

  const canRunEngine = user?.role === "ADMIN" || user?.role === "TI";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
          <p className="text-gray-500 text-sm mt-1">Notificaciones del sistema en tiempo real</p>
        </div>
        <div className="flex gap-2">
          {canRunEngine && (
            <button
              className="btn-secondary flex items-center gap-2 text-sm"
              onClick={() => runEngine.mutate()}
              disabled={runEngine.isPending}
            >
              <RefreshCw size={15} className={runEngine.isPending ? "animate-spin" : ""} />
              Ejecutar engine
            </button>
          )}
          <button
            className="btn-secondary flex items-center gap-2 text-sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck size={15} />
            Marcar todas leídas
          </button>
        </div>
      </div>

      {/* Summary badges */}
      {summary && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm">
            <Bell size={14} className="text-gray-500" />
            <span className="text-gray-600">Sin resolver:</span>
            <span className="font-bold text-gray-900">{summary.total_unresolved}</span>
          </div>
          {summary.critica > 0 && (
            <div className="flex items-center gap-2 bg-red-100 rounded-lg px-3 py-2 text-sm">
              <AlertTriangle size={14} className="text-red-600" />
              <span className="text-red-700 font-semibold">Crítica: {summary.critica}</span>
            </div>
          )}
          {summary.alta > 0 && (
            <span className="bg-orange-100 text-orange-700 rounded-lg px-3 py-2 text-sm font-medium">
              Alta: {summary.alta}
            </span>
          )}
          {summary.media > 0 && (
            <span className="bg-yellow-100 text-yellow-700 rounded-lg px-3 py-2 text-sm font-medium">
              Media: {summary.media}
            </span>
          )}
          {summary.unread > 0 && (
            <span className="bg-blue-100 text-blue-700 rounded-lg px-3 py-2 text-sm font-medium">
              No leídas: {summary.unread}
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input w-40" value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}>
          <option value="">Todas las severidades</option>
          <option value="CRITICA">Crítica</option>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Media</option>
          <option value="BAJA">Baja</option>
        </select>
        <select className="input w-40" value={filterResolved} onChange={(e) => { setFilterResolved(e.target.value); setPage(1); }}>
          <option value="false">Sin resolver</option>
          <option value="true">Resueltas</option>
          <option value="">Todas</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && <p className="text-gray-400 text-center py-8">Cargando alertas...</p>}
        {!isLoading && data?.results.length === 0 && (
          <div className="card p-8 text-center text-gray-400">
            <Bell size={32} className="mx-auto mb-2 opacity-40" />
            <p>No hay alertas con los filtros seleccionados.</p>
          </div>
        )}
        {data?.results.map((alert) => (
          <div
            key={alert.id}
            className={`card p-4 border-l-4 transition-opacity ${alert.is_resolved ? "opacity-60" : ""} ${
              alert.severity === "CRITICA" ? "border-l-red-500" :
              alert.severity === "ALTA"    ? "border-l-orange-500" :
              alert.severity === "MEDIA"   ? "border-l-yellow-500" : "border-l-blue-400"
            } ${!alert.is_read ? "bg-blue-50" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xl mt-0.5">{TYPE_ICONS[alert.alert_type] ?? "🔔"}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold border rounded px-2 py-0.5 ${SEVERITY_STYLES[alert.severity] ?? "bg-gray-100 text-gray-600"}`}>
                      {alert.severity}
                    </span>
                    {!alert.is_read && (
                      <span className="text-xs bg-blue-600 text-white rounded px-2 py-0.5">Nueva</span>
                    )}
                    {alert.is_resolved && (
                      <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-0.5 flex items-center gap-1">
                        <Check size={10} /> Resuelta
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{alert.title}</p>
                  <p className="text-gray-600 text-sm mt-0.5">{alert.message}</p>
                  {alert.asset_code && (
                    <p className="text-xs text-gray-400 mt-1">Activo: {alert.asset_code}</p>
                  )}
                  {alert.is_resolved && alert.resolution_note && (
                    <p className="text-xs text-green-600 mt-1">Resolución: {alert.resolution_note}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(alert.created_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </div>
              {!alert.is_resolved && (
                <div className="flex flex-col gap-2 shrink-0">
                  {!alert.is_read && (
                    <button
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                      onClick={() => markRead.mutate(alert.id)}
                    >
                      Marcar leída
                    </button>
                  )}
                  <button
                    className="text-xs text-green-600 hover:underline whitespace-nowrap"
                    onClick={() => setResolving(alert)}
                  >
                    Resolver
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span className="text-sm text-gray-600 px-3 py-2">Página {page} de {data.total_pages}</span>
          <button className="btn-secondary text-sm" disabled={page === data.total_pages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </button>
        </div>
      )}

      {resolving && <ResolveModal alert={resolving} onClose={() => setResolving(null)} />}
    </div>
  );
}

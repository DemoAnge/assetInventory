import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Package, Unlink, Power, AlertCircle,
  ChevronDown, FileText, X, ArrowRight, User, MapPin,
  Calendar, ClipboardList, Hash,
} from "lucide-react";
import toast from "react-hot-toast";
import { movementsApi } from "@/api/movementsApi";
import { locationsApi } from "@/api/locationsApi";
import { custodiansApi } from "@/api/custodiansApi";
import { assetsApi } from "@/api/assetsApi";
import { AssetSearchSelect } from "@/components/shared/AssetSearchSelect";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { AssetFormModal } from "@/features/assets/AssetFormModal";
import type { MovementFormType, MovementType, AssetMovementType } from "@/@types/movement.types";
import type { AssetType } from "@/@types/asset.types";

type Tab = "list" | "new";

const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: "TRASLADO",     label: "Traslado entre agencias/áreas" },
  { value: "PRESTAMO",     label: "Préstamo temporal" },
  { value: "DEVOLUCION",   label: "Devolución de préstamo" },
  { value: "REASIGNACION", label: "Reasignación de custodio" },
  { value: "BAJA",         label: "Baja / Retiro" },
];

const TYPE_COLORS: Record<MovementType, string> = {
  TRASLADO:     "bg-blue-100 text-blue-800",
  PRESTAMO:     "bg-purple-100 text-purple-800",
  DEVOLUCION:   "bg-green-100 text-green-800",
  REASIGNACION: "bg-yellow-100 text-yellow-800",
  INGRESO:      "bg-teal-100 text-teal-800",
  BAJA:         "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVO:        "bg-green-100 text-green-700",
  INACTIVO:      "bg-gray-100 text-gray-600",
  MANTENIMIENTO: "bg-yellow-100 text-yellow-700",
  PRESTADO:      "bg-purple-100 text-purple-700",
  VENDIDO:       "bg-orange-100 text-orange-700",
  ROBADO:        "bg-red-100 text-red-700",
};

const ASSET_STATUSES = [
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
  { value: "MANTENIMIENTO", label: "En mantenimiento" },
  { value: "PRESTADO", label: "Prestado" },
];

// ── Modal de detalles de movimiento ──────────────────────────────────────────

function MovementDetailModal({ movement, onClose }: { movement: AssetMovementType; onClose: () => void }) {
  const { data: asset } = useQuery({
    queryKey: ["asset-detail-modal", movement.asset],
    queryFn: () => assetsApi.getById(movement.asset).then((r) => r.data),
    staleTime: 60_000,
  });

  const isBAJA = movement.movement_type === "BAJA";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${TYPE_COLORS[movement.movement_type]}`}>
              {movement.movement_type_display}
            </span>
            <span className="text-gray-500 text-sm">{movement.movement_date}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Activo */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <ClipboardList size={13} /> Activo
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Código</p>
                <p className="font-mono font-bold text-primary-600 text-sm">{movement.asset_code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Serie (N° de serie)</p>
                <p className="font-mono text-sm text-gray-700">{movement.asset_serial_number || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Nombre del activo</p>
                <p className="font-medium text-gray-900">{asset?.name ?? "—"}</p>
              </div>
              {asset && (
                <>
                  <div>
                    <p className="text-xs text-gray-500">Categoría</p>
                    <p className="text-sm text-gray-700">{asset.category_display}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estado actual</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[asset.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {asset.status_display}
                    </span>
                  </div>
                  {asset.brand_name && (
                    <div>
                      <p className="text-xs text-gray-500">Marca / Modelo</p>
                      <p className="text-sm text-gray-700">{asset.brand_name} {asset.model_name}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Origen → Destino */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin size={13} /> Trayecto
            </h3>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
              {/* Origen */}
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Origen</p>
                <InfoRow label="Agencia" value={movement.origin_agency_name} />
                <InfoRow label="Custodio" value={movement.origin_custodian_name} icon={<User size={11} />} />
              </div>
              {/* Flecha central */}
              <div className="flex items-center justify-center pt-8">
                <ArrowRight size={20} className={isBAJA ? "text-red-400" : "text-primary-400"} />
              </div>
              {/* Destino */}
              {isBAJA ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Dado de baja</p>
                  <p className="text-xs text-red-500 mt-1">El activo fue retirado del inventario activo.</p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Destino</p>
                  <InfoRow label="Agencia" value={movement.dest_agency_name} />
                  <InfoRow label="Custodio" value={movement.dest_custodian_name} icon={<User size={11} />} />
                </div>
              )}
            </div>
          </div>

          {/* Detalles del movimiento */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Hash size={13} /> Detalles
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500">Motivo</p>
                <p className="text-sm text-gray-800">{movement.reason || "—"}</p>
              </div>
              {movement.observations && (
                <div>
                  <p className="text-xs text-gray-500">Observaciones</p>
                  <p className="text-sm text-gray-700">{movement.observations}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Autorizado por" value={movement.authorized_by_name} />
                {movement.document_ref && (
                  <InfoRow label="N° Acta / Documento" value={movement.document_ref} icon={<FileText size={11} />} />
                )}
                <InfoRow label="Registrado" value={new Date(movement.created_at).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} icon={<Calendar size={11} />} />
              </div>
            </div>
          </div>

          {/* Componentes arrastrados */}
          {movement.component_movements.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Package size={13} /> Componentes arrastrados ({movement.component_movements.length})
              </h3>
              <div className="space-y-1.5">
                {movement.component_movements.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <span className="font-mono text-xs font-semibold text-primary-600">{c.asset_code}</span>
                    <span className="text-xs text-gray-600">{c.asset_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 flex items-center gap-1">{icon}{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || "—"}</p>
    </div>
  );
}

// ── Subcomponente: panel de activo + componentes ─────────────────────────────

function AssetPreviewPanel({
  assetId,
  onAddComponent,
  onRefresh,
}: {
  assetId: number;
  onAddComponent: () => void;
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const [statusMenuFor, setStatusMenuFor] = useState<number | null>(null);

  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset-preview", assetId],
    // getById ya incluye components[] anidados — no se necesita segunda llamada
    queryFn: () => assetsApi.getById(assetId).then((r) => r.data),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Los componentes vienen directamente en asset.components
  const components = asset?.components ?? [];
  const compsLoading = isLoading;

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      assetsApi.update(id, { status: status as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-preview", assetId] });
      setStatusMenuFor(null);
      toast.success("Estado actualizado.");
      onRefresh();
    },
    onError: () => toast.error("Error al cambiar el estado."),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) =>
      assetsApi.deactivate(id, {
        deactivation_date: new Date().toISOString().slice(0, 10),
        reason: "Baja desde formulario de movimiento.",
      }),
    onSuccess: () => {
      // Actualiza el panel de preview y también el listado global de activos
      qc.invalidateQueries({ queryKey: ["asset-preview", assetId] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      toast.success("Activo dado de baja.");
      onRefresh();
    },
    onError: () => toast.error("No se pudo dar de baja."),
  });

  const unlinkMutation = useMutation({
    mutationFn: (compId: number) => assetsApi.removeComponent(assetId, compId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-preview", assetId] });
      toast.success("Componente desvinculado.");
      onRefresh();
    },
    onError: () => toast.error("Error al desvincular componente."),
  });

  if (isLoading) return <div className="p-3 text-sm text-gray-400">Cargando activo...</div>;
  if (!asset) return null;

  return (
    <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
      {/* Activo principal */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-primary-600 font-bold text-sm">{asset.asset_code}</span>
            <span className="text-gray-800 font-medium text-sm">{asset.name}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[asset.status] ?? "bg-gray-100 text-gray-600"}`}>
              {asset.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Cambiar estado del activo principal */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusMenuFor(statusMenuFor === asset.id ? null : asset.id)}
                className="btn-secondary text-xs flex items-center gap-1"
              >
                Cambiar estado <ChevronDown size={11} />
              </button>
              {statusMenuFor === asset.id && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[160px]">
                  {ASSET_STATUSES.map((s) => (
                    <button key={s.value} type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => changeStatusMutation.mutate({ id: asset.id, status: s.value })}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => { if (confirm(`¿Dar de baja ${asset.asset_code}?`)) deactivateMutation.mutate(asset.id); }}
              className="btn-secondary text-xs text-red-600 flex items-center gap-1"
              disabled={deactivateMutation.isPending}
            >
              <Power size={11} /> Dar de baja
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {asset.agency_name && `Agencia: ${asset.agency_name}`}
          {asset.custodian_name && ` · Custodio: ${asset.custodian_name}`}
        </div>
      </div>

      {/* Componentes */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <Package size={12} />
            Componentes vinculados {compsLoading ? "(cargando...)" : `(${components?.length ?? 0})`}
          </h4>
          <button type="button" onClick={onAddComponent}
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
            <Plus size={12} /> Agregar componente
          </button>
        </div>

        {components && components.length === 0 && (
          <p className="text-xs text-gray-400 py-1">Sin componentes vinculados.</p>
        )}

        <div className="space-y-2">
          {components?.map((comp) => (
            <div key={comp.id}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2 gap-2">
              <div className="min-w-0">
                <span className="font-mono text-xs text-primary-600 font-medium">{comp.asset_code}</span>
                <span className="text-xs text-gray-600 ml-2 truncate">{comp.name}</span>
                <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${STATUS_COLORS[comp.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {comp.status}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="relative">
                  <button type="button"
                    onClick={() => setStatusMenuFor(statusMenuFor === comp.id ? null : comp.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 flex items-center gap-1">
                    Estado <ChevronDown size={10} />
                  </button>
                  {statusMenuFor === comp.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[150px]">
                      {ASSET_STATUSES.map((s) => (
                        <button key={s.value} type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                          onClick={() => changeStatusMutation.mutate({ id: comp.id, status: s.value })}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button"
                  onClick={() => { if (confirm(`¿Dar de baja ${comp.asset_code}?`)) deactivateMutation.mutate(comp.id); }}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-gray-200"
                  title="Dar de baja">
                  <Power size={11} />
                </button>
                <button type="button"
                  onClick={() => { if (confirm(`¿Desvincular ${comp.asset_code} del activo padre?`)) unlinkMutation.mutate(comp.id); }}
                  className="text-xs text-orange-500 hover:text-orange-700 px-2 py-1 rounded border border-gray-200"
                  title="Desvincular del activo padre">
                  <Unlink size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function MovementsPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<AssetType | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [selectedMovement, setSelectedMovement] = useState<AssetMovementType | null>(null);
  const qc = useQueryClient();

  const { data: movements, isLoading } = useQuery({
    queryKey: ["movements"],
    queryFn: () => movementsApi.getAll().then((r) => r.data),
  });

  const { data: agenciesData } = useQuery({
    queryKey: ["agencies-select"],
    queryFn: () => locationsApi.getAgencies({ page_size: 100 }).then((r) => r.data.results),
    staleTime: 60_000,
  });

  const { data: custodiansData } = useQuery({
    queryKey: ["custodians-select"],
    queryFn: () => custodiansApi.getAll({ page_size: 200, is_active: true }).then((r) => r.data.results),
    staleTime: 60_000,
  });

  const agencyOptions = (agenciesData ?? []).map((a) => ({ value: a.id, label: a.name }));
  const custodianOptions = (custodiansData ?? []).map((c) => ({
    value: c.id,
    label: `${c.full_name}${c.position ? ` — ${c.position}` : ""}`,
  }));

  const [form, setForm] = useState<Partial<MovementFormType>>({
    movement_type: "TRASLADO",
    movement_date: new Date().toISOString().slice(0, 10),
    has_delivery_act: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: MovementFormType) => movementsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movements"] });
      toast.success("Movimiento registrado. Los componentes fueron arrastrados automáticamente.");
      setTab("list");
      setPreviewAsset(null);
      setForm({
        movement_type: "TRASLADO",
        movement_date: new Date().toISOString().slice(0, 10),
        has_delivery_act: false,
      });
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      if (data && typeof data === "object") {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
        toast.error(msgs || "Error al registrar el movimiento.");
      } else {
        toast.error("Error al registrar el movimiento.");
      }
    },
  });

  const handleSubmit = () => {
    if (!form.asset || !form.movement_type || !form.movement_date || !form.reason) {
      toast.error("Complete los campos requeridos: Activo, Tipo, Fecha y Motivo.");
      return;
    }
    if (form.movement_type === "TRASLADO" && !form.dest_agency) {
      toast.error("Para un traslado se requiere seleccionar la agencia destino.");
      return;
    }
    if (form.movement_type === "REASIGNACION" && !form.dest_custodian) {
      toast.error("Para una reasignación se requiere seleccionar el custodio destino.");
      return;
    }
    createMutation.mutate(form as MovementFormType);
  };

  const field = (key: keyof MovementFormType, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimientos de Activos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Traslados, préstamos, reasignaciones y bajas. Los componentes se arrastran automáticamente.
          </p>
        </div>
        <button onClick={() => { setTab(tab === "list" ? "new" : "list"); setPreviewAsset(null); }}
          className="btn-primary flex items-center gap-2">
          {tab === "list" ? <><Plus size={16} /> Nuevo Movimiento</> : "← Volver al listado"}
        </button>
      </div>

      {/* ── Listado ─────────────────────────────────────────────────────────── */}
      {tab === "list" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Código", "Serie", "Tipo", "Fecha", "Custodio", "Origen", "Destino", "Motivo", "Acta", "Comp."].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              )}
              {movements?.results?.map((mov) => (
                <tr
                  key={mov.id}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedMovement(mov)}
                  title="Click para ver detalles"
                >
                  <td className="px-4 py-3 font-mono text-primary-600 font-medium">{mov.asset_code}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{mov.asset_serial_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[mov.movement_type]}`}>
                      {mov.movement_type_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{mov.movement_date}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{mov.origin_custodian_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{mov.origin_agency_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{mov.dest_agency_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{mov.reason}</td>
                  <td className="px-4 py-3 text-center">
                    {(mov as any).has_delivery_act && mov.document_ref ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700" title={mov.document_ref}>
                        <FileText size={11} /> {mov.document_ref}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {mov.component_movements.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                        <Package size={11} /> {mov.component_movements.length}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {!isLoading && (!movements?.results || movements.results.length === 0) && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">No hay movimientos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Nuevo movimiento ──────────────────────────────────────────────── */}
      {tab === "new" && (
        /*
         * Grid 1-col (móvil): orden natural → paso 1, panel, paso 2
         * Grid 2-col (lg+):   col-1 filas 1-2 = paso1 + paso2  |  col-2 span-2 = panel
         */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── Paso 1: Selección del activo (col-1 fila-1) ───────────── */}
          <div className="card p-5 space-y-4 order-1 lg:order-none">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              Seleccionar activo
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Activo *</label>
              <AssetSearchSelect
                value={form.asset ?? null}
                onChange={async (id) => {
                  field("asset", id ?? undefined);
                  if (id) {
                    try {
                      const res = await assetsApi.getById(id);
                      setPreviewAsset(res.data);
                      setForm((f) => ({
                        ...f,
                        asset: id,
                        origin_agency: res.data.agency ?? undefined,
                        origin_custodian: res.data.custodian ?? undefined,
                      }));
                    } catch {
                      setPreviewAsset(null);
                    }
                  } else {
                    setPreviewAsset(null);
                    setForm((f) => ({
                      ...f,
                      asset: undefined,
                      origin_agency: undefined,
                      origin_custodian: undefined,
                    }));
                  }
                }}
              />
            </div>

            {!previewAsset && form.asset && (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
                <AlertCircle size={14} /> Cargando datos del activo...
              </div>
            )}
          </div>

          {/* ── Panel del activo (col-2 span-2 filas en lg, orden-2 en móvil) */}
          <div className="order-2 lg:order-none lg:row-span-2 lg:sticky lg:top-6">
            {previewAsset ? (
              <AssetPreviewPanel
                key={`${previewAsset.id}-${previewKey}`}
                assetId={previewAsset.id}
                onAddComponent={() => setShowAddComponent(true)}
                onRefresh={() => setPreviewKey((k) => k + 1)}
              />
            ) : (
              <div className="card p-8 flex flex-col items-center justify-center text-center text-gray-400 gap-3 min-h-[180px]">
                <Package size={36} className="text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Sin activo seleccionado</p>
                  <p className="text-xs mt-0.5">Seleccione un activo para ver sus detalles y componentes vinculados</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Paso 2: Detalles del movimiento (col-1 fila-2, orden-3 en móvil) */}
          <div className="card p-5 space-y-4 order-3 lg:order-none">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              Detalles del movimiento
            </h3>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              Los componentes vinculados se trasladarán automáticamente al mismo destino.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de movimiento *</label>
                <select className="input-field" value={form.movement_type}
                  onChange={(e) => field("movement_type", e.target.value as MovementType)}>
                  {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha *</label>
                <input type="date" className="input-field" value={form.movement_date}
                  onChange={(e) => field("movement_date", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Agencia destino
                  {form.movement_type === "TRASLADO" && <span className="text-red-500 ml-1">*</span>}
                </label>
                <SearchableSelect
                  options={agencyOptions}
                  value={form.dest_agency ?? null}
                  onChange={(id) => field("dest_agency", id ?? undefined)}
                  placeholder="Buscar agencia..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Custodio destino
                  {form.movement_type === "REASIGNACION" && <span className="text-red-500 ml-1">*</span>}
                </label>
                <SearchableSelect
                  options={custodianOptions}
                  value={form.dest_custodian ?? null}
                  onChange={(id) => field("dest_custodian", id ?? undefined)}
                  placeholder="Buscar custodio..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo *</label>
              <textarea className="input-field" rows={3}
                value={form.reason ?? ""}
                placeholder="Describa el motivo del movimiento..."
                onChange={(e) => field("reason", e.target.value)} />
            </div>

            {/* Acta de entrega */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={form.has_delivery_act ?? false}
                  onChange={(e) => {
                    field("has_delivery_act", e.target.checked);
                    if (!e.target.checked) field("document_ref", "");
                  }}
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <FileText size={14} className="text-gray-500" />
                  ¿Entrega con acta?
                </span>
              </label>
              {form.has_delivery_act && (
                <input
                  type="text"
                  className="input-field"
                  placeholder="N° de acta (ej: ACT-2026-001)"
                  value={form.document_ref ?? ""}
                  onChange={(e) => field("document_ref", e.target.value)}
                />
              )}
            </div>

            <button onClick={handleSubmit} disabled={createMutation.isPending || !form.asset}
              className="btn-primary w-full">
              {createMutation.isPending ? "Registrando..." : "Registrar Movimiento"}
            </button>
          </div>

        </div>
      )}

      {/* Modal para agregar componente desde el formulario de movimiento */}
      {showAddComponent && previewAsset && (
        <AssetFormModal
          parentAsset={previewAsset}
          onClose={() => {
            setShowAddComponent(false);
            setPreviewKey((k) => k + 1);
          }}
        />
      )}

      {/* Modal de detalles de movimiento */}
      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          onClose={() => setSelectedMovement(null)}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertCircle, Package, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { movementsApi } from "@/api/movementsApi";
import { assetsApi } from "@/api/assetsApi";
import { locationsApi } from "@/api/locationsApi";
import { custodiansApi } from "@/api/custodiansApi";
import { AssetSearchSelect } from "@/components/shared/AssetSearchSelect";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { AssetFormModal } from "@/features/assets/AssetFormModal";
import { useAuthStore } from "@/store/authStore";
import { ROUTES, canWriteModule } from "@/routes/appRoutes";
import type { MovementFormType, MovementType, AssetMovementType } from "@/@types/movement.types";
import type { AssetType } from "@/@types/asset.types";
import { useMovements } from "@/hooks/useMovements";
import { MOVEMENT_TYPES, TYPE_COLORS, type Tab } from "./movementConstants";
import { MovementDetailModal } from "./MovementDetailModal";
import { AssetPreviewPanel } from "./AssetPreviewPanel";

export default function MovementsPage() {
  const { user } = useAuthStore();
  const canWrite = !!user && canWriteModule(user.role, ROUTES.MOVEMENTS);
  const [tab, setTab] = useState<Tab>("list");
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<AssetType | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [selectedMovement, setSelectedMovement] = useState<AssetMovementType | null>(null);
  const qc = useQueryClient();

  const { data: movements, isLoading } = useMovements();

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
        {(canWrite || tab === "new") && (
        <button onClick={() => { setTab(tab === "list" ? "new" : "list"); setPreviewAsset(null); }}
          className="btn-primary flex items-center gap-2">
          {tab === "list" ? <><Plus size={16} /> Nuevo Movimiento</> : "← Volver al listado"}
        </button>
        )}
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
      {tab === "new" && canWrite && (
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
          canWrite={canWrite}
        />
      )}
    </div>
  );
}

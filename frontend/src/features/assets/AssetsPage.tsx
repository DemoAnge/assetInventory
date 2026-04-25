import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Package, Plus, Search, AlertTriangle, X, RotateCcw, MapPin, Tag, Building } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAssets } from "@/hooks/useAssets";
import { useAuthStore } from "@/store/authStore";
import { assetsApi } from "@/api/assetsApi";
import { AssetFormModal } from "./AssetFormModal";
import type { AssetStatus, AssetCategory } from "@/@types/asset.types";

const STATUS_COLORS: Record<AssetStatus, string> = {
  ACTIVO:        "bg-green-100 text-green-800",
  INACTIVO:      "bg-gray-100 text-gray-800",
  MANTENIMIENTO: "bg-yellow-100 text-yellow-800",
  VENDIDO:       "bg-blue-100 text-blue-800",
  PRESTADO:      "bg-purple-100 text-purple-800",
  ROBADO:        "bg-red-100 text-red-800",
};

const CATEGORY_ICONS: Record<AssetCategory, string> = {
  COMPUTO:          "🖥️",
  VEHICULO:         "🚗",
  MAQUINARIA:       "⚙️",
  MUEBLE:           "🪑",
  INMUEBLE:         "🏢",
  TELECOMUNICACION: "📡",
  OTRO:             "📦",
};

// ── Modal de detalle rápido de activo ─────────────────────────────────────────
function AssetQuickModal({ assetId, onClose }: { assetId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [showReactivate, setShowReactivate] = useState(false);
  const [reactivateStatus, setReactivateStatus] = useState("ACTIVO");
  const [reactivateReason, setReactivateReason] = useState("");

  // Fetch con any_status para obtener activos inactivos también
  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset-quick-modal", assetId],
    queryFn: () => assetsApi.getById(assetId, { any_status: "true" }).then(r => r.data),
    staleTime: 0,
  });

  const reactivateMutation = useMutation({
    mutationFn: () =>
      assetsApi.reactivate(assetId, { status: reactivateStatus, reason: reactivateReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["asset-quick-modal", assetId] });
      toast.success("Activo reactivado. Movimiento registrado en la tabla de movimientos.");
      setShowReactivate(false);
      setReactivateReason("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail ?? "Error al reactivar."),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            {asset && (
              <>
                <span className="font-mono font-bold text-primary-600 shrink-0">{asset.asset_code}</span>
                {asset.serial_number && (
                  <span className="font-mono text-xs text-gray-400 shrink-0">S/N: {asset.serial_number}</span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[asset.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {asset.status_display}
                </span>
              </>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0 ml-3">
            <X size={18} />
          </button>
        </div>

        {isLoading && (
          <div className="px-6 py-10 text-center text-gray-400">Cargando datos...</div>
        )}

        {asset && (
          <div className="px-6 py-5 space-y-5">
            {/* Datos generales */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Tag size={12} /> Información del activo
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-gray-50 rounded-xl p-4">
                {[
                  ["Nombre",        asset.name],
                  ["Categoría",     asset.category_display],
                  ["Marca / Modelo",`${asset.brand_name ?? ""} ${asset.model_name ?? ""}`.trim() || "—"],
                  ["Color",         asset.color || "—"],
                  ["Proveedor",     asset.supplier || "—"],
                  ["N° Factura",    asset.invoice_number || "—"],
                  ["F. Compra",     asset.purchase_date || "—"],
                  ["F. Baja",       asset.deactivation_date || "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium text-gray-800 text-xs">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ubicación */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <MapPin size={12} /> Ubicación y custodio
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-gray-50 rounded-xl p-4">
                {[
                  ["Agencia",      asset.agency_name     ?? "—"],
                  ["Departamento", asset.department_name ?? "—"],
                  ["Área",         asset.area_name       ?? "—"],
                  ["Custodio",     asset.custodian_name  ?? "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-medium text-gray-800 text-xs">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel de reactivación — solo si está inactivo */}
            {!asset.is_active && (
              <div className="border border-emerald-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowReactivate(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <RotateCcw size={14} /> Reactivar este activo
                  </span>
                  <span className="text-xs text-emerald-500">{showReactivate ? "▲" : "▼"}</span>
                </button>

                {showReactivate && (
                  <div className="p-4 space-y-3 bg-white">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nuevo estado *</label>
                      <select
                        className="input-field text-sm"
                        value={reactivateStatus}
                        onChange={e => setReactivateStatus(e.target.value)}
                      >
                        <option value="ACTIVO">Activo</option>
                        <option value="MANTENIMIENTO">En mantenimiento</option>
                        <option value="PRESTADO">Prestado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Motivo de reactivación *
                        <span className="text-gray-400 font-normal ml-1">(mín. 10 caracteres)</span>
                      </label>
                      <textarea
                        className="input-field resize-none text-sm"
                        rows={3}
                        value={reactivateReason}
                        onChange={e => setReactivateReason(e.target.value)}
                        placeholder="Explique por qué se reactiva este activo..."
                      />
                      <p className="text-xs mt-1 text-right text-gray-400">
                        {reactivateReason.length} / 10 mín.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={reactivateReason.trim().length < 10 || reactivateMutation.isPending}
                      onClick={() => reactivateMutation.mutate()}
                      className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      {reactivateMutation.isPending ? "Reactivando..." : "Confirmar reactivación"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Observaciones */}
            {asset.observations && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Building size={12} /> Observaciones
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{asset.observations}</p>
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <Link
            to={`/assets/${assetId}`}
            className="text-xs text-primary-600 hover:underline"
            onClick={onClose}
          >
            Ver ficha completa →
          </Link>
          <button onClick={onClose} className="btn-secondary text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const { user } = useAuthStore();
  const [sp, setSp] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  // Leer filtros desde la URL — sobreviven a navegación y reload
  const search   = sp.get("search")   ?? "";
  const category = sp.get("category") ?? "";
  const status   = sp.get("status")   ?? "";
  const page     = Number(sp.get("page") ?? "1");

  // Helper para actualizar un param sin perder los demás
  function setParam(key: string, value: string) {
    setSp(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete("page"); // reset a pág 1 al cambiar filtro
      return next;
    }, { replace: true });
  }
  function setPage(p: number) {
    setSp(prev => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set("page", String(p)); else next.delete("page");
      return next;
    }, { replace: true });
  }

  const queryParams: Record<string, unknown> = {
    page,
    ...(search   ? { search }   : {}),
    ...(category ? { category } : {}),
    ...(status === "INACTIVO"
      ? { status: "INACTIVO", is_active: "false" }
      : status
      ? { status }
      : {}),
  };

  const { data, isLoading } = useAssets(queryParams);

  const canWrite = user?.role === "ADMIN" || user?.role === "TI";

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario de Activos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {data?.count ?? 0} activos registrados
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo Activo
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, nombre, serie..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => setParam("search", e.target.value)}
            />
          </div>
          <select
            className="input-field w-auto"
            value={category}
            onChange={(e) => setParam("category", e.target.value)}
          >
            <option value="">Todas las categorías</option>
            <option value="COMPUTO">Equipo de cómputo</option>
            <option value="VEHICULO">Vehículo</option>
            <option value="MAQUINARIA">Maquinaria</option>
            <option value="MUEBLE">Mueble y ensere</option>
            <option value="INMUEBLE">Inmueble</option>
            <option value="TELECOMUNICACION">Telecomunicaciones</option>
            <option value="OTRO">Otro</option>
          </select>
          <select
            className="input-field w-auto"
            value={status}
            onChange={(e) => setParam("status", e.target.value)}
          >
            <option value="">Todos los estados (activos)</option>
            <option value="ACTIVO">Activo</option>
            <option value="MANTENIMIENTO">En mantenimiento</option>
            <option value="PRESTADO">Prestado</option>
            <option value="VENDIDO">Vendido</option>
            <option value="ROBADO">Robado</option>
            <option value="INACTIVO">Inactivo (dados de baja)</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Serie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Activo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Agencia / Área</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Custodio</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Valor compra</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Comp.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    No se encontraron activos con los filtros aplicados.
                  </td>
                </tr>
              )}
              {data?.results.map((asset) => (
                <tr
                  key={asset.id}
                  className="hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedAssetId(asset.id)}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Link to={`/assets/${asset.id}`} className="font-mono text-primary-600 hover:underline font-medium">
                      {asset.asset_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {asset.serial_number || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{asset.name}</p>
                      {asset.brand_name && <p className="text-xs text-gray-500">{asset.brand_name} {asset.model_name}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-base">{CATEGORY_ICONS[asset.category]}</span>
                    <span className="ml-1.5 text-gray-600">{asset.category_display}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[asset.status]}`}>
                      {asset.status_display}
                    </span>
                    {asset.is_fully_depreciated && (
                      <span className="ml-1 text-xs text-orange-500 font-medium">dep.</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <p>{asset.agency_name ?? "—"}</p>
                    <p className="text-gray-400">{asset.area_name ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {asset.custodian_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    ${parseFloat(asset.purchase_value).toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {asset.components_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <Package size={12} /> {asset.components_count}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {asset.is_critical_it && (
                        <AlertTriangle size={14} className="text-orange-500" aria-label="Activo crítico TI" />
                      )}
                      <Link
                        to={`/assets/${asset.id}`}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Ver →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Página {data.current_page} de {data.total_pages} — {data.count} activos
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={!data.previous}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!data.next}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {showModal && (
      <AssetFormModal onClose={() => setShowModal(false)} />
    )}

    {selectedAssetId !== null && (
      <AssetQuickModal
        assetId={selectedAssetId}
        onClose={() => setSelectedAssetId(null)}
      />
    )}
    </>
  );
}

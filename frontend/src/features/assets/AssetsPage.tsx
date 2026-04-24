import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus, Search, AlertTriangle } from "lucide-react";
import { useAssets } from "@/hooks/useAssets";
import { useAuthStore } from "@/store/authStore";
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

export default function AssetsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  // Cuando el estado es INACTIVO hay que enviar is_active=false al backend,
  // porque los activos dados de baja tienen is_active=False y el backend por
  // defecto solo devuelve is_active=True.
  const queryParams: Record<string, unknown> = {
    page,
    ...(search ? { search } : {}),
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input-field w-auto"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
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
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
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
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
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
                        <AlertTriangle size={14} className="text-orange-500" title="Activo crítico TI" />
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.previous}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
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
    </>
  );
}

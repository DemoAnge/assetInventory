/**
 * Panel de gestión de componentes de un activo padre.
 * Permite:
 *   1. Ver los componentes actuales con opción de desasociar
 *   2. Asociar un activo EXISTENTE como componente (búsqueda por código/nombre)
 *   3. Crear un componente NUEVO usando el mismo formulario de activos
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Link2, Plus, Search, Unlink, Power } from "lucide-react";
import { assetsApi } from "@/api/assetsApi";
import { AssetFormModal } from "./AssetFormModal";
import { useAssetChoices } from "@/hooks/useAssetChoices";
import type { AssetType, ComponentType } from "@/@types/asset.types";
import toast from "react-hot-toast";

interface Props {
  asset: AssetType;
  canWrite: boolean;
}

export function ComponentsPanel({ asset, canWrite }: Props) {
  const qc = useQueryClient();
  const { componentTypes } = useAssetChoices();
  const [tab, setTab] = useState<"list" | "attach">("list");
  const [showNewModal, setShowNewModal] = useState(false);
  const [attachSearch, setAttachSearch] = useState("");
  const [attachSelected, setAttachSelected] = useState<AssetType | null>(null);
  const [attachType, setAttachType] = useState<ComponentType>("OTRO");

  // Buscar activos disponibles para asociar (sin padre, activos)
  const { data: availableAssets } = useQuery({
    queryKey: ["assets-available", attachSearch],
    queryFn: () =>
      assetsApi.getAll({ search: attachSearch, page_size: 20 }).then(r =>
        r.data.results.filter(a => a.id !== asset.id && !a.parent_asset && !a.is_component)
      ),
    enabled: tab === "attach" && attachSearch.length >= 2,
    staleTime: 10_000,
  });

  const attachMutation = useMutation({
    mutationFn: (data: { component_id: number; component_type: string }) =>
      assetsApi.attachComponent(asset.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", asset.id] });
      toast.success("Componente asociado correctamente.");
      setTab("list");
      setAttachSelected(null);
      setAttachSearch("");
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al asociar el componente."),
  });

  const detachMutation = useMutation({
    mutationFn: (compId: number) => assetsApi.removeComponent(asset.id, compId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Componente desasociado.");
    },
    onError: () => toast.error("Error al desasociar el componente."),
  });

  const deactivateComponentMutation = useMutation({
    mutationFn: (compId: number) =>
      assetsApi.deactivate(compId, {
        deactivation_date: new Date().toISOString().slice(0, 10),
        reason: "Baja del componente desde el panel del activo padre.",
      }),
    onSuccess: () => {
      // Invalida tanto el detalle del padre como el listado general
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Componente dado de baja. El conteo se ha actualizado.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail ?? "No se pudo dar de baja el componente."),
  });

  return (
    <>
      <div className="card">
        {/* Header con tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Package size={18} /> Componentes ({asset.components_count})
          </h2>
          {canWrite && (
            <div className="flex gap-1">
              <button
                onClick={() => setTab("list")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  tab === "list" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setTab("attach")}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  tab === "attach" ? "bg-primary-100 text-primary-700" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Link2 size={12} /> Asociar existente
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors text-gray-500 hover:text-gray-700"
              >
                <Plus size={12} /> Crear nuevo
              </button>
            </div>
          )}
        </div>

        {/* ── Tab: Lista de componentes ── */}
        {tab === "list" && (
          <div className="p-4">
            {asset.components.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">
                Este activo no tiene componentes asociados.
              </p>
            ) : (
              <div className="space-y-2">
                {asset.components.map(comp => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                        {comp.component_type_display?.slice(0, 2) ?? "—"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{comp.name}</p>
                        <p className="text-xs text-gray-500">
                          <span className="font-mono text-primary-600">{comp.asset_code}</span>
                          {comp.brand_name && <> · {comp.brand_name} {comp.model_name}</>}
                          {comp.serial_number && <> · S/N: {comp.serial_number}</>}
                        </p>
                        <p className="text-xs text-gray-400">{comp.component_type_display}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        comp.status === "ACTIVO" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {comp.status_display}
                      </span>
                      {canWrite && (
                        <>
                          <button
                            onClick={() => {
                              if (confirm(`¿Dar de baja el componente ${comp.asset_code}? Esta acción no se puede deshacer.`))
                                deactivateComponentMutation.mutate(comp.id);
                            }}
                            disabled={deactivateComponentMutation.isPending}
                            className="text-gray-300 hover:text-red-600 p-1 rounded transition-colors"
                            title="Dar de baja este componente"
                          >
                            <Power size={14} />
                          </button>
                          <button
                            onClick={() => detachMutation.mutate(comp.id)}
                            disabled={detachMutation.isPending}
                            className="text-gray-300 hover:text-orange-500 p-1 rounded transition-colors"
                            title="Desasociar componente (sin dar de baja)"
                          >
                            <Unlink size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Asociar existente ── */}
        {tab === "attach" && (
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-500">
              Busca un activo ya registrado en el sistema para asociarlo como componente de <strong>{asset.asset_code}</strong>.
            </p>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-8"
                placeholder="Buscar por código, nombre, marca..."
                value={attachSearch}
                onChange={e => { setAttachSearch(e.target.value); setAttachSelected(null); }}
              />
            </div>

            {availableAssets && availableAssets.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-52 overflow-y-auto">
                {availableAssets.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setAttachSelected(a); setAttachSearch(`${a.asset_code} — ${a.name}`); }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                      attachSelected?.id === a.id ? "bg-primary-50" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">
                      <span className="font-mono text-primary-600">{a.asset_code}</span>
                      {" — "}{a.name}
                    </p>
                    <p className="text-xs text-gray-500">{a.category_display} · {a.status_display}</p>
                  </button>
                ))}
              </div>
            )}
            {availableAssets?.length === 0 && attachSearch.length >= 2 && (
              <p className="text-sm text-gray-400 text-center py-2">No se encontraron activos disponibles.</p>
            )}

            {attachSelected && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de componente <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={attachType}
                  onChange={e => setAttachType(e.target.value as ComponentType)}
                >
                  {componentTypes.map(ct => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setTab("list")} className="btn-secondary flex-1 text-sm">
                Cancelar
              </button>
              <button
                disabled={!attachSelected || attachMutation.isPending}
                onClick={() => attachSelected && attachMutation.mutate({
                  component_id: attachSelected.id,
                  component_type: attachType,
                })}
                className="btn-primary flex-1 text-sm"
              >
                {attachMutation.isPending ? "Asociando..." : "Asociar componente"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de creación de componente — mismo formulario que activos */}
      {showNewModal && (
        <AssetFormModal
          parentAsset={asset}
          onClose={() => {
            setShowNewModal(false);
            qc.invalidateQueries({ queryKey: ["assets", asset.id] });
          }}
        />
      )}
    </>
  );
}

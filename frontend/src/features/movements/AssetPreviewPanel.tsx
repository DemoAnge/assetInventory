import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, Unlink, Power, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { assetsApi } from "@/api/assetsApi";
import { STATUS_COLORS, ASSET_STATUSES } from "./movementConstants";

export function AssetPreviewPanel({
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
      <div className="px-4 py-3 border-b border-gray-200 bg-surface">
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
                <div className="absolute right-0 top-full mt-1 bg-surface border border-gray-200 rounded-lg shadow-lg z-30 min-w-[160px]">
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
              className="flex items-center justify-between bg-surface border border-gray-100 rounded-lg px-3 py-2 gap-2">
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
                    <div className="absolute right-0 top-full mt-1 bg-surface border border-gray-200 rounded-lg shadow-lg z-30 min-w-[150px]">
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

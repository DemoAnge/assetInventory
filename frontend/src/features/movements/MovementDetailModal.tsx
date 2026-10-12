import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, FileText, X, ArrowRight, User,
  Calendar, ClipboardList, Hash, RotateCcw, Edit2, Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { movementsApi } from "@/api/movementsApi";
import { assetsApi } from "@/api/assetsApi";
import type { AssetMovementType } from "@/@types/movement.types";
import { TYPE_COLORS, STATUS_COLORS } from "./movementConstants";

export function MovementDetailModal({ movement, onClose, canWrite }: { movement: AssetMovementType; onClose: () => void; canWrite: boolean }) {
  const qc = useQueryClient();
  const [editMode, setEditMode]     = useState(false);
  const [editReason, setEditReason] = useState(movement.reason);
  const [editObs, setEditObs]       = useState(movement.observations ?? "");
  const [showReactivate, setShowReactivate] = useState(false);
  const [reactivateStatus, setReactivateStatus] = useState("ACTIVO");
  const [reactivateReason, setReactivateReason] = useState("");

  // Fetch activo con any_status=true para obtenerlo incluso si está inactivo
  const { data: asset, refetch: refetchAsset } = useQuery({
    queryKey: ["asset-detail-modal", movement.asset],
    queryFn: () => assetsApi.getById(movement.asset, { any_status: "true" }).then((r) => r.data),
    staleTime: 0,
  });

  const isBAJA       = movement.movement_type === "BAJA";
  const assetInactive = asset ? !asset.is_active : false;

  // Guardar edición del movimiento
  const editMutation = useMutation({
    mutationFn: () => movementsApi.update(movement.id, { reason: editReason, observations: editObs }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movements"] });
      setEditMode(false);
      toast.success("Movimiento actualizado.");
    },
    onError: () => toast.error("Error al actualizar el movimiento."),
  });

  // Reactivar activo
  const reactivateMutation = useMutation({
    mutationFn: () => assetsApi.reactivate(movement.asset, { status: reactivateStatus, reason: reactivateReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      refetchAsset();
      setShowReactivate(false);
      setReactivateReason("");
      toast.success("Activo reactivado. Movimiento de reactivación registrado.");
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al reactivar."),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${TYPE_COLORS[movement.movement_type] ?? "bg-gray-100 text-gray-700"}`}>
              {movement.movement_type_display}
            </span>
            <span className="text-gray-500 text-sm">{movement.movement_date}</span>
          </div>
          <div className="flex items-center gap-2">
            {canWrite && (
            <button
              onClick={() => { setEditMode((v) => !v); setShowReactivate(false); }}
              className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition-colors ${editMode ? "bg-primary-50 border-primary-300 text-primary-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
            >
              <Edit2 size={12} /> {editMode ? "Cancelar edición" : "Editar"}
            </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={18} />
            </button>
          </div>
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
                <p className="text-xs text-gray-500">Nombre</p>
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

          {/* Panel reactivación — visible si el activo está inactivo */}
          {canWrite && assetInactive && (
            <div className="border border-emerald-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReactivate((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <RotateCcw size={14} /> Reactivar este activo
                </span>
                <span className="text-xs text-emerald-500">{showReactivate ? "▲ Cerrar" : "▼ Abrir"}</span>
              </button>
              {showReactivate && (
                <div className="p-4 space-y-3 bg-white">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nuevo estado *</label>
                    <select className="input-field text-sm" value={reactivateStatus} onChange={(e) => setReactivateStatus(e.target.value)}>
                      <option value="ACTIVO">Activo</option>
                      <option value="MANTENIMIENTO">En mantenimiento</option>
                      <option value="PRESTADO">Prestado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Motivo de reactivación * <span className="text-gray-400 font-normal">(mínimo 10 caracteres)</span>
                    </label>
                    <textarea
                      className="input-field resize-none text-sm"
                      rows={3}
                      value={reactivateReason}
                      onChange={(e) => setReactivateReason(e.target.value)}
                      placeholder="Describa el motivo por el cual se reactiva este activo..."
                    />
                    <p className="text-xs text-gray-400 mt-1">{reactivateReason.length}/10 caracteres mínimos</p>
                  </div>
                  <button
                    type="button"
                    disabled={reactivateReason.trim().length < 10 || reactivateMutation.isPending}
                    onClick={() => reactivateMutation.mutate()}
                    className="btn-primary text-sm w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    {reactivateMutation.isPending ? "Reactivando..." : "Confirmar reactivación"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Origen → Destino */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin size={13} /> Trayecto
            </h3>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Origen</p>
                <InfoRow label="Agencia" value={movement.origin_agency_name} />
                <InfoRow label="Custodio" value={movement.origin_custodian_name} icon={<User size={11} />} />
              </div>
              <div className="flex items-center justify-center pt-8">
                <ArrowRight size={20} className={isBAJA ? "text-red-400" : "text-primary-400"} />
              </div>
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

          {/* Detalles — modo vista o edición */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Hash size={13} /> Detalles del movimiento
            </h3>
            {editMode ? (
              <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motivo *</label>
                  <textarea className="input-field resize-none text-sm" rows={3}
                    value={editReason} onChange={(e) => setEditReason(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
                  <textarea className="input-field resize-none text-sm" rows={2}
                    value={editObs} onChange={(e) => setEditObs(e.target.value)} />
                </div>
                <button
                  type="button"
                  disabled={!editReason.trim() || editMutation.isPending}
                  onClick={() => editMutation.mutate()}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Save size={13} /> {editMutation.isPending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            ) : (
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
            )}
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

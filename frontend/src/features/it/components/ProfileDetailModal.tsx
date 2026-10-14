import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Package, X, Server, Wifi, RotateCcw } from "lucide-react";
import { itApi, type ITAssetProfile } from "@/api/itApi";
import { assetsApi } from "@/api/assetsApi";
import { RISK_STYLES } from "./itConstants";
import toast from "react-hot-toast";

export function ProfileDetailModal({ profile, onClose, onEdit }: {
  profile: ITAssetProfile;
  onClose: () => void;
  onEdit: () => void;
}) {
  const qc = useQueryClient();
  const [showReactivate, setShowReactivate]         = useState(false);
  const [reactivateStatus, setReactivateStatus]     = useState("ACTIVO");
  const [reactivateReason, setReactivateReason]     = useState("");
  const [currentIsActive, setCurrentIsActive]       = useState(profile.asset_is_active);

  const { data: licenses, isLoading } = useQuery({
    queryKey: ["it-license", "asset", profile.asset],
    queryFn: () => itApi.getLicensesForAsset(profile.asset).then((r) => r.data.results),
    staleTime: 0,
  });

  const reactivateMutation = useMutation({
    mutationFn: () =>
      assetsApi.reactivate(profile.asset, { status: reactivateStatus, reason: reactivateReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["it-profiles"] });
      qc.invalidateQueries({ queryKey: ["it-assets-list"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      setCurrentIsActive(true);
      setShowReactivate(false);
      setReactivateReason("");
      toast.success("Activo reactivado. Movimiento de reactivación registrado.");
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al reactivar."),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-blue-500" />
            <div>
              <span className="font-mono font-bold text-primary-600">{profile.asset_code}</span>
              {profile.asset_serial_number && (
                <span className="text-gray-400 font-mono text-xs ml-2">S/N: {profile.asset_serial_number}</span>
              )}
              <p className="text-sm text-gray-700">{profile.asset_name}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${RISK_STYLES[profile.risk_level] ?? "bg-gray-100 text-gray-600"}`}>
              {profile.risk_level}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="btn-secondary text-xs">Editar perfil</button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Specs técnicas */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Especificaciones técnicas</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm bg-gray-50 rounded-xl p-4">
              {[
                ["Hostname",       profile.hostname    || "—"],
                ["IP",             profile.ip_address  || "—"],
                ["MAC",            profile.mac_address || "—"],
                ["Sistema operativo", profile.os_name ? `${profile.os_name} ${profile.os_version}` : "—"],
                ["Procesador",     profile.processor   || "—"],
                ["RAM",            profile.ram_gb     ? `${profile.ram_gb} GB`     : "—"],
                ["Almacenamiento", profile.storage_gb ? `${profile.storage_gb} GB` : "—"],
                ["Último escaneo", profile.last_scan_date || "—"],
                ["Antivirus",      profile.antivirus   || "—"],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-medium text-gray-800">{val}</p>
                </div>
              ))}
              <div className="col-span-2 flex gap-4 pt-2 border-t border-gray-200 mt-1">
                {profile.is_server && (
                  <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                    <Server size={11} /> Servidor
                  </span>
                )}
                {profile.is_network_device && (
                  <span className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                    <Wifi size={11} /> Dispositivo de red
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Software instalado */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Package size={13} /> Software instalado
              <span className="bg-blue-100 text-blue-700 text-xs font-bold rounded-full px-2 py-0.5 ml-1">
                {profile.software_count}
              </span>
            </h3>
            {isLoading && <p className="text-xs text-gray-400">Cargando...</p>}
            {!isLoading && (!licenses || licenses.length === 0) && (
              <p className="text-xs text-gray-400 italic">Sin software asignado.</p>
            )}
            <div className="space-y-2">
              {licenses?.map((lic) => (
                <div key={lic.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lic.software_name}{lic.version ? ` v${lic.version}` : ""}</p>
                    <p className="text-xs text-gray-500">{lic.license_type_display}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-semibold ${lic.available_seats <= 0 ? "text-red-600" : lic.available_seats <= 2 ? "text-orange-600" : "text-green-600"}`}>
                      {lic.used_seats}/{lic.seats} en uso
                    </p>
                    {lic.is_expired && <p className="text-xs text-red-500">⚠ Vencida</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          {profile.notes && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notas TI</h3>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{profile.notes}</p>
            </div>
          )}

          {/* Panel de reactivación — solo si el activo está inactivo */}
          {!currentIsActive && (
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
                <div className="p-4 space-y-3 bg-surface">
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
                    <p className="text-xs text-gray-400 mt-1">{reactivateReason.length}/10 mínimo</p>
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
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

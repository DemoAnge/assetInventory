import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Package, QrCode, ArrowLeftRight, Trash2, Wrench, RotateCcw, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAsset, useAssetQr, useDeactivateAsset } from "@/hooks/useAssets";
import { useAuthStore } from "@/store/authStore";
import { assetsApi } from "@/api/assetsApi";
import { AssetFormModal } from "./AssetFormModal";
import { ComponentsPanel } from "./ComponentsPanel";
import toast from "react-hot-toast";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const assetId = Number(id);
  const { data: asset, isLoading, refetch } = useAsset(assetId);
  const { data: qrData } = useAssetQr(assetId);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showDeactivate, setShowDeactivate]     = useState(false);
  const [showEdit, setShowEdit]                 = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [showReactivate, setShowReactivate]     = useState(false);
  const [reactivateStatus, setReactivateStatus] = useState("ACTIVO");
  const [reactivateReason, setReactivateReason] = useState("");

  const deactivate = useDeactivateAsset(assetId);

  const reactivateMutation = useMutation({
    mutationFn: () =>
      assetsApi.reactivate(assetId, { status: reactivateStatus, reason: reactivateReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
      refetch();
      setShowReactivate(false);
      setReactivateReason("");
      toast.success("Activo reactivado. Movimiento registrado.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.detail ?? "Error al reactivar."),
  });

  const canWrite         = user?.role === "ADMIN" || user?.role === "TI";
  const canAccountingView = user?.role === "ADMIN" || user?.role === "CONTABILIDAD";

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }
  if (!asset) {
    return (
      <div className="card p-8 text-center space-y-3">
        <AlertCircle size={40} className="mx-auto text-gray-300" />
        <p className="text-gray-500">Activo no encontrado.</p>
        <Link to="/assets" className="text-primary-600 hover:underline text-sm">← Volver al inventario</Link>
      </div>
    );
  }

  const isInactive = !asset.is_active;

  const handleDeactivate = () => {
    if (deactivateReason.length < 10) {
      toast.error("El motivo debe tener al menos 10 caracteres.");
      return;
    }
    deactivate.mutate(
      { reason: deactivateReason, deactivation_date: new Date().toISOString().slice(0, 10) },
      { onSuccess: () => navigate("/assets") },
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/assets" className="hover:text-gray-700">← Activos</Link>
        <span>/</span>
        <span className="font-medium text-gray-900">{asset.asset_code}</span>
        {isInactive && (
          <span className="ml-2 text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
            DADO DE BAJA
          </span>
        )}
      </div>

      {/* Banner de baja */}
      {isInactive && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Este activo fue dado de baja</p>
            {asset.deactivation_date && (
              <p className="mt-0.5 text-red-600">
                Fecha de baja: <strong>{asset.deactivation_date}</strong>
              </p>
            )}
            <p className="mt-1 text-xs text-red-500">
              El activo está inactivo. Puede reactivarlo usando el panel de reactivación más abajo.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${isInactive ? "text-gray-400" : "text-gray-900"}`}>
            {asset.name}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {asset.brand_name} {asset.model_name} — {asset.category_display}
          </p>
        </div>
        {canWrite && !isInactive && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowEdit(true)} className="btn-secondary text-sm">Editar</button>
            <Link
              to={`/movements/new?asset=${asset.id}`}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              <ArrowLeftRight size={14} /> Trasladar
            </Link>
            <button
              onClick={() => setShowDeactivate(true)}
              className="btn-danger text-sm flex items-center gap-1"
            >
              <Trash2 size={14} /> Dar de Baja
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Datos generales */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Información General</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Código",          asset.asset_code],
                ["N° de Serie",     asset.serial_number ?? "—"],
                ["Estado",          asset.status_display],
                ["Categoría",       asset.category_display],
                ["Marca / Modelo",  `${asset.brand_name ?? ""} ${asset.model_name ?? ""}`.trim() || "—"],
                ["Color",           asset.color || "—"],
                ["Proveedor",       asset.supplier || "—"],
                ["N° Factura",      asset.invoice_number || "—"],
                ["Cuenta contable", asset.account_code_display ?? "—"],
                ["Fecha de baja",   asset.deactivation_date ?? "—"],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
            {asset.observations && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-gray-500 text-sm mb-1">Observaciones</dt>
                <dd className="text-gray-700 text-sm">{asset.observations}</dd>
              </div>
            )}
          </div>

          {/* Ubicación */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Ubicación</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Agencia",      asset.agency_name     ?? "—"],
                ["Departamento", asset.department_name ?? "—"],
                ["Área",         asset.area_name       ?? "—"],
                ["Custodio",     asset.custodian_name  ?? "—"],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Finanzas y depreciación */}
          {canAccountingView && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Datos Financieros</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["Valor de compra",  `$${parseFloat(asset.purchase_value).toLocaleString("es-EC", { minimumFractionDigits: 2 })}`],
                  ["Valor residual",   `$${parseFloat(asset.residual_value).toLocaleString("es-EC", { minimumFractionDigits: 2 })}`],
                  ["Valor en libros",  asset.current_value ? `$${parseFloat(asset.current_value).toLocaleString("es-EC", { minimumFractionDigits: 2 })}` : "—"],
                  ["Dep. acumulada",   `$${parseFloat(asset.accumulated_depreciation).toLocaleString("es-EC", { minimumFractionDigits: 2 })}`],
                  ["Dep. mensual",     `$${asset.monthly_depreciation.toFixed(2)}`],
                  ["Vida útil",        `${asset.useful_life_years ?? "—"} años`],
                  ["Tasa dep.",        `${asset.depreciation_rate ?? "—"}%`],
                  ["Fecha compra",     asset.purchase_date],
                  ["Fecha activación", asset.activation_date ?? "—"],
                  ["Venc. garantía",   asset.warranty_expiry ?? "—"],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
              {asset.is_fully_depreciated && (
                <div className="mt-4 p-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                  ⚠️ Este activo está totalmente depreciado.
                </div>
              )}
            </div>
          )}

          {/* Panel de reactivación — solo si está inactivo */}
          {isInactive && canWrite && (
            <div className="border border-emerald-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReactivate(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <RotateCcw size={16} /> Reactivar este activo
                </span>
                <span className="text-sm text-emerald-500">{showReactivate ? "▲ Cerrar" : "▼ Abrir"}</span>
              </button>

              {showReactivate && (
                <div className="p-5 space-y-4 bg-white">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nuevo estado *
                    </label>
                    <select
                      className="input-field"
                      value={reactivateStatus}
                      onChange={e => setReactivateStatus(e.target.value)}
                    >
                      <option value="ACTIVO">Activo</option>
                      <option value="MANTENIMIENTO">En mantenimiento</option>
                      <option value="PRESTADO">Prestado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Motivo de reactivación *
                      <span className="text-gray-400 font-normal ml-1 text-xs">(mínimo 10 caracteres)</span>
                    </label>
                    <textarea
                      className="input-field resize-none"
                      rows={3}
                      value={reactivateReason}
                      onChange={e => setReactivateReason(e.target.value)}
                      placeholder="Explique el motivo por el cual se reactiva este activo. Este registro quedará en el log de movimientos."
                    />
                    <p className="text-xs text-right text-gray-400 mt-1">
                      {reactivateReason.length} / 10 caracteres mínimos
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={reactivateReason.trim().length < 10 || reactivateMutation.isPending}
                    onClick={() => reactivateMutation.mutate()}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RotateCcw size={16} />
                    {reactivateMutation.isPending ? "Reactivando..." : "Confirmar reactivación"}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Al reactivar se creará automáticamente un movimiento de tipo
                    <strong> REACTIVACION</strong> con el motivo ingresado.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Componentes — solo activos */}
          {!isInactive && <ComponentsPanel asset={asset} canWrite={canWrite} />}
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* QR */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <QrCode size={18} /> Código QR
            </h2>
            {qrData ? (
              <div className="space-y-3">
                <img
                  src={`data:image/png;base64,${qrData.qr_base64}`}
                  alt="QR Activo"
                  className="w-full rounded-lg border border-gray-200"
                />
                <p className="text-xs text-gray-500 text-center font-mono">{asset.asset_code}</p>
                <p className="text-xs text-gray-400 text-center break-all">{asset.qr_uuid}</p>
                <a
                  href={`data:image/png;base64,${qrData.qr_base64}`}
                  download={`QR-${asset.asset_code}.png`}
                  className="btn-secondary w-full text-xs text-center block py-1.5"
                >
                  Descargar QR
                </a>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400">
                <QrCode size={48} className="opacity-30" />
              </div>
            )}
          </div>

          {/* Flags y estado */}
          <div className="card p-4 space-y-2 text-sm">
            {isInactive && (
              <div className="flex items-center gap-2 text-red-600 font-medium">
                <AlertCircle size={14} /> Activo dado de baja
              </div>
            )}
            {asset.is_critical_it && (
              <div className="flex items-center gap-2 text-orange-600">
                <span>⚠️</span> Activo crítico TI
              </div>
            )}
            {asset.requires_maintenance && (
              <div className="flex items-center gap-2 text-yellow-600">
                <Wrench size={14} /> Requiere mantenimiento
              </div>
            )}
            {asset.is_component && (
              <div className="flex items-center gap-2 text-blue-600">
                <Package size={14} /> Componente de {asset.parent_code}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal edición */}
      {showEdit && (
        <AssetFormModal asset={asset} onClose={() => setShowEdit(false)} />
      )}

      {/* Modal baja */}
      {showDeactivate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Dar de Baja — {asset.asset_code}</h3>
            {asset.components_count > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⛔ Este activo tiene {asset.components_count} componente(s) activo(s).
                Debe disolverlos antes de darlo de baja.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo de la baja</label>
              <textarea
                className="input-field"
                rows={3}
                value={deactivateReason}
                onChange={e => setDeactivateReason(e.target.value)}
                placeholder="Ingrese el motivo de la baja (mínimo 10 caracteres)..."
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeactivate(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivate.isPending || asset.components_count > 0}
                className="btn-danger flex-1"
              >
                {deactivate.isPending ? "Procesando..." : "Confirmar Baja"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

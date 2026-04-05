import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Package, QrCode, ArrowLeftRight, Trash2, ChevronLeft, Wrench } from "lucide-react";
import { useAsset, useAssetQr, useDeactivateAsset } from "@/hooks/useAssets";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const assetId = Number(id);
  const { data: asset, isLoading } = useAsset(assetId);
  const { data: qrData } = useAssetQr(assetId);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
  const deactivate = useDeactivateAsset(assetId);

  const canWrite = user?.role === "ADMIN" || user?.role === "TI";
  const canAccountingView = user?.role === "ADMIN" || user?.role === "CONTABILIDAD";

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>;
  }
  if (!asset) {
    return <div className="card p-8 text-center text-gray-500">Activo no encontrado.</div>;
  }

  const handleDeactivate = () => {
    if (deactivateReason.length < 10) {
      toast.error("El motivo debe tener al menos 10 caracteres.");
      return;
    }
    deactivate.mutate(
      { reason: deactivateReason, deactivation_date: new Date().toISOString().slice(0, 10) },
      { onSuccess: () => navigate("/assets") }
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/assets" className="hover:text-gray-700">← Activos</Link>
        <span>/</span>
        <span className="font-medium text-gray-900">{asset.asset_code}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{asset.brand} {asset.model_name} — {asset.category_display}</p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <>
              <Link to={`/assets/${asset.id}/edit`} className="btn-secondary text-sm">Editar</Link>
              <Link to={`/movements/new?asset=${asset.id}`} className="btn-secondary text-sm flex items-center gap-1">
                <ArrowLeftRight size={14} /> Trasladar
              </Link>
              <button
                onClick={() => setShowDeactivate(true)}
                className="btn-danger text-sm flex items-center gap-1"
              >
                <Trash2 size={14} /> Dar de Baja
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos generales */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Información General</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Código", asset.asset_code],
                ["N° de Serie", asset.serial_number ?? "—"],
                ["Estado", asset.status_display],
                ["Categoría", asset.category_display],
                ["Marca / Modelo", `${asset.brand} ${asset.model_name}`.trim() || "—"],
                ["Color", asset.color || "—"],
                ["Proveedor", asset.supplier || "—"],
                ["N° Factura", asset.invoice_number || "—"],
                ["Cuenta SEPS", asset.seps_account_code || "—"],
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
                ["Agencia", asset.agency_name ?? "—"],
                ["Departamento", asset.department_name ?? "—"],
                ["Área", asset.area_name ?? "—"],
                ["Custodio", asset.custodian_name ?? "—"],
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
              <h2 className="font-semibold text-gray-900 mb-4">Datos Financieros — LORTI Art. 28</h2>
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

          {/* Componentes */}
          {asset.components_count > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package size={18} /> Componentes ({asset.components_count})
                </h2>
                {canWrite && (
                  <Link to={`/assets/${asset.id}/components/new`} className="btn-secondary text-xs">
                    + Agregar componente
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {asset.components.map((comp) => (
                  <div key={comp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-mono text-primary-600 text-sm font-medium">{comp.asset_code}</span>
                      <span className="mx-2 text-gray-400">—</span>
                      <span className="text-gray-700 text-sm">{comp.name}</span>
                      {comp.component_type_display && (
                        <span className="ml-2 text-xs text-gray-500">({comp.component_type_display})</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      comp.status === "ACTIVO" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                    }`}>
                      {comp.status_display}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel lateral — QR */}
        <div className="space-y-4">
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

          {/* Flags */}
          <div className="card p-4 space-y-2 text-sm">
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
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Ingrese el motivo de la baja (mínimo 10 caracteres)..."
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeactivate(false)} className="btn-secondary flex-1">Cancelar</button>
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

import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import type { AssetType } from "@/@types/asset.types";
import { ROUTES } from "@/routes/appRoutes";
import { TONE_CLASS, TONE_DOT, bookValue, conditionOf, formatUsd, locationLabel } from "./dashboardUtils";

export function AssetControlDrawer({
  asset,
  onClose,
}: {
  asset: AssetType | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const open = !!asset;
  const cond = asset ? conditionOf(asset) : null;

  return (
    <div
      className={`fixed inset-0 z-drawer ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Cerrar ficha"
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={asset ? `Ficha ${asset.asset_code}` : "Ficha de activo"}
        className={`absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface p-5 transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {asset && cond && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-fx-300 tabular-nums">{asset.asset_code}</p>
                <h2 className="text-lg font-medium text-ink mt-1">{asset.name}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar ficha"
                className="flex h-11 w-11 items-center justify-center rounded-control text-fx-400 hover:bg-fx-900 hover:text-fx-100"
              >
                <X size={16} />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              <div>
                <dt className="text-fx-500">Estado</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-control border px-1.5 py-0.5 text-[11px] ${TONE_CLASS[cond.tone]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[cond.tone]}`} aria-hidden />
                    {asset.status_display}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-fx-500">Condición</dt>
                <dd className="mt-1 text-fx-100">{cond.label}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-fx-500">Custodia</dt>
                <dd className="mt-1 text-fx-100">{asset.custodian_name ?? "Sin custodio"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-fx-500">Ubicación</dt>
                <dd className="mt-1 text-fx-100">{locationLabel(asset)}</dd>
              </div>
              <div>
                <dt className="text-fx-500">En libros</dt>
                <dd className="mt-1 font-mono tabular-nums text-fx-100">{formatUsd(bookValue(asset))}</dd>
              </div>
              <div>
                <dt className="text-fx-500">Tasa</dt>
                <dd className="mt-1 font-mono tabular-nums text-fx-100">
                  {asset.depreciation_rate ? `${asset.depreciation_rate}%` : "n/d"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-fx-500">QR</dt>
                <dd className="mt-1 font-mono text-[12px] text-fx-300 break-all">{asset.qr_uuid}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => navigate(ROUTES.ASSET_DETAIL(asset.id))}
              className="btn-primary mt-6 h-10 w-full"
            >
              Abrir ficha completa
            </button>
          </>
        )}
      </aside>
    </div>
  );
}

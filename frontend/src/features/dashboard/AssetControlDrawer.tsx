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
        className={`dash-cockpit absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-[var(--dash-line)] bg-[var(--dash-panel)] p-5 transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {asset && cond && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm tabular-nums text-[var(--dash-muted)]">{asset.asset_code}</p>
                <h2 className="mt-1 text-lg font-medium text-[var(--dash-text)]">{asset.name}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar ficha"
                className="flex h-11 w-11 items-center justify-center rounded-control text-[var(--dash-muted)] hover:bg-[var(--dash-panel-2)] hover:text-[var(--dash-text)]"
              >
                <X size={16} />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              <div>
                <dt className="text-[var(--dash-muted)]">Estado</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-control border px-1.5 py-0.5 text-[11px] ${TONE_CLASS[cond.tone]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[cond.tone]}`} aria-hidden />
                    {asset.status_display}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[var(--dash-muted)]">Condición</dt>
                <dd className="mt-1 text-[var(--dash-text)]">{cond.label}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[var(--dash-muted)]">Custodia</dt>
                <dd className="mt-1 text-[var(--dash-text)]">{asset.custodian_name ?? "Sin custodio"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[var(--dash-muted)]">Ubicación</dt>
                <dd className="mt-1 text-[var(--dash-text)]">{locationLabel(asset)}</dd>
              </div>
              <div>
                <dt className="text-[var(--dash-muted)]">En libros</dt>
                <dd className="mt-1 font-mono tabular-nums text-[var(--dash-text)]">{formatUsd(bookValue(asset))}</dd>
              </div>
              <div>
                <dt className="text-[var(--dash-muted)]">Tasa</dt>
                <dd className="mt-1 font-mono tabular-nums text-[var(--dash-text)]">
                  {asset.depreciation_rate ? `${asset.depreciation_rate}%` : "n/d"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[var(--dash-muted)]">QR</dt>
                <dd className="mt-1 break-all font-mono text-[12px] text-[var(--dash-muted)]">{asset.qr_uuid}</dd>
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

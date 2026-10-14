import type { AssetStatus, AssetType } from "@/@types/asset.types";
import { TONE_CLASS, TONE_DOT, conditionOf, locationLabel, statusTone } from "./dashboardUtils";

const STATUS_FILTERS: { id: "ALL" | AssetStatus; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "ACTIVO", label: "Activo" },
  { id: "MANTENIMIENTO", label: "Mantenimiento" },
  { id: "ROBADO", label: "Faltante" },
  { id: "INACTIVO", label: "Inactivo" },
];

export interface InventoryTableProps {
  assets: AssetType[];
  loading: boolean;
  query: string;
  onQuery: (value: string) => void;
  status: "ALL" | AssetStatus;
  onStatus: (value: "ALL" | AssetStatus) => void;
  selectedId: number | null;
  onSelect: (asset: AssetType) => void;
}

export function InventoryTable({
  assets,
  loading,
  query,
  onQuery,
  status,
  onStatus,
  selectedId,
  onSelect,
}: InventoryTableProps) {
  return (
    <section aria-label="Inventario en vivo" className="flex min-h-0 flex-1 flex-col border-b border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-fx-800 px-4 py-2">
        <h2 className="text-sm font-medium text-fx-100 mr-auto">Inventario</h2>
        <label className="sr-only" htmlFor="inventory-search">Buscar activo</label>
        <input
          id="inventory-search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Código, serie, custodio, sitio"
          className="h-9 w-full sm:w-64 rounded-control border border-fx-700 bg-fx-900 px-3 text-sm text-fx-100 placeholder-fx-500"
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtro de estado">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onStatus(f.id)}
              className={`h-9 px-2.5 text-[12px] rounded-control border transition-colors duration-200 ${
                status === f.id
                  ? "border-transparent bg-brand text-white"
                  : "border-fx-800 bg-transparent text-fx-400 hover:text-fx-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 bg-surface text-[11px] text-ink-subtle">
            <tr className="border-b border-fx-800">
              <th className="px-4 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Activo</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Custodia</th>
              <th className="px-3 py-2 font-medium">Ubicación</th>
              <th className="px-3 py-2 font-medium">Condición</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8">
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-8 animate-pulse bg-fx-900 rounded-control" />
                    ))}
                  </div>
                </td>
              </tr>
            )}
            {!loading && assets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-fx-500">
                  No hay filas para este filtro. Ajuste la búsqueda o registre un activo en el panel de alta.
                </td>
              </tr>
            )}
            {!loading && assets.map((asset) => {
              const cond = conditionOf(asset);
              const st = statusTone(asset.status);
              const selected = selectedId === asset.id;
              return (
                <tr
                  key={asset.id}
                  onClick={() => onSelect(asset)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(asset);
                    }
                  }}
                  tabIndex={0}
                  className={`cursor-pointer border-b border-fx-800/80 hover:bg-fx-900/80 ${selected ? "bg-fx-900 border-l-2 border-l-fx-accent" : ""}`}
                >
                  <td className="px-4 py-2 font-mono text-[12px] text-fx-300 tabular-nums whitespace-nowrap">
                    {asset.asset_code}
                  </td>
                  <td className="px-3 py-2 text-fx-100">
                    <p className="truncate max-w-[220px]">{asset.name}</p>
                    {asset.serial_number && (
                      <p className="font-mono text-[11px] text-fx-500">{asset.serial_number}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-control border px-1.5 py-0.5 text-[11px] ${TONE_CLASS[st]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[st]}`} aria-hidden />
                      {asset.status_display}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-fx-300 truncate max-w-[160px]">
                    {asset.custodian_name ?? "Sin custodio"}
                  </td>
                  <td className="px-3 py-2 text-fx-400 truncate max-w-[200px]">
                    {locationLabel(asset)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[11px] ${TONE_CLASS[cond.tone].split(" ")[0]}`}>{cond.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

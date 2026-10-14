import type { AssetType } from "@/@types/asset.types";

interface Site {
  name: string;
  count: number;
}

function sitesFrom(assets: AssetType[]): Site[] {
  const map = new Map<string, number>();
  for (const a of assets) {
    const name = a.agency_name || "Sin agencia";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function LocationDistribution({
  assets,
  loading,
  active,
  onSelect,
}: {
  assets: AssetType[];
  loading: boolean;
  active: string | null;
  onSelect: (name: string | null) => void;
}) {
  const sites = sitesFrom(assets);
  const max = sites[0]?.count ?? 1;

  return (
    <section aria-label="Distribución por sitio" className="min-h-[280px] rounded-panel border border-line bg-surface p-4">
      <h2 className="text-sm font-medium text-fx-100">Sitios</h2>
      <p className="text-[12px] text-fx-500 mt-0.5">Asignación espacial por agencia. Pulse una celda para filtrar el inventario.</p>
      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-px bg-fx-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse bg-fx-900" />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <p className="mt-8 text-sm text-fx-500">No hay agencias en el registro.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-px bg-fx-800 border border-fx-800">
          {sites.map((site) => {
            const weight = site.count / max;
            const selected = active === site.name;
            return (
              <button
                key={site.name}
                type="button"
                onClick={() => onSelect(selected ? null : site.name)}
                className={`min-h-[72px] p-3 text-left transition-colors duration-200 ${selected ? "ring-1 ring-inset ring-fx-accent" : ""}`}
                style={{ backgroundColor: `rgb(var(--c-accent) / ${0.08 + weight * 0.28})` }}
              >
                <p className="text-[12px] text-fx-300 truncate">{site.name}</p>
                <p className="mt-1 font-mono text-lg tabular-nums text-ink">{site.count}</p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

import { formatRate, formatUsd } from "./dashboardUtils";

export interface KpiStripProps {
  bookValue: number;
  activeMaintenance: number;
  depreciationRate: number;
  auditScore: number;
  auditGaps: number;
  sampleSize: number;
  loading?: boolean;
}

function toneForAudit(score: number, sample: number): string {
  if (sample === 0) return "text-fx-400";
  if (score >= 90) return "text-emerald-400";
  if (score >= 70) return "text-amber-400";
  return "text-red-400";
}

function Cell({
  label,
  value,
  hint,
  valueClass = "text-ink",
}: {
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
}) {
  return (
    <div className="px-4 py-3 min-w-0">
      <p className="text-[11px] text-fx-500">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-medium tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-fx-500 truncate">{hint}</p>
    </div>
  );
}

export function KpiStrip({
  bookValue,
  activeMaintenance,
  depreciationRate,
  auditScore,
  auditGaps,
  sampleSize,
  loading,
}: KpiStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line bg-surface lg:grid-cols-4 lg:divide-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse bg-fx-900" />
        ))}
      </div>
    );
  }

  return (
    <section aria-label="Indicadores" className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line bg-surface lg:grid-cols-4 lg:divide-y-0">
      <Cell
        label="Valor en libros"
        value={formatUsd(bookValue)}
        hint={sampleSize === 0 ? "Sin muestra" : `${sampleSize} activos en registro`}
        valueClass="text-fx-accent"
      />
      <Cell
        label="Mantenimiento activo"
        value={String(activeMaintenance)}
        hint="Órdenes abiertas o vencidas"
        valueClass={activeMaintenance > 0 ? "text-amber-400" : "text-emerald-400"}
      />
      <Cell
        label="Tasa de depreciación"
        value={sampleSize === 0 ? "n/d" : formatRate(depreciationRate)}
        hint="Promedio del catálogo con tasa"
      />
      <Cell
        label="Preparación de auditoría"
        value={sampleSize === 0 ? "n/d" : formatRate(auditScore)}
        hint={sampleSize === 0 ? "Sin muestra" : `${auditGaps} huecos de custodia, sitio o cuenta`}
        valueClass={toneForAudit(auditScore, sampleSize)}
      />
    </section>
  );
}

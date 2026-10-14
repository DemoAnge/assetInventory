import { RefreshCw, Search, Plus } from "lucide-react";
import {
  DATE_RANGE_OPTIONS,
  PRESET_OPTIONS,
  type DashboardFilterOption,
  type DashboardPresetId,
  type DateRangeId,
} from "../types";

export function DashboardToolbar({
  title,
  subtitle,
  stamp,
  preset,
  onPreset,
  range,
  onRange,
  query,
  onQuery,
  status,
  onStatus,
  statusOptions,
  site,
  onSite,
  siteOptions,
  refreshing,
  onRefresh,
  canCreate,
  onCreate,
}: {
  title: string;
  subtitle?: string;
  stamp?: string;
  preset: DashboardPresetId;
  onPreset: (id: DashboardPresetId) => void;
  range: DateRangeId;
  onRange: (id: DateRangeId) => void;
  query: string;
  onQuery: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  statusOptions: DashboardFilterOption[];
  site: string;
  onSite: (value: string) => void;
  siteOptions: DashboardFilterOption[];
  refreshing?: boolean;
  onRefresh: () => void;
  canCreate?: boolean;
  onCreate?: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-app/90 px-3 py-2.5 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-2 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-[var(--dash-muted)]">SGA-CO</p>
          <h1 className="truncate text-[15px] font-medium text-[var(--dash-text)]">{title}</h1>
          {subtitle && <p className="truncate text-[11px] text-[var(--dash-muted)]">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Módulo del panel">
          {PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={preset === opt.id}
              onClick={() => onPreset(opt.id)}
              className={`dash-chip ${preset === opt.id ? "dash-chip-on" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {stamp && (
            <p className="hidden font-mono text-[11px] tabular-nums text-[var(--dash-faint)] lg:block">
              {stamp}
            </p>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="dash-chip inline-flex items-center gap-1.5"
            aria-label="Actualizar"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          {canCreate && onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="dash-chip dash-chip-on inline-flex items-center gap-1.5"
            >
              <Plus size={13} />
              Registrar
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--dash-faint)]" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Código, serie, custodio, sitio"
            className="dash-input w-full pl-7"
            aria-label="Filtro de búsqueda"
          />
        </label>

        <select
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className="dash-input"
          aria-label="Estado"
        >
          {statusOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={site}
          onChange={(e) => onSite(e.target.value)}
          className="dash-input max-w-[180px]"
          aria-label="Sitio"
        >
          {siteOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Rango de fechas">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onRange(opt.id)}
              className={`dash-chip ${range === opt.id ? "dash-chip-on" : ""}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

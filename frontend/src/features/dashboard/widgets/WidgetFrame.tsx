import type { ReactNode } from "react";
import type { WidgetSize } from "../types";

export const SIZE_CLASS: Record<WidgetSize, string> = {
  small: "col-span-12 sm:col-span-6 xl:col-span-4",
  medium: "col-span-12 md:col-span-6",
  large: "col-span-12 xl:col-span-8",
  full: "col-span-12",
};

const SIZE_MIN: Record<WidgetSize, string> = {
  small: "min-h-[220px]",
  medium: "min-h-[260px]",
  large: "min-h-[300px]",
  full: "min-h-[240px]",
};

export function WidgetFrame({
  title,
  hint,
  size,
  loading,
  error,
  empty,
  hasData,
  actions,
  children,
}: {
  title: string;
  hint?: string;
  size: WidgetSize;
  loading?: boolean;
  error?: string;
  empty?: string;
  hasData: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${SIZE_CLASS[size]} ${SIZE_MIN[size]} dash-panel flex flex-col overflow-hidden`}>
      <header className="flex items-start justify-between gap-3 border-b border-[var(--dash-line)] px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-medium text-[var(--dash-text)]">{title}</h2>
          {hint && <p className="mt-0.5 text-[11px] text-[var(--dash-muted)]">{hint}</p>}
        </div>
        {actions}
      </header>
      <div className="min-h-0 flex-1 p-3">
        {loading && (
          <div className="flex h-full flex-col gap-2" aria-busy="true">
            <div className="dash-skeleton h-4 w-1/3" />
            <div className="dash-skeleton h-full min-h-[120px] w-full" />
          </div>
        )}
        {!loading && error && (
          <p className="flex h-full items-center text-sm text-[var(--dash-crit)]">{error}</p>
        )}
        {!loading && !error && !hasData && (
          <p className="flex h-full items-center text-sm text-[var(--dash-muted)]">
            {empty || "Sin datos para este recorte."}
          </p>
        )}
        {!loading && !error && hasData && children}
      </div>
    </section>
  );
}

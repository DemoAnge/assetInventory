import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import type {
  AlertItem,
  HeatCell,
  ListItem,
  MapSite,
  ProgressItem,
  RankingItem,
  StatusItem,
  TableColumn,
  TableRow,
  TimelineItem,
  Tone,
  WidgetConfig,
} from "../types";
import { WidgetFrame } from "./WidgetFrame";
import { DASH_COLORS } from "./chartTheme";

const TONE_TEXT: Record<Tone, string> = {
  info: "text-[var(--dash-info)]",
  ok: "text-[var(--dash-ok)]",
  warn: "text-[var(--dash-warn)]",
  crit: "text-[var(--dash-crit)]",
  cat: "text-[var(--dash-cat)]",
  hot: "text-[var(--dash-hot)]",
  mute: "text-[var(--dash-muted)]",
};

const TONE_DOT: Record<Tone, string> = {
  info: "bg-[var(--dash-info)]",
  ok: "bg-[var(--dash-ok)]",
  warn: "bg-[var(--dash-warn)]",
  crit: "bg-[var(--dash-crit)]",
  cat: "bg-[var(--dash-cat)]",
  hot: "bg-[var(--dash-hot)]",
  mute: "bg-[var(--dash-faint)]",
};

const PAGE_SIZE = 8;

function heatColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "color-mix(in srgb, var(--dash-info) 6%, transparent)";
  const t = Math.max(12, Math.min(100, Math.round((value / max) * 100)));
  return `color-mix(in srgb, var(--dash-info) ${t}%, transparent)`;
}

export function HeatmapWidget({ widget }: { widget: WidgetConfig }) {
  const cells = (widget.data as HeatCell[] | undefined) ?? [];
  const xs = [...new Set(cells.map((c) => c.x))];
  const ys = [...new Set(cells.map((c) => c.y))];
  const max = cells.reduce((m, c) => Math.max(m, c.value), 0);
  const lookup = new Map(cells.map((c) => [`${c.x}|${c.y}`, c.value]));

  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={cells.length > 0}
    >
      <div className="overflow-auto">
        <table className="w-full border-separate border-spacing-1 text-[11px]">
          <thead>
            <tr>
              <th className="w-24" />
              {xs.map((x) => (
                <th key={x} className="px-1 pb-1 font-medium text-[var(--dash-muted)]">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ys.map((y) => (
              <tr key={y}>
                <th className="pr-2 text-left font-medium text-[var(--dash-muted)]">{y}</th>
                {xs.map((x) => {
                  const v = lookup.get(`${x}|${y}`) ?? 0;
                  return (
                    <td key={x}>
                      <div
                        title={`${y} / ${x}: ${v}`}
                        className="flex h-8 items-center justify-center rounded-md font-mono tabular-nums text-[var(--dash-text)]"
                        style={{ background: heatColor(v, max) }}
                      >
                        {v || ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetFrame>
  );
}

export function TableWidget({
  widget,
  onRow,
}: {
  widget: WidgetConfig;
  onRow?: (row: TableRow) => void;
}) {
  const rows = (widget.data as TableRow[] | undefined) ?? [];
  const columns = (widget.options?.columns as TableColumn[] | undefined) ?? [];
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let next = rows;
    if (needle) {
      next = rows.filter((r) =>
        Object.values(r.cells).some((v) => String(v).toLowerCase().includes(needle)),
      );
    }
    if (sortKey) {
      next = [...next].sort((a, b) => {
        const av = a.cells[sortKey];
        const bv = b.cells[sortKey];
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""), "es");
        return dir === "asc" ? cmp : -cmp;
      });
    }
    return next;
  }, [rows, q, sortKey, dir]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const primary = columns[0]?.key;

  const toggleSort = (key: string) => {
    if (sortKey === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir("asc");
    }
    setPage(0);
  };

  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={rows.length > 0}
      actions={
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar"
          aria-label={`Buscar en ${widget.title}`}
          className="dash-input h-8 w-28 sm:w-40"
        />
      }
    >
      <div className="flex h-full flex-col">
        <div className="md:hidden space-y-2">
          {slice.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onRow?.(row)}
              className="w-full rounded-md border border-[var(--dash-line)] bg-[var(--dash-panel-2)] p-2.5 text-left"
            >
              <p className="truncate text-[13px] text-[var(--dash-text)]">
                {primary ? String(row.cells[primary] ?? "") : row.id}
              </p>
              <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-[var(--dash-muted)]">
                {columns.slice(1, 5).map((col) => (
                  <div key={col.key} className="truncate">
                    <span className="text-[var(--dash-faint)]">{col.label}: </span>
                    {String(row.cells[col.key] ?? "—")}
                  </div>
                ))}
              </dl>
            </button>
          ))}
        </div>

        <div className="hidden min-h-0 flex-1 overflow-auto md:block">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 bg-[var(--dash-panel)] text-[11px] text-[var(--dash-muted)]">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.align === "right" ? "text-right" : ""}>
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 font-medium hover:text-[var(--dash-text)]"
                    >
                      {col.label}
                      {sortKey === col.key &&
                        (dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRow?.(row)}
                  className={`border-t border-[var(--dash-line)] ${onRow ? "cursor-pointer hover:bg-[var(--dash-panel-2)]" : ""}`}
                >
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`px-2 py-1.5 ${i === 0 ? "font-mono text-[var(--dash-text)]" : "text-[var(--dash-muted)]"} ${col.align === "right" ? "text-right tabular-nums" : "truncate max-w-[180px]"}`}
                    >
                      {String(row.cells[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--dash-muted)]">
          <span>
            {filtered.length} fila{filtered.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="dash-chip h-7 px-2 disabled:opacity-40"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="tabular-nums">
              {safePage + 1}/{pages}
            </span>
            <button
              type="button"
              className="dash-chip h-7 px-2 disabled:opacity-40"
              disabled={safePage >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}

export function ListWidget({ widget }: { widget: WidgetConfig }) {
  const items = (widget.data as ListItem[] | undefined) ?? [];
  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={items.length > 0}
    >
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-md px-1 py-1.5 hover:bg-[var(--dash-panel-2)]"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] text-[var(--dash-text)]">{item.title}</p>
              {item.meta && <p className="truncate text-[11px] text-[var(--dash-muted)]">{item.meta}</p>}
            </div>
            {item.value && (
              <span className={`shrink-0 font-mono text-[12px] tabular-nums ${TONE_TEXT[item.tone ?? "mute"]}`}>
                {item.value}
              </span>
            )}
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}

export function TimelineWidget({ widget }: { widget: WidgetConfig }) {
  const items = (widget.data as TimelineItem[] | undefined) ?? [];
  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={items.length > 0}
    >
      <ol className="relative space-y-3 pl-4 before:absolute before:left-[5px] before:top-1 before:h-[calc(100%-8px)] before:w-px before:bg-[var(--dash-line)]">
        {items.map((item) => (
          <li key={item.id} className="relative">
            <span className={`absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full ${TONE_DOT[item.tone]}`} />
            <p className="text-[13px] text-[var(--dash-text)]">{item.title}</p>
            <p className="text-[11px] text-[var(--dash-muted)]">{item.detail}</p>
            <p className="mt-0.5 font-mono text-[10px] tabular-nums text-[var(--dash-faint)]">{item.at}</p>
          </li>
        ))}
      </ol>
    </WidgetFrame>
  );
}

export function ProgressWidget({ widget }: { widget: WidgetConfig }) {
  const items = (widget.data as ProgressItem[] | undefined) ?? [];
  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={items.length > 0}
    >
      <ul className="space-y-3">
        {items.map((item) => {
          const pct = item.max > 0 ? Math.min(100, (item.value / item.max) * 100) : 0;
          return (
            <li key={item.id}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-[var(--dash-muted)]">{item.label}</span>
                <span className="font-mono tabular-nums text-[var(--dash-text)]">
                  {item.value}/{item.max}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--dash-panel-2)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: DASH_COLORS[item.tone && item.tone !== "mute" ? item.tone : "info"],
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </WidgetFrame>
  );
}

export function GaugeWidget({ widget }: { widget: WidgetConfig }) {
  const data = (widget.data as { value: number; max?: number; label?: string } | undefined) ?? {
    value: 0,
  };
  const max = data.max ?? 100;
  const pct = max > 0 ? Math.max(0, Math.min(1, data.value / max)) : 0;
  const r = 54;
  const c = 2 * Math.PI * r;
  const tone: Tone = pct >= 0.85 ? "ok" : pct >= 0.6 ? "warn" : "crit";

  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData
    >
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="70" cy="70" r={r} fill="none" stroke={DASH_COLORS.grid} strokeWidth="10" />
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={DASH_COLORS[tone]}
              strokeWidth="10"
              strokeDasharray={`${c * pct} ${c}`}
              strokeLinecap="round"
            />
          </svg>
          <p className="absolute inset-0 flex items-center justify-center font-mono text-2xl font-semibold tabular-nums text-[var(--dash-text)]">
            {data.value.toFixed(data.value % 1 === 0 ? 0 : 1)}
            {max === 100 ? "%" : ""}
          </p>
        </div>
        {data.label && <p className="text-[11px] text-[var(--dash-muted)]">{data.label}</p>}
      </div>
    </WidgetFrame>
  );
}

export function ActivityWidget({ widget }: { widget: WidgetConfig }) {
  const items = (widget.data as TimelineItem[] | undefined) ?? [];
  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={items.length > 0}
    >
      <ul className="divide-y divide-[var(--dash-line)]">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-[var(--dash-text)]">{item.title}</p>
              <p className="truncate text-[11px] text-[var(--dash-muted)]">{item.detail}</p>
            </div>
            <time className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--dash-faint)]">
              {item.at}
            </time>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}

export function AlertsWidget({ widget }: { widget: WidgetConfig }) {
  const items = (widget.data as AlertItem[] | undefined) ?? [];
  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={items.length > 0}
    >
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-md border border-[var(--dash-line)] bg-[var(--dash-panel-2)] px-3 py-2"
          >
            <p className={`text-[12px] font-medium ${TONE_TEXT[item.tone]}`}>{item.title}</p>
            <p className="mt-0.5 text-[11px] text-[var(--dash-muted)]">{item.detail}</p>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}

export function StatusWidget({ widget }: { widget: WidgetConfig }) {
  const items = (widget.data as StatusItem[] | undefined) ?? [];
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={items.length > 0}
    >
      <ul className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-md border border-[var(--dash-line)] bg-[var(--dash-panel-2)] px-3 py-2"
          >
            <p className="text-[11px] text-[var(--dash-muted)]">{item.label}</p>
            <p className={`mt-1 font-mono text-xl tabular-nums ${TONE_TEXT[item.tone]}`}>{item.count}</p>
            <p className="text-[10px] text-[var(--dash-faint)]">
              {total ? Math.round((item.count / total) * 100) : 0}%
            </p>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}

export function RankingWidget({ widget }: { widget: WidgetConfig }) {
  const items = (widget.data as RankingItem[] | undefined) ?? [];
  const max = items.reduce((m, i) => Math.max(m, i.value), 0);
  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={items.length > 0}
    >
      <ol className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
              <span className="min-w-0 truncate text-[var(--dash-text)]">
                <span className="mr-2 font-mono text-[var(--dash-faint)]">{item.rank}</span>
                {item.label}
              </span>
              <span className="shrink-0 font-mono tabular-nums text-[var(--dash-info)]">{item.display}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--dash-panel-2)]">
              <div
                className="h-full rounded-full bg-[var(--dash-info)]"
                style={{ width: `${max ? (item.value / max) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </WidgetFrame>
  );
}

export function MapWidget({
  widget,
  onSite,
}: {
  widget: WidgetConfig;
  onSite?: (name: string) => void;
}) {
  const sites = (widget.data as MapSite[] | undefined) ?? [];
  const max = sites.reduce((m, s) => Math.max(m, s.count), 0);
  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={sites.length > 0}
    >
      <div className="grid h-full grid-cols-2 gap-2">
        {sites.map((site) => {
          const weight = max ? 0.35 + (site.count / max) * 0.65 : 0.4;
          return (
            <button
              key={site.id}
              type="button"
              onClick={() => onSite?.(site.name)}
              title={`${site.name}: ${site.count}`}
              className="flex flex-col justify-between rounded-md border border-[var(--dash-line)] p-3 text-left transition-colors hover:border-[var(--dash-info)]"
              style={{ background: `color-mix(in srgb, var(--dash-info) ${Math.round(weight * 18)}%, transparent)` }}
            >
              <p className="truncate text-[12px] text-[var(--dash-muted)]">{site.name}</p>
              <p className="font-mono text-xl tabular-nums text-[var(--dash-text)]">{site.count}</p>
              <p className="text-[10px] text-[var(--dash-faint)]">{Math.round(site.share * 100)}% del recorte</p>
            </button>
          );
        })}
      </div>
    </WidgetFrame>
  );
}

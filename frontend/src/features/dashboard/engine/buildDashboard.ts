import { format } from "date-fns";
import type { AssetType } from "@/@types/asset.types";
import type { AssetsByMonth, DashboardStats } from "@/api/reportsApi";
import type { MaintenanceRecord } from "@/api/maintenanceApi";
import {
  auditReadiness,
  avgDepreciationRate,
  bookValue,
  formatRate,
  formatUsd,
  locationLabel,
  matchesQuery,
  parseMoney,
} from "../dashboardUtils";
import { CATEGORIES } from "@/utils/assetConstants";
import { DASH_COLORS, SERIES_PALETTE } from "../widgets/chartTheme";
import type {
  DashboardConfig,
  DashboardFilterOption,
  DashboardPresetId,
  DateRangeId,
  HeatCell,
  KpiConfig,
  KpiSpark,
  NamedValue,
  SeriesPoint,
  TableRow,
  TimelineItem,
  Tone,
  WidgetConfig,
} from "../types";

export interface DashSource {
  assets: AssetType[];
  listedCount?: number;
  stats: DashboardStats | undefined;
  months: AssetsByMonth[];
  upcoming: MaintenanceRecord[];
  overdue: MaintenanceRecord[];
  demo: boolean;
}

export interface DashFilters {
  query: string;
  status: string;
  site: string;
  range: DateRangeId;
  preset: DashboardPresetId;
}

const STATUS_TONE: Record<string, Tone> = {
  ACTIVO: "ok",
  Activo: "ok",
  MANTENIMIENTO: "warn",
  Mantenimiento: "warn",
  PRESTADO: "info",
  Prestado: "info",
  INACTIVO: "mute",
  Inactivo: "mute",
  VENDIDO: "cat",
  Vendido: "cat",
  ROBADO: "crit",
  Robado: "crit",
};

const CAT_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

const STATUS_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  MANTENIMIENTO: "Mantenimiento",
  VENDIDO: "Vendido",
  PRESTADO: "Prestado",
  ROBADO: "Robado",
};

function labelCat(raw: string): string {
  return CAT_LABEL[raw] ?? raw;
}

function labelStatus(raw: string): string {
  return STATUS_LABEL[raw] ?? raw;
}

function sliced(filters: DashFilters): boolean {
  return Boolean(filters.query.trim()) || filters.status !== "ALL" || filters.site !== "ALL";
}

function monthLabel(raw: string): string {
  const [y, m] = raw.slice(0, 7).split("-");
  if (!y || !m) return raw;
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${months[Number(m) - 1] ?? m} ${y.slice(2)}`;
}

function shortStamp(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return format(d, "dd/MM HH:mm");
}

function deltaFrom(spark: KpiSpark[]): { text: string; tone: Tone } {
  if (spark.length < 2) return { text: "sin serie", tone: "mute" };
  const last = spark[spark.length - 1].v;
  const prev = spark[spark.length - 2].v;
  if (prev === 0) return { text: last > 0 ? "nuevo" : "0", tone: last > 0 ? "ok" : "mute" };
  const pct = ((last - prev) / prev) * 100;
  const sign = pct > 0 ? "+" : "";
  return {
    text: `${sign}${pct.toFixed(0)}% vs periodo anterior`,
    tone: pct > 0 ? "ok" : pct < 0 ? "warn" : "mute",
  };
}

function countBy<T>(rows: T[], key: (row: T) => string): NamedValue[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row) || "Sin dato";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value], i) => ({ name, value, color: SERIES_PALETTE[i % SERIES_PALETTE.length] }))
    .sort((a, b) => b.value - a.value);
}

function fromStatusStats(stats?: DashboardStats): NamedValue[] {
  return (stats?.by_status ?? []).map((row, i) => ({
    name: labelStatus(row.status),
    value: row.count,
    color: SERIES_PALETTE[i % SERIES_PALETTE.length],
  }));
}

function fromCategoryStats(stats?: DashboardStats, itOnly = false): NamedValue[] {
  return (stats?.by_category ?? [])
    .filter((row) => !itOnly || row.category === "COMPUTO" || row.category === "TELECOMUNICACION")
    .map((row, i) => ({
      name: labelCat(row.category),
      value: row.count,
      color: SERIES_PALETTE[i % SERIES_PALETTE.length],
    }));
}

function fromAgencyStats(stats?: DashboardStats) {
  const rows = stats?.by_agency ?? [];
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  return rows.map((r, i) => ({
    id: r.agency__name,
    name: r.agency__name,
    count: r.count,
    share: r.count / total,
    rank: i + 1,
    label: r.agency__name,
    value: r.count,
    display: String(r.count),
  }));
}

function filterAssets(source: DashSource, filters: DashFilters): AssetType[] {
  return source.assets.filter((a) => {
    if (filters.status !== "ALL" && a.status !== filters.status) return false;
    if (filters.site !== "ALL" && (a.agency_name || "Sin agencia") !== filters.site) return false;
    if (!matchesQuery(a, filters.query)) return false;
    if (filters.preset === "it") {
      return a.category === "COMPUTO" || a.category === "TELECOMUNICACION";
    }
    return true;
  });
}

function filterMonths(months: AssetsByMonth[], range: DateRangeId): AssetsByMonth[] {
  if (range === "all") return months;
  const keep = range === "30" ? 1 : range === "90" ? 3 : 12;
  return months.slice(-keep);
}

function w(
  id: string,
  type: WidgetConfig["type"],
  title: string,
  size: WidgetConfig["size"],
  position: number,
  data: unknown,
  extra?: Partial<WidgetConfig>,
): WidgetConfig {
  return { id, type, title, size, position, data, ...extra };
}

function kpi(
  id: string,
  title: string,
  value: string,
  spark: KpiSpark[],
  hint?: string,
  tone?: Tone,
  delta?: string,
): KpiConfig {
  const d = deltaFrom(spark);
  return { id, title, value, spark, hint, delta: delta ?? d.text, deltaTone: tone ?? d.tone };
}

function buildTimeline(source: DashSource, assets: AssetType[], restrictToSample: boolean): TimelineItem[] {
  const ids = new Set(assets.map((a) => a.asset_code));
  const list: TimelineItem[] = [];
  for (const act of source.stats?.recent_activity ?? []) {
    if (restrictToSample && ids.size && !ids.has(act.object_code)) continue;
    list.push({
      id: `act-${act.object_code}-${act.action_date}`,
      at: shortStamp(act.action_date),
      title: act.object_name || act.object_code,
      detail: `Alta · ${act.user_email}`,
      tone: "ok",
    });
  }
  for (const rec of source.overdue) {
    if (restrictToSample && ids.size && !ids.has(rec.asset_code)) continue;
    list.push({
      id: `ov-${rec.id}`,
      at: shortStamp(rec.scheduled_date),
      title: `${rec.asset_code} ${rec.asset_name}`,
      detail: `OT vencida · ${rec.maintenance_type_display}`,
      tone: "crit",
    });
  }
  for (const rec of source.upcoming) {
    if (restrictToSample && ids.size && !ids.has(rec.asset_code)) continue;
    list.push({
      id: `up-${rec.id}`,
      at: shortStamp(rec.scheduled_date),
      title: `${rec.asset_code} ${rec.asset_name}`,
      detail: `OT programada · ${rec.maintenance_type_display}`,
      tone: "warn",
    });
  }
  return list.slice(0, 10);
}

function inventoryRows(assets: AssetType[]): TableRow[] {
  return assets.map((a) => ({
    id: a.id,
    cells: {
      code: a.asset_code,
      name: a.name,
      status: a.status_display,
      custodian: a.custodian_name ?? "Sin custodio",
      site: locationLabel(a),
      value: formatUsd(bookValue(a)),
    },
    tone: STATUS_TONE[a.status] ?? "mute",
  }));
}

function heatmap(assets: AssetType[]): HeatCell[] {
  const cats = [...new Set(assets.map((a) => a.category_display || a.category))];
  const statuses = [...new Set(assets.map((a) => a.status_display || a.status))];
  const cells: HeatCell[] = [];
  for (const y of cats) {
    for (const x of statuses) {
      const value = assets.filter((a) => (a.category_display || a.category) === y && (a.status_display || a.status) === x).length;
      cells.push({ x, y, value });
    }
  }
  return cells;
}

function stackedByCategory(assets: AssetType[]): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (const a of assets) {
    const name = a.category_display || a.category;
    const row = map.get(name) ?? { name, Activo: 0, Mantenimiento: 0, Otro: 0 };
    if (a.status === "ACTIVO") row.Activo = Number(row.Activo) + 1;
    else if (a.status === "MANTENIMIENTO") row.Mantenimiento = Number(row.Mantenimiento) + 1;
    else row.Otro = Number(row.Otro) + 1;
    map.set(name, row);
  }
  return [...map.values()];
}

function valueByCategory(assets: AssetType[]): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (const a of assets) {
    const name = a.category_display || a.category;
    const row = map.get(name) ?? { name, libros: 0, acumulado: 0 };
    row.libros = Number(row.libros) + bookValue(a);
    row.acumulado = Number(row.acumulado) + parseMoney(a.accumulated_depreciation);
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => Number(b.libros) - Number(a.libros));
}

function sites(assets: AssetType[]) {
  const total = assets.length || 1;
  const grouped = countBy(assets, (a) => a.agency_name || "Sin agencia");
  return grouped.map((g, i) => ({
    id: g.name,
    name: g.name,
    count: g.value,
    share: g.value / total,
    rank: i + 1,
    label: g.name,
    value: g.value,
    display: String(g.value),
  }));
}

function buildOps(assets: AssetType[], source: DashSource, spark: KpiSpark[], filters: DashFilters): DashboardConfig {
  const useSlice = sliced(filters);
  const assetCount = useSlice
    ? assets.length
    : (source.stats?.total_assets ?? source.listedCount ?? assets.length);
  const totalBook = assets.reduce((s, a) => s + bookValue(a), 0);
  const maint = (source.upcoming.length + source.overdue.length) || (source.stats?.needs_maintenance ?? 0);
  const audit = auditReadiness(assets);
  const statusNamed = useSlice || !source.stats?.by_status?.length
    ? countBy(assets, (a) => a.status_display || a.status)
    : fromStatusStats(source.stats);
  const catNamed = useSlice || !source.stats?.by_category?.length
    ? countBy(assets, (a) => a.category_display || a.category)
    : fromCategoryStats(source.stats);
  const siteRows = useSlice || !source.stats?.by_agency?.length ? sites(assets) : fromAgencyStats(source.stats);
  const timeline = buildTimeline(source, assets, useSlice);
  const statusItems = statusNamed.map((s) => ({
    id: s.name,
    label: s.name,
    count: s.value,
    tone: STATUS_TONE[s.name] ?? "mute",
  }));
  const alerts = [
    ...source.overdue.map((r) => ({
      id: `ov-${r.id}`,
      title: `OT vencida ${r.work_order || r.asset_code}`,
      detail: `${r.asset_name} · ${r.maintenance_type_display}`,
      tone: "crit" as Tone,
    })),
    ...assets.filter((a) => a.status === "ROBADO").map((a) => ({
      id: `miss-${a.id}`,
      title: `Faltante ${a.asset_code}`,
      detail: a.name,
      tone: "crit" as Tone,
    })),
    ...assets.filter((a) => !a.custodian).slice(0, 3).map((a) => ({
      id: `cus-${a.id}`,
      title: `Sin custodio ${a.asset_code}`,
      detail: a.name,
      tone: "warn" as Tone,
    })),
  ].slice(0, 6);

  const otList = [...source.overdue, ...source.upcoming].slice(0, 8).map((r) => ({
    id: String(r.id),
    title: `${r.asset_code} ${r.asset_name}`,
    meta: `${r.maintenance_type_display} · ${r.work_order || "sin OT"}`,
    value: r.scheduled_date ? format(new Date(r.scheduled_date), "dd/MM") : "",
    tone: source.overdue.some((o) => o.id === r.id) ? ("crit" as Tone) : ("warn" as Tone),
  }));

  const maxCat = catNamed[0]?.value ?? 1;

  return {
    id: "ops",
    title: "Operación de inventario",
    subtitle: "Activos, sitios, mantenimiento y trazabilidad",
    usingDemo: source.demo,
    kpis: [
      kpi("k-assets", "Activos", String(assetCount), spark, `${source.stats?.total_components ?? 0} componentes`),
      kpi("k-book", "Valor en libros", formatUsd(totalBook), spark.map((p) => ({ name: p.name, v: p.v * (totalBook / Math.max(1, assets.length)) })), "Suma del recorte actual", "info"),
      kpi("k-ot", "OT abiertas", String(maint), spark, `${source.overdue.length} vencidas`, maint > 0 ? "warn" : "ok", `${source.overdue.length} vencidas`),
      kpi("k-audit", "Listo para auditoría", formatRate(audit.score), spark, `${audit.gaps} brechas`, audit.score >= 90 ? "ok" : audit.score >= 70 ? "warn" : "crit", `${audit.gaps} brechas`),
    ],
    widgets: [
      w("altas", "area", "Altas de activos", "large", 10, spark.map((p) => ({ name: p.name, altas: p.v })), { hint: "Serie mensual del recorte" }),
      w("estado", "donut", "Estado operativo", "small", 20, statusNamed),
      w("stack", "stacked-bar", "Categoría por estado", "medium", 30, stackedByCategory(assets), { hint: "Activo, mantenimiento y resto" }),
      w("heat", "heatmap", "Categoría × estado", "medium", 40, heatmap(assets)),
      w("inv", "table", "Inventario", "large", 50, inventoryRows(assets), {
        hint: "Clic para abrir la ficha",
        options: {
          columns: [
            { key: "code", label: "ID" },
            { key: "name", label: "Activo" },
            { key: "status", label: "Estado" },
            { key: "custodian", label: "Custodia" },
            { key: "site", label: "Ubicación" },
            { key: "value", label: "Libros", align: "right" },
          ],
        },
      }),
      w("rank", "ranking", "Sitios", "small", 60, siteRows),
      w("gauge", "gauge", "Preparación de auditoría", "small", 70, { value: audit.score, max: 100, label: `${audit.gaps} campos incompletos` }),
      w("status", "status", "Estados", "small", 80, statusItems),
      w("alerts", "alerts", "Alertas", "small", 90, alerts, { empty: "Sin alertas en este recorte." }),
      w("time", "timeline", "Línea de tiempo", "medium", 100, timeline, { empty: "Sin eventos recientes." }),
      w("ot", "list", "Órdenes de trabajo", "medium", 110, otList, { empty: "Sin OT abiertas." }),
      w("map", "map", "Mapa de sitios", "medium", 120, siteRows, { hint: "Clic para filtrar por sitio" }),
      w("prog", "progress", "Concentración por categoría", "medium", 130, catNamed.map((c) => ({ id: c.name, label: c.name, value: c.value, max: maxCat, tone: "info" as Tone }))),
      w("act", "activity", "Actividad reciente", "full", 140, timeline, { empty: "Sin actividad registrada." }),
    ],
  };
}

function buildFinance(assets: AssetType[], source: DashSource, spark: KpiSpark[], filters: DashFilters): DashboardConfig {
  const useSlice = sliced(filters);
  const totalBook = assets.reduce((s, a) => s + bookValue(a), 0);
  const depreciated = useSlice
    ? assets.filter((a) => a.is_fully_depreciated).length
    : (source.stats?.fully_deprecated ?? source.stats?.financial?.fully_depreciated_count ?? assets.filter((a) => a.is_fully_depreciated).length);
  const rate = avgDepreciationRate(assets);
  const sold = assets.filter((a) => a.status === "VENDIDO").length || source.stats?.financial?.sales_count || 0;
  const mix = useSlice || !source.stats?.by_category?.length
    ? countBy(assets, (a) => a.category_display || a.category)
    : fromCategoryStats(source.stats);
  const funnel: NamedValue[] = (useSlice || !source.stats?.by_status?.length)
    ? [
        { name: "Activo", value: assets.filter((a) => a.status === "ACTIVO").length, color: DASH_COLORS.ok },
        { name: "Prestado", value: assets.filter((a) => a.status === "PRESTADO").length, color: DASH_COLORS.info },
        { name: "Mantenimiento", value: assets.filter((a) => a.status === "MANTENIMIENTO").length, color: DASH_COLORS.warn },
        { name: "Inactivo", value: assets.filter((a) => a.status === "INACTIVO").length, color: DASH_COLORS.mute },
        { name: "Vendido", value: assets.filter((a) => a.status === "VENDIDO").length, color: DASH_COLORS.cat },
      ].filter((x) => x.value > 0)
    : fromStatusStats(source.stats).map((s) => ({
        ...s,
        color: DASH_COLORS[STATUS_TONE[s.name] ?? "mute"],
      }));
  const radar = mix;
  const topValue = [...assets]
    .map((a) => ({
      id: String(a.id),
      rank: 0,
      label: a.asset_code,
      value: bookValue(a),
      display: formatUsd(bookValue(a)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return {
    id: "finance",
    title: "Panel financiero",
    subtitle: "Valor en libros, depreciación y ciclo de vida",
    usingDemo: source.demo,
    kpis: [
      kpi("k-book", "Valor en libros", formatUsd(totalBook), spark, `${useSlice ? assets.length : (source.stats?.total_assets ?? assets.length)} activos`, "info"),
      kpi("k-dep", "Totalmente depreciados", String(depreciated), spark, source.stats?.financial?.fully_depreciated_count != null ? "Según reportes" : "En el recorte", depreciated ? "warn" : "ok"),
      kpi("k-rate", "Tasa media", formatRate(rate), spark, "Promedio de tasas cargadas", "cat"),
      kpi("k-sold", "Bajas por venta", String(sold), spark, "Estado VENDIDO", "mute"),
    ],
    widgets: [
      w("val", "bar", "Valor por categoría", "large", 10, valueByCategory(assets), { hint: "Libros frente a depreciación acumulada" }),
      w("pie", "pie", "Mix de categorías", "small", 20, radar),
      w("stack", "stacked-bar", "Libros vs acumulado", "medium", 30, valueByCategory(assets)),
      w("radar", "radar", "Cobertura por categoría", "medium", 40, radar),
      w("funnel", "funnel", "Ciclo de estados", "medium", 50, funnel),
      w("rank", "ranking", "Mayor valor en libros", "medium", 60, topValue),
      w("table", "table", "Detalle financiero", "large", 70, inventoryRows(assets), {
        options: {
          columns: [
            { key: "code", label: "ID" },
            { key: "name", label: "Activo" },
            { key: "status", label: "Estado" },
            { key: "site", label: "Sitio" },
            { key: "value", label: "Libros", align: "right" },
          ],
        },
      }),
      w("gauge", "gauge", "Activos con valor", "small", 80, {
        value: assets.filter((a) => bookValue(a) > 0).length,
        max: Math.max(1, assets.length),
        label: `${assets.filter((a) => bookValue(a) > 0).length} de ${assets.length}`,
      }),
    ],
  };
}

function buildIt(assets: AssetType[], source: DashSource, spark: KpiSpark[], filters: DashFilters): DashboardConfig {
  const useSlice = sliced(filters);
  const critical = useSlice
    ? assets.filter((a) => a.is_critical_it).length
    : (source.stats?.critical_it ?? assets.filter((a) => a.is_critical_it).length);
  const components = useSlice
    ? assets.reduce((s, a) => s + (a.components_count || 0), 0)
    : (source.stats?.total_components ?? assets.reduce((s, a) => s + (a.components_count || 0), 0));
  const highRisk = assets.filter((a) => (a.it_risk_level || "").toUpperCase() === "ALTO").length;
  const timeline = buildTimeline(source, assets, useSlice);
  const itCats = useSlice || !source.stats?.by_category?.length
    ? countBy(assets, (a) => a.category_display || a.category)
    : fromCategoryStats(source.stats, true);
  const alerts = [
    ...assets.filter((a) => a.is_critical_it).slice(0, 4).map((a) => ({
      id: `crit-${a.id}`,
      title: `Crítico ${a.asset_code}`,
      detail: `${a.name} · ${a.it_hostname || "sin hostname"}`,
      tone: "hot" as Tone,
    })),
    ...assets.filter((a) => a.status === "MANTENIMIENTO").map((a) => ({
      id: `m-${a.id}`,
      title: `En taller ${a.asset_code}`,
      detail: a.name,
      tone: "warn" as Tone,
    })),
  ].slice(0, 6);

  return {
    id: "it",
    title: "Panel de TI",
    subtitle: "Cómputo, telecomunicaciones y riesgo",
    usingDemo: source.demo,
    kpis: [
      kpi("k-it", "Activos TI", String(useSlice ? assets.length : itCats.reduce((s, c) => s + c.value, 0) || assets.length), spark, "Cómputo y telecomunicación"),
      kpi("k-crit", "Críticos", String(critical), spark, "Marca is_critical_it", critical ? "hot" : "ok"),
      kpi("k-comp", "Componentes", String(components || source.stats?.total_components || 0), spark, "Vinculados al recorte", "info"),
      kpi("k-risk", "Riesgo alto", String(highRisk), spark, "Perfil TI", highRisk ? "crit" : "ok"),
    ],
    widgets: [
      w("line", "line", "Altas de TI", "large", 10, spark.map((p) => ({ name: p.name, altas: p.v }))),
      w("donut", "donut", "Categoría TI", "small", 20, itCats),
      w("bar", "bar", "Por sitio", "medium", 30, countBy(assets, (a) => a.agency_name || "Sin agencia").map((s) => ({ name: s.name, equipos: s.value }))),
      w("radar", "radar", "Riesgo / volumen", "medium", 40, [
        { name: "Críticos", value: critical },
        { name: "Riesgo alto", value: highRisk },
        { name: "En taller", value: assets.filter((a) => a.status === "MANTENIMIENTO").length },
        { name: "Componentes", value: Math.min(components, 20) },
        { name: "Inventario", value: assets.length },
      ]),
      w("table", "table", "Inventario TI", "large", 50, assets.map((a) => ({
        id: a.id,
        cells: {
          code: a.asset_code,
          name: a.name,
          host: a.it_hostname ?? "—",
          ip: a.it_ip_address ?? "—",
          risk: a.it_risk_level ?? "—",
          status: a.status_display,
        },
      })), {
        options: {
          columns: [
            { key: "code", label: "ID" },
            { key: "name", label: "Activo" },
            { key: "host", label: "Host" },
            { key: "ip", label: "IP" },
            { key: "risk", label: "Riesgo" },
            { key: "status", label: "Estado" },
          ],
        },
      }),
      w("alerts", "alerts", "Señales TI", "small", 60, alerts, { empty: "Sin señales en este recorte." }),
      w("list", "list", "Hosts", "medium", 70, assets.filter((a) => a.it_hostname).slice(0, 10).map((a) => ({
        id: String(a.id),
        title: a.it_hostname as string,
        meta: `${a.asset_code} · ${a.it_ip_address || "sin IP"}`,
        value: a.it_risk_level ?? "",
        tone: (a.it_risk_level || "").toUpperCase() === "ALTO" ? "crit" : "info",
      }))),
      w("act", "activity", "Actividad TI", "medium", 80, timeline),
    ],
  };
}

export function buildDashboard(source: DashSource, filters: DashFilters): DashboardConfig {
  const assets = filterAssets(source, filters);
  const months = filterMonths(source.months, filters.range);
  const spark: KpiSpark[] = months.map((m) => ({ name: monthLabel(m.month), v: m.count }));
  if (filters.preset === "finance") return buildFinance(assets, source, spark, filters);
  if (filters.preset === "it") return buildIt(assets, source, spark, filters);
  return buildOps(assets, source, spark, filters);
}

export function siteOptionsFrom(assets: AssetType[], stats?: DashboardStats): DashboardFilterOption[] {
  const names = new Set<string>();
  for (const a of assets) names.add(a.agency_name || "Sin agencia");
  for (const row of stats?.by_agency ?? []) {
    if (row.agency__name) names.add(row.agency__name);
  }
  return [{ id: "ALL", label: "Todos los sitios" }, ...[...names].sort().map((n) => ({ id: n, label: n }))];
}

export const STATUS_OPTIONS: DashboardFilterOption[] = [
  { id: "ALL", label: "Todos los estados" },
  { id: "ACTIVO", label: "Activo" },
  { id: "MANTENIMIENTO", label: "Mantenimiento" },
  { id: "PRESTADO", label: "Prestado" },
  { id: "INACTIVO", label: "Inactivo" },
  { id: "VENDIDO", label: "Vendido" },
  { id: "ROBADO", label: "Faltante" },
];

export type WidgetSize = "small" | "medium" | "large" | "full";

export type WidgetType =
  | "kpi"
  | "line"
  | "bar"
  | "stacked-bar"
  | "area"
  | "donut"
  | "pie"
  | "radar"
  | "heatmap"
  | "funnel"
  | "timeline"
  | "table"
  | "list"
  | "progress"
  | "gauge"
  | "activity"
  | "alerts"
  | "status"
  | "map"
  | "ranking";

export type Tone = "info" | "ok" | "warn" | "crit" | "cat" | "hot" | "mute";

export interface NamedValue {
  name: string;
  value: number;
  color?: string;
}

export interface SeriesPoint {
  name: string;
  [key: string]: string | number;
}

export interface HeatCell {
  x: string;
  y: string;
  value: number;
}

export interface TimelineItem {
  id: string;
  at: string;
  title: string;
  detail: string;
  tone: Tone;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

export interface TableRow {
  id: string | number;
  cells: Record<string, string | number>;
  tone?: Tone;
}

export interface ListItem {
  id: string;
  title: string;
  meta?: string;
  value?: string;
  tone?: Tone;
}

export interface ProgressItem {
  id: string;
  label: string;
  value: number;
  max: number;
  tone?: Tone;
}

export interface AlertItem {
  id: string;
  title: string;
  detail: string;
  tone: Tone;
}

export interface StatusItem {
  id: string;
  label: string;
  count: number;
  tone: Tone;
}

export interface RankingItem {
  id: string;
  rank: number;
  label: string;
  value: number;
  display: string;
}

export interface MapSite {
  id: string;
  name: string;
  count: number;
  share: number;
}

export interface KpiSpark {
  name: string;
  v: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position?: number;
  hint?: string;
  loading?: boolean;
  error?: string;
  empty?: string;
  data?: unknown;
  options?: Record<string, unknown>;
}

export interface KpiConfig {
  id: string;
  title: string;
  value: string;
  delta?: string;
  deltaTone?: Tone;
  spark?: KpiSpark[];
  hint?: string;
}

export interface DashboardFilterOption {
  id: string;
  label: string;
}

export type DashboardPresetId = "ops" | "finance" | "it";

export interface DashboardConfig {
  id: string;
  title: string;
  subtitle?: string;
  kpis: KpiConfig[];
  widgets: WidgetConfig[];
  usingDemo: boolean;
}

export type DateRangeId = "30" | "90" | "365" | "all";

export const DATE_RANGE_OPTIONS: { id: DateRangeId; label: string }[] = [
  { id: "30", label: "30 días" },
  { id: "90", label: "90 días" },
  { id: "365", label: "12 meses" },
  { id: "all", label: "Todo" },
];

export const PRESET_OPTIONS: { id: DashboardPresetId; label: string }[] = [
  { id: "ops", label: "Operación" },
  { id: "finance", label: "Financiero" },
  { id: "it", label: "TI" },
];

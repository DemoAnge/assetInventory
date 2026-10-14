import type { AssetStatus, AssetType } from "@/@types/asset.types";

export function parseMoney(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRate(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function locationLabel(asset: AssetType): string {
  const parts = [asset.agency_name, asset.department_name, asset.area_name].filter(Boolean);
  return parts.join(" / ") || "Sin ubicación";
}

export type ConditionTone = "ok" | "warn" | "crit" | "mute";

export function conditionOf(asset: AssetType): { label: string; tone: ConditionTone } {
  if (asset.status === "ROBADO") return { label: "Faltante", tone: "crit" };
  if (asset.status === "MANTENIMIENTO" || asset.requires_maintenance) {
    return { label: "Mantenimiento", tone: "warn" };
  }
  if (asset.status === "INACTIVO" || asset.status === "VENDIDO") {
    return { label: asset.status_display, tone: "mute" };
  }
  if (asset.is_fully_depreciated) return { label: "Depreciado", tone: "warn" };
  return { label: "Operativo", tone: "ok" };
}

export const TONE_CLASS: Record<ConditionTone, string> = {
  ok:   "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800",
  warn: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800",
  crit: "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800",
  mute: "text-ink-muted bg-surface-muted border-line",
};

export const TONE_DOT: Record<ConditionTone, string> = {
  ok:   "bg-emerald-500",
  warn: "bg-amber-500",
  crit: "bg-red-500",
  mute: "bg-fx-500",
};

export function bookValue(asset: AssetType): number {
  const current = parseMoney(asset.current_value);
  if (current > 0) return current;
  const purchase = parseMoney(asset.purchase_value);
  const acc = parseMoney(asset.accumulated_depreciation);
  return Math.max(0, purchase - acc);
}

export function avgDepreciationRate(assets: AssetType[]): number {
  const rates = assets
    .map((a) => parseMoney(a.depreciation_rate))
    .filter((n) => n > 0);
  if (rates.length === 0) return 0;
  return rates.reduce((s, n) => s + n, 0) / rates.length;
}

export function auditReadiness(assets: AssetType[]): { score: number; gaps: number } {
  if (assets.length === 0) return { score: 0, gaps: 0 };
  let gaps = 0;
  for (const a of assets) {
    if (!a.agency) gaps += 1;
    if (!a.custodian) gaps += 1;
    if (a.status === "ROBADO") gaps += 1;
    if (!a.account_code) gaps += 1;
  }
  const max = assets.length * 4;
  const score = Math.max(0, Math.round((1 - gaps / max) * 1000) / 10);
  return { score, gaps };
}

export function matchesQuery(asset: AssetType, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const hay = [
    asset.asset_code,
    asset.name,
    asset.serial_number,
    asset.custodian_name,
    asset.agency_name,
    asset.department_name,
    asset.area_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function statusTone(status: AssetStatus): ConditionTone {
  if (status === "ACTIVO") return "ok";
  if (status === "MANTENIMIENTO" || status === "PRESTADO") return "warn";
  if (status === "ROBADO") return "crit";
  return "mute";
}

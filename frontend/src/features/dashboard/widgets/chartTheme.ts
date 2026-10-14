export const DASH_COLORS = {
  info: "var(--dash-info)",
  ok: "var(--dash-ok)",
  cat: "var(--dash-cat)",
  hot: "var(--dash-hot)",
  warn: "var(--dash-warn)",
  crit: "var(--dash-crit)",
  mute: "var(--dash-faint)",
  grid: "var(--dash-grid)",
  tick: "var(--dash-tick)",
  tooltipBg: "var(--dash-tooltip-bg)",
  tooltipBorder: "var(--dash-tooltip-border)",
};

export const SERIES_PALETTE = [
  DASH_COLORS.info,
  DASH_COLORS.ok,
  DASH_COLORS.cat,
  DASH_COLORS.hot,
  DASH_COLORS.warn,
  DASH_COLORS.crit,
];

export const tooltipStyle = {
  background: DASH_COLORS.tooltipBg,
  border: `1px solid ${DASH_COLORS.tooltipBorder}`,
  borderRadius: 8,
  fontSize: 12,
  color: "var(--dash-text)",
};

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { KpiConfig, Tone } from "../types";
import { DASH_COLORS } from "./chartTheme";

const TONE: Record<Tone, string> = {
  info: "text-[var(--dash-info)]",
  ok: "text-[var(--dash-ok)]",
  warn: "text-[var(--dash-warn)]",
  crit: "text-[var(--dash-crit)]",
  cat: "text-[var(--dash-cat)]",
  hot: "text-[var(--dash-hot)]",
  mute: "text-[var(--dash-muted)]",
};

export function KpiWidget({ kpi, loading }: { kpi: KpiConfig; loading?: boolean }) {
  const tone = kpi.deltaTone ?? "mute";
  const Trend =
    tone === "ok" ? TrendingUp : tone === "crit" || tone === "warn" ? TrendingDown : Minus;

  return (
    <article className="dash-panel flex min-h-[118px] flex-col justify-between p-3">
      <p className="text-[11px] uppercase tracking-wide text-[var(--dash-muted)]">{kpi.title}</p>
      {loading ? (
        <div className="dash-skeleton mt-3 h-8 w-24" />
      ) : (
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums leading-none text-[var(--dash-text)]">
              {kpi.value}
            </p>
            {kpi.delta && (
              <p className={`mt-1.5 inline-flex items-center gap-1 text-[11px] ${TONE[tone]}`}>
                <Trend size={12} />
                {kpi.delta}
              </p>
            )}
          </div>
          {kpi.spark && kpi.spark.length > 1 && (
            <div className="h-10 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpi.spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={DASH_COLORS.info}
                    fill={DASH_COLORS.info}
                    fillOpacity={0.18}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
      {kpi.hint && !loading && (
        <p className="mt-2 text-[11px] text-[var(--dash-faint)]">{kpi.hint}</p>
      )}
    </article>
  );
}

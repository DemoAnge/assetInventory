import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { AssetType } from "@/@types/asset.types";
import { useThemeStore } from "@/store/themeStore";
import { bookValue, formatUsd, parseMoney } from "./dashboardUtils";

interface Row {
  name: string;
  libros: number;
  acumulado: number;
}

function buildRows(assets: AssetType[]): Row[] {
  const map = new Map<string, Row>();
  for (const a of assets) {
    const key = a.category_display || a.category;
    const cur = map.get(key) ?? { name: key, libros: 0, acumulado: 0 };
    cur.libros += bookValue(a);
    cur.acumulado += parseMoney(a.accumulated_depreciation);
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.libros + b.acumulado - (a.libros + a.acumulado));
}

export function DepreciationVisualizer({ assets, loading }: { assets: AssetType[]; loading: boolean }) {
  const data = buildRows(assets);
  const dark = useThemeStore((s) => s.theme) === "dark";
  const tick = dark ? "#9aadb8" : "#406274";
  const grid = dark ? "#2a3b48" : "#c4e0f0";
  const cursor = dark ? "#1a2733" : "#e0f7ff";
  const tooltipBg = dark ? "#121c24" : "#ffffff";
  const tooltipBorder = dark ? "#2a3b48" : "#c4e0f0";
  const tooltipColor = dark ? "#e6ecf0" : "#0f2838";

  return (
    <section aria-label="Ciclo de vida y depreciación" className="min-h-[280px] rounded-panel border border-line bg-surface p-4">
      <h2 className="text-sm font-medium text-ink">Ciclo de vida</h2>
      <p className="mt-0.5 text-[12px] text-ink-subtle">Valor en libros frente a depreciación acumulada por categoría</p>
      {loading ? (
        <div className="mt-4 h-48 animate-pulse rounded-control bg-surface-muted" />
      ) : data.length === 0 ? (
        <p className="mt-8 text-sm text-ink-subtle">Sin valores para graficar. Los montos aparecen cuando el registro tiene costo de adquisición.</p>
      ) : (
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: tick, fontSize: 11 }} axisLine={{ stroke: grid }} tickLine={false} />
              <YAxis
                tick={{ fill: tick, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatUsd(v)}
                width={72}
              />
              <Tooltip
                cursor={{ fill: cursor }}
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12, color: tooltipColor }}
                formatter={(value) => formatUsd(Number(value) || 0)}
              />
              <Bar dataKey="libros" name="En libros" fill="#0EA5E9" radius={[2, 2, 0, 0]} maxBarSize={28} />
              <Bar dataKey="acumulado" name="Acumulado" fill="#22D3EE" radius={[2, 2, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

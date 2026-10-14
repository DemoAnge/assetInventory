import type { ReactNode } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart,
  Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar,
  RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { NamedValue, SeriesPoint, WidgetConfig } from "../types";
import { WidgetFrame } from "./WidgetFrame";
import { DASH_COLORS, SERIES_PALETTE, tooltipStyle } from "./chartTheme";

function seriesKeys(rows: SeriesPoint[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => {
      if (k !== "name") keys.add(k);
    });
  }
  return [...keys];
}

export function ChartWidget({ widget }: { widget: WidgetConfig }) {
  const rows = (widget.data as SeriesPoint[] | NamedValue[] | undefined) ?? [];
  const hasData = rows.length > 0;
  const keys = hasData && "name" in rows[0] && !("value" in rows[0] && Object.keys(rows[0]).length === 2)
    ? seriesKeys(rows as SeriesPoint[])
    : ["value"];

  const cartesian = (
    Chart: typeof LineChart | typeof BarChart | typeof AreaChart,
    body: ReactNode,
  ) => (
    <ResponsiveContainer width="100%" height="100%">
      <Chart data={rows as SeriesPoint[]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={DASH_COLORS.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: DASH_COLORS.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: DASH_COLORS.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} />
        {body}
      </Chart>
    </ResponsiveContainer>
  );

  let chart: ReactNode = null;
  if (widget.type === "line") {
    chart = cartesian(LineChart, keys.map((k, i) => (
      <Line key={k} type="monotone" dataKey={k} stroke={SERIES_PALETTE[i % SERIES_PALETTE.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
    )));
  } else if (widget.type === "bar") {
    chart = cartesian(BarChart, keys.map((k, i) => (
      <Bar key={k} dataKey={k} fill={SERIES_PALETTE[i % SERIES_PALETTE.length]} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
    )));
  } else if (widget.type === "stacked-bar") {
    chart = cartesian(BarChart, [
      <Legend key="l" wrapperStyle={{ fontSize: 11, color: DASH_COLORS.tick }} />,
      ...keys.map((k, i) => (
        <Bar key={k} dataKey={k} stackId="a" fill={SERIES_PALETTE[i % SERIES_PALETTE.length]} maxBarSize={28} isAnimationActive={false} />
      )),
    ]);
  } else if (widget.type === "area") {
    chart = cartesian(AreaChart, keys.map((k, i) => (
      <Area key={k} type="monotone" dataKey={k} stroke={SERIES_PALETTE[i % SERIES_PALETTE.length]} fill={SERIES_PALETTE[i % SERIES_PALETTE.length]} fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} />
    )));
  } else if (widget.type === "donut" || widget.type === "pie") {
    const data = rows as NamedValue[];
    chart = (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={widget.type === "donut" ? "58%" : 0}
            outerRadius="82%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.color || SERIES_PALETTE[i % SERIES_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: DASH_COLORS.tick }} />
        </PieChart>
      </ResponsiveContainer>
    );
  } else if (widget.type === "radar") {
    const data = rows as NamedValue[];
    chart = (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke={DASH_COLORS.grid} />
          <PolarAngleAxis dataKey="name" tick={{ fill: DASH_COLORS.tick, fontSize: 11 }} />
          <Radar dataKey="value" stroke={DASH_COLORS.info} fill={DASH_COLORS.info} fillOpacity={0.25} isAnimationActive={false} />
          <Tooltip contentStyle={tooltipStyle} />
        </RadarChart>
      </ResponsiveContainer>
    );
  } else if (widget.type === "funnel") {
    const data = rows as NamedValue[];
    chart = (
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Funnel dataKey="value" nameKey="name" data={data} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.color || SERIES_PALETTE[i % SERIES_PALETTE.length]} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    );
  }

  return (
    <WidgetFrame
      title={widget.title}
      hint={widget.hint}
      size={widget.size}
      loading={widget.loading}
      error={widget.error}
      empty={widget.empty}
      hasData={hasData}
    >
      <div className="h-full min-h-[180px]">{chart}</div>
    </WidgetFrame>
  );
}

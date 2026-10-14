import type { KpiConfig, TableRow, WidgetConfig } from "../types";
import { SIZE_CLASS } from "./WidgetFrame";
import { ChartWidget } from "./ChartWidgets";
import { KpiWidget } from "./KpiWidget";
import {
  ActivityWidget,
  AlertsWidget,
  GaugeWidget,
  HeatmapWidget,
  ListWidget,
  MapWidget,
  ProgressWidget,
  RankingWidget,
  StatusWidget,
  TableWidget,
  TimelineWidget,
} from "./DataWidgets";

export interface WidgetActions {
  onTableRow?: (widgetId: string, row: TableRow) => void;
  onSite?: (name: string) => void;
}

const CHART_TYPES = new Set([
  "line",
  "bar",
  "stacked-bar",
  "area",
  "donut",
  "pie",
  "radar",
  "funnel",
]);

export function WidgetRenderer({
  widget,
  actions,
}: {
  widget: WidgetConfig;
  actions?: WidgetActions;
}) {
  if (CHART_TYPES.has(widget.type)) {
    return <ChartWidget widget={widget} />;
  }

  switch (widget.type) {
    case "kpi":
      return (
        <div className={SIZE_CLASS[widget.size]}>
          <KpiWidget kpi={(widget.data as KpiConfig) ?? { id: widget.id, title: widget.title, value: "—" }} loading={widget.loading} />
        </div>
      );
    case "heatmap":
      return <HeatmapWidget widget={widget} />;
    case "table":
      return (
        <TableWidget
          widget={widget}
          onRow={actions?.onTableRow ? (row) => actions.onTableRow?.(widget.id, row) : undefined}
        />
      );
    case "list":
      return <ListWidget widget={widget} />;
    case "timeline":
      return <TimelineWidget widget={widget} />;
    case "progress":
      return <ProgressWidget widget={widget} />;
    case "gauge":
      return <GaugeWidget widget={widget} />;
    case "activity":
      return <ActivityWidget widget={widget} />;
    case "alerts":
      return <AlertsWidget widget={widget} />;
    case "status":
      return <StatusWidget widget={widget} />;
    case "ranking":
      return <RankingWidget widget={widget} />;
    case "map":
      return <MapWidget widget={widget} onSite={actions?.onSite} />;
    default:
      return null;
  }
}

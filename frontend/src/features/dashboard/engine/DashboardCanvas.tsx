import type { DashboardConfig } from "../types";
import { KpiWidget } from "../widgets/KpiWidget";
import { WidgetRenderer, type WidgetActions } from "../widgets/registry";

export function DashboardCanvas({
  config,
  loading,
  actions,
}: {
  config: DashboardConfig;
  loading?: boolean;
  actions?: WidgetActions;
}) {
  const widgets = [...config.widgets].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {config.kpis.map((kpi) => (
          <KpiWidget key={kpi.id} kpi={kpi} loading={loading} />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-3">
        {widgets.map((widget) => (
          <WidgetRenderer
            key={widget.id}
            widget={{ ...widget, loading: widget.loading || loading }}
            actions={actions}
          />
        ))}
      </div>
    </div>
  );
}

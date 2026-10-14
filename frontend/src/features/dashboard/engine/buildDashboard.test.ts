import { describe, expect, it } from "vitest";
import { buildDashboard } from "./buildDashboard";
import { demoSource } from "./demoSource";

const filters = {
  query: "",
  status: "ALL",
  site: "ALL",
  range: "all" as const,
  preset: "ops" as const,
};

describe("buildDashboard", () => {
  it("emits kpis and widgets from a config, never empty on demo ops", () => {
    const cfg = buildDashboard(demoSource(), filters);
    expect(cfg.usingDemo).toBe(true);
    expect(cfg.kpis).toHaveLength(4);
    expect(cfg.widgets.length).toBeGreaterThan(8);
    expect(new Set(cfg.widgets.map((w) => w.type)).size).toBeGreaterThan(6);
  });

  it("switches widget mix per preset", () => {
    const source = demoSource();
    const ops = buildDashboard(source, { ...filters, preset: "ops" });
    const finance = buildDashboard(source, { ...filters, preset: "finance" });
    const it = buildDashboard(source, { ...filters, preset: "it" });
    expect(ops.widgets.some((w) => w.type === "heatmap")).toBe(true);
    expect(finance.widgets.some((w) => w.type === "funnel")).toBe(true);
    expect(it.widgets.some((w) => w.type === "line")).toBe(true);
  });

  it("applies site and status filters to the table", () => {
    const cfg = buildDashboard(demoSource(), {
      ...filters,
      status: "ROBADO",
      site: "Norte",
    });
    const table = cfg.widgets.find((w) => w.type === "table");
    const rows = (table?.data as { cells: { code: string } }[]) ?? [];
    expect(rows.length).toBe(1);
    expect(rows[0].cells.code).toBe("COM-0030");
  });

  it("prefers backend stats totals over an empty asset sample", () => {
    const cfg = buildDashboard(
      {
        assets: [],
        listedCount: 0,
        stats: {
          total_assets: 42,
          total_components: 7,
          critical_it: 3,
          fully_deprecated: 1,
          needs_maintenance: 2,
          alerts_unresolved: 0,
          by_category: [{ category: "COMPUTO", count: 40 }],
          by_status: [{ status: "ACTIVO", count: 40 }],
          by_agency: [{ agency__name: "Matriz", count: 42 }],
          recent_activity: [],
          financial: {},
          generated_at: new Date().toISOString(),
        },
        months: [
          { month: "2026-01", count: 4 },
          { month: "2026-02", count: 6 },
        ],
        upcoming: [],
        overdue: [],
        demo: false,
      },
      filters,
    );
    expect(cfg.usingDemo).toBe(false);
    expect(cfg.kpis[0].value).toBe("42");
    const donut = cfg.widgets.find((w) => w.id === "estado");
    expect((donut?.data as { name: string }[])[0].name).toBe("Activo");
  });
});

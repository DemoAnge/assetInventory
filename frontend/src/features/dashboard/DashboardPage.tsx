import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { reportsApi } from "@/api/reportsApi";
import { maintenanceApi } from "@/api/maintenanceApi";
import { useAssets } from "@/hooks/useAssets";
import { AssetFormModal } from "@/features/assets/AssetFormModal";
import type { AssetStatus, AssetType } from "@/@types/asset.types";
import { KpiStrip } from "./KpiStrip";
import { InventoryTable } from "./InventoryTable";
import { DepreciationVisualizer } from "./DepreciationVisualizer";
import { LocationDistribution } from "./LocationDistribution";
import { EventTimeline, type TimelineEvent } from "./EventTimeline";
import { OnboardingPanel } from "./OnboardingPanel";
import { AssetControlDrawer } from "./AssetControlDrawer";
import {
  auditReadiness,
  avgDepreciationRate,
  bookValue,
  matchesQuery,
} from "./dashboardUtils";

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | AssetStatus>("ALL");
  const [site, setSite] = useState<string | null>(null);
  const [selected, setSelected] = useState<AssetType | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => reportsApi.getDashboard().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: page, isLoading: assetsLoading } = useAssets({ page_size: 50 });
  const assets = page?.results ?? [];

  const { data: upcoming } = useQuery({
    queryKey: ["maintenance-upcoming"],
    queryFn: async () => {
      try {
        return (await maintenanceApi.getUpcoming()).data;
      } catch {
        return [] as const;
      }
    },
  });

  const { data: overdue } = useQuery({
    queryKey: ["maintenance-overdue"],
    queryFn: async () => {
      try {
        return (await maintenanceApi.getOverdue()).data;
      } catch {
        return [] as const;
      }
    },
  });

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (status !== "ALL" && a.status !== status) return false;
      if (site && (a.agency_name || "Sin agencia") !== site) return false;
      return matchesQuery(a, query);
    });
  }, [assets, status, site, query]);

  const kpis = useMemo(() => {
    const totalBook = assets.reduce((s, a) => s + bookValue(a), 0);
    const maintOpen = (upcoming?.length ?? 0) + (overdue?.length ?? 0);
    const fallbackMaint = stats?.needs_maintenance ?? 0;
    const audit = auditReadiness(assets);
    return {
      bookValue: totalBook,
      activeMaintenance: Math.max(maintOpen, fallbackMaint),
      depreciationRate: avgDepreciationRate(assets),
      auditScore: audit.score,
      auditGaps: audit.gaps,
      sampleSize: assets.length,
    };
  }, [assets, upcoming, overdue, stats]);

  const events = useMemo<TimelineEvent[]>(() => {
    const list: TimelineEvent[] = [];
    for (const act of stats?.recent_activity ?? []) {
      list.push({
        id: `act-${act.object_code}-${act.action_date}`,
        at: act.action_date,
        title: act.object_name || act.object_code,
        detail: `Alta · ${act.user_email}`,
        tone: "ok",
      });
    }
    for (const rec of overdue ?? []) {
      list.push({
        id: `ov-${rec.id}`,
        at: rec.scheduled_date,
        title: `${rec.asset_code} ${rec.asset_name}`,
        detail: `OT vencida · ${rec.maintenance_type_display}`,
        tone: "crit",
      });
    }
    for (const rec of upcoming ?? []) {
      list.push({
        id: `up-${rec.id}`,
        at: rec.scheduled_date,
        title: `${rec.asset_code} ${rec.asset_name}`,
        detail: `OT programada · ${rec.maintenance_type_display}`,
        tone: "warn",
      });
    }
    return list.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 12);
  }, [stats, overdue, upcoming]);

  const loading = statsLoading || assetsLoading;
  const stamp = stats?.generated_at ? format(new Date(stats.generated_at), "dd/MM/yyyy HH:mm") : "";

  return (
    <div className="flex min-h-full flex-col text-ink">
      <div className="sticky top-0 z-sticky flex h-10 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur">
        <p className="text-[12px] text-ink-muted">
          Panel de control
          {site ? ` · sitio ${site}` : ""}
        </p>
        {stamp && (
          <p className="font-mono text-[11px] tabular-nums text-fx-500">Actualizado {stamp}</p>
        )}
      </div>

      <KpiStrip {...kpis} loading={loading} />

      <div className="flex min-h-[320px] flex-1 flex-col">
        <InventoryTable
          assets={filtered}
          loading={loading}
          query={query}
          onQuery={setQuery}
          status={status}
          onStatus={setStatus}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 p-3">
        <div className="lg:col-span-3">
          <DepreciationVisualizer assets={assets} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <LocationDistribution
            assets={assets}
            loading={loading}
            active={site}
            onSelect={setSite}
          />
        </div>
        <div className="lg:col-span-3">
          <EventTimeline events={events} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <OnboardingPanel
            onResolved={setSelected}
            onCreate={() => setCreateOpen(true)}
          />
        </div>
      </div>

      <AssetControlDrawer asset={selected} onClose={() => setSelected(null)} />
      {createOpen && <AssetFormModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

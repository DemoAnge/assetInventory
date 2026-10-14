import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { reportsApi } from "@/api/reportsApi";
import { maintenanceApi } from "@/api/maintenanceApi";
import { assetsApi } from "@/api/assetsApi";
import { useAssets } from "@/hooks/useAssets";
import { AssetFormModal } from "@/features/assets/AssetFormModal";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { ROUTES, canWriteModule } from "@/routes/appRoutes";
import type { AssetType } from "@/@types/asset.types";
import { AssetControlDrawer } from "./AssetControlDrawer";
import { DashboardCanvas } from "./engine/DashboardCanvas";
import { DashboardToolbar } from "./engine/DashboardToolbar";
import { buildDashboard, siteOptionsFrom, STATUS_OPTIONS } from "./engine/buildDashboard";
import type { DashboardPresetId, DateRangeId, TableRow } from "./types";

function QrStrip({ onResolved }: { onResolved: (asset: AssetType) => void }) {
  const [uuid, setUuid] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async (e: FormEvent) => {
    e.preventDefault();
    const value = uuid.trim();
    if (!value) return;
    setBusy(true);
    try {
      const res = await assetsApi.getByQr(value);
      onResolved(res.data);
      toast.success(`Localizado ${res.data.asset_code}`);
    } catch {
      toast.error("No hay activo con ese UUID de QR.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={lookup}
      className="mx-3 mb-3 flex flex-col gap-2 rounded-[10px] border border-[var(--dash-line)] bg-[var(--dash-panel)] p-3 sm:flex-row sm:items-center"
    >
      <label htmlFor="dash-qr" className="shrink-0 text-[12px] text-[var(--dash-muted)]">
        Lectura QR
      </label>
      <input
        id="dash-qr"
        value={uuid}
        onChange={(e) => setUuid(e.target.value)}
        placeholder="UUID del código QR"
        className="dash-input min-w-0 flex-1 font-mono"
      />
      <button type="submit" disabled={busy || !uuid.trim()} className="dash-chip dash-chip-on disabled:opacity-40">
        {busy ? "Buscando" : "Resolver"}
      </button>
    </form>
  );
}

export default function DashboardPage() {
  const [preset, setPreset] = useState<DashboardPresetId>("ops");
  const [range, setRange] = useState<DateRangeId>("365");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [site, setSite] = useState("ALL");
  const [selected, setSelected] = useState<AssetType | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const qc = useQueryClient();
  const theme = useThemeStore((s) => s.theme);
  const role = useAuthStore((s) => s.user?.role);
  const canCreate = role ? canWriteModule(role, ROUTES.ASSETS) : false;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const statsQ = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => reportsApi.getDashboard().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const monthsQ = useQuery({
    queryKey: ["dashboard-months"],
    queryFn: () => reportsApi.getAssetsByMonth().then((r) => r.data),
  });

  const assetParams = useMemo(
    () => ({
      page_size: 200,
      search: debouncedQuery || undefined,
      status: status === "ALL" ? undefined : status,
    }),
    [debouncedQuery, status],
  );

  const { data: page, isLoading: assetsLoading, isFetching: assetsFetching } = useAssets(assetParams);

  const upcomingQ = useQuery({
    queryKey: ["maintenance-upcoming"],
    queryFn: async () => {
      try {
        return (await maintenanceApi.getUpcoming()).data;
      } catch {
        return [] as const;
      }
    },
  });

  const overdueQ = useQuery({
    queryKey: ["maintenance-overdue"],
    queryFn: async () => {
      try {
        return (await maintenanceApi.getOverdue()).data;
      } catch {
        return [] as const;
      }
    },
  });

  const source = useMemo(
    () => ({
      assets: page?.results ?? [],
      listedCount: page?.count,
      stats: statsQ.data,
      months: monthsQ.data ?? [],
      upcoming: [...(upcomingQ.data ?? [])],
      overdue: [...(overdueQ.data ?? [])],
      demo: false,
    }),
    [page, statsQ.data, monthsQ.data, upcomingQ.data, overdueQ.data],
  );

  const config = useMemo(
    () => buildDashboard(source, { query, status, site, range, preset }),
    [source, query, status, site, range, preset],
  );

  const loading = statsQ.isLoading || assetsLoading;
  const refreshing = statsQ.isFetching || assetsFetching || monthsQ.isFetching;
  const stamp = statsQ.data?.generated_at
    ? `Actualizado ${new Date(statsQ.data.generated_at).toLocaleString("es-EC")}`
    : "";

  const onTableRow = (_widgetId: string, row: TableRow) => {
    const asset = source.assets.find((a) => a.id === Number(row.id));
    if (asset) setSelected(asset);
  };

  return (
    <div className="dash-cockpit flex min-h-full flex-col bg-app text-ink" data-theme={theme}>
      <DashboardToolbar
        title={config.title}
        subtitle={config.subtitle}
        stamp={stamp}
        preset={preset}
        onPreset={setPreset}
        range={range}
        onRange={setRange}
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        statusOptions={STATUS_OPTIONS}
        site={site}
        onSite={setSite}
        siteOptions={siteOptionsFrom(source.assets, source.stats)}
        refreshing={refreshing}
        onRefresh={() => {
          qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
          qc.invalidateQueries({ queryKey: ["dashboard-months"] });
          qc.invalidateQueries({ queryKey: ["assets"] });
          qc.invalidateQueries({ queryKey: ["maintenance-upcoming"] });
          qc.invalidateQueries({ queryKey: ["maintenance-overdue"] });
        }}
        canCreate={canCreate}
        onCreate={() => setCreateOpen(true)}
      />

      {statsQ.isError && (
        <p className="mx-3 mt-3 text-sm text-[var(--dash-crit)]">
          No se pudo leer /reports/dashboard/. Revise la sesión y reintente.
        </p>
      )}

      <DashboardCanvas
        config={config}
        loading={loading && !source.demo}
        actions={{ onTableRow, onSite: (name) => setSite(name) }}
      />

      <QrStrip onResolved={setSelected} />

      <AssetControlDrawer asset={selected} onClose={() => setSelected(null)} />
      {createOpen && <AssetFormModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

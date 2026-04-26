import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { reportsApi } from "@/api/reportsApi";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CATEGORY_COLORS: Record<string, string> = {
  COMPUTO: "#3b82f6",
  VEHICULO: "#f59e0b",
  MAQUINARIA: "#8b5cf6",
  MUEBLE: "#10b981",
  INMUEBLE: "#ef4444",
  TELECOMUNICACION: "#06b6d4",
  OTRO: "#6b7280",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVO: "#10b981",
  INACTIVO: "#6b7280",
  EN_MANTENIMIENTO: "#f59e0b",
  DADO_DE_BAJA: "#ef4444",
  VENDIDO: "#3b82f6",
};

const PIE_FALLBACK = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#6b7280"];

function KpiCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`card p-5 border-l-4 ${color}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isFinance = user?.role === "ADMIN" || user?.role === "CONTABILIDAD";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => reportsApi.getDashboard().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: byMonth } = useQuery({
    queryKey: ["dashboard-by-month"],
    queryFn: () => reportsApi.getAssetsByMonth().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard BI</h1>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-24 bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const categoryData = stats.by_category.map((d) => ({
    name: d.category,
    Activos: d.count,
  }));

  const statusData = stats.by_status.map((d) => ({
    name: d.status,
    value: d.count,
  }));

  const monthData = (byMonth ?? []).map((d) => ({
    name: format(new Date(d.month + "-01"), "MMM yy", { locale: es }),
    Ingresos: d.count,
  }));

  const fullyDepCount = stats.financial.fully_depreciated_count ?? stats.fully_deprecated;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard BI</h1>
          <p className="text-gray-500 text-sm mt-1">
            Actualizado: {format(new Date(stats.generated_at), "dd/MM/yyyy HH:mm")}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total Activos" value={stats.total_assets} sub={`${stats.total_components} componentes`} color="border-blue-500" />
        <KpiCard label="Alertas sin resolver" value={stats.alerts_unresolved} color={stats.alerts_unresolved > 0 ? "border-red-500" : "border-green-500"} />
        <KpiCard label="En mantenimiento" value={stats.needs_maintenance} color="border-yellow-500" />
        <KpiCard label="TI Críticos" value={stats.critical_it} color="border-purple-500" />
        <KpiCard label="Totalmente depreciados" value={stats.fully_deprecated} color="border-gray-400" />
        {isFinance && (
          <KpiCard
            label="Dep. total (activos)"
            value={fullyDepCount}
            sub={`${stats.financial.sales_count ?? 0} ventas registradas`}
            color="border-emerald-500"
          />
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart: por categoría */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Activos por categoría</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Activos" radius={[4, 4, 0, 0]}>
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[entry.name] ?? PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart: por estado */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Activos por estado</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] ?? PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line chart: ingresos por mes */}
      {monthData.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Ingresos de activos por mes (últimos 12 meses)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="Ingresos" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row: por agencia + actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agencias */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Activos por agencia</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Agencia</th>
                  <th className="pb-2 font-medium text-right">Activos</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_agency.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 text-gray-700">{row.agency__name || "Sin agencia"}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{row.count}</td>
                  </tr>
                ))}
                {stats.by_agency.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-center text-gray-400">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Actividad reciente</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.recent_activity.map((act, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
                <span className="text-xs font-medium bg-green-100 text-green-700 rounded px-2 py-0.5 whitespace-nowrap mt-0.5">
                  Ingreso
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{act.object_name || act.object_code}</p>
                  <p className="text-xs text-gray-400">
                    {act.user_email} · {format(new Date(act.action_date), "dd/MM HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            {stats.recent_activity.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">Sin actividad reciente</p>
            )}
          </div>
        </div>
      </div>

      {/* Resumen NIC 16 (solo ADMIN/CONTABILIDAD) */}
      {isFinance && (
        <div className="card p-5 border border-emerald-100 bg-emerald-50">
          <h2 className="text-sm font-semibold text-emerald-800 mb-3">Resumen contable</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-emerald-600 font-medium">Total activos</p>
              <p className="text-xl font-bold text-emerald-900">{stats.financial.total_assets_with_value ?? stats.total_assets}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium">Totalmente depreciados</p>
              <p className="text-xl font-bold text-red-600">{fullyDepCount}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium">Ventas registradas</p>
              <p className="text-xl font-bold text-emerald-900">{stats.financial.sales_count ?? 0}</p>
            </div>
          </div>
          <p className="text-xs text-emerald-600 mt-3 text-center">
            Los valores monetarios están cifrados AES-256. Consulte el módulo de Contabilidad para reportes financieros detallados.
          </p>
        </div>
      )}
    </div>
  );
}

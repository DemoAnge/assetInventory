import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, AlertTriangle, Clock, Shield, Building2, BarChart3, FileText } from "lucide-react";
import { reportsApi } from "@/api/reportsApi";
import { alertsApi } from "@/api/alertsApi";
import { itApi } from "@/api/itApi";

type Status = "ok" | "warning" | "error" | "info";

interface ComplianceItem {
  label: string;
  value: string | number;
  status: Status;
  detail: string;
}

interface ComplianceSection {
  title: string;
  icon: React.ReactNode;
  norm: string;
  items: ComplianceItem[];
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "ok")      return <CheckCircle size={16} className="text-green-500 shrink-0" />;
  if (status === "error")   return <XCircle size={16} className="text-red-500 shrink-0" />;
  if (status === "warning") return <AlertTriangle size={16} className="text-yellow-500 shrink-0" />;
  return <Clock size={16} className="text-blue-400 shrink-0" />;
}

const STATUS_ROW: Record<Status, string> = {
  ok:      "bg-green-50  border-green-200",
  error:   "bg-red-50    border-red-200",
  warning: "bg-yellow-50 border-yellow-200",
  info:    "bg-blue-50   border-blue-200",
};

function ComplianceCard({ section }: { section: ComplianceSection }) {
  const errors   = section.items.filter((i) => i.status === "error").length;
  const warnings = section.items.filter((i) => i.status === "warning").length;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-200">
        <div className="text-gray-500">{section.icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{section.title}</h3>
          <p className="text-xs text-gray-400">{section.norm}</p>
        </div>
        {errors > 0 && (
          <span className="text-xs font-medium bg-red-100 text-red-700 rounded-full px-2.5 py-0.5">
            {errors} crítico{errors > 1 ? "s" : ""}
          </span>
        )}
        {warnings > 0 && errors === 0 && (
          <span className="text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full px-2.5 py-0.5">
            {warnings} aviso{warnings > 1 ? "s" : ""}
          </span>
        )}
        {errors === 0 && warnings === 0 && (
          <span className="text-xs font-medium bg-green-100 text-green-700 rounded-full px-2.5 py-0.5">
            Cumple
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {section.items.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 px-5 py-3 border-l-4 ${STATUS_ROW[item.status]}`}>
            <StatusIcon status={item.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
            </div>
            <span className="text-sm font-bold text-gray-900 shrink-0">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompliancePage() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => reportsApi.getDashboard().then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["alerts-summary"],
    queryFn: () => alertsApi.getSummary().then((r) => r.data),
  });

  const { data: expiredLicenses } = useQuery({
    queryKey: ["it-licenses", "expired"],
    queryFn: () => itApi.getExpired().then((r) => r.data),
  });

  const { data: pendingScan } = useQuery({
    queryKey: ["it-profiles", "pending-scan"],
    queryFn: () => itApi.getPendingScan().then((r) => r.data),
  });

  const { data: expiringLicenses } = useQuery({
    queryKey: ["it-licenses", "expiring"],
    queryFn: () => itApi.getExpiring().then((r) => r.data),
  });

  const { data: criticalIT } = useQuery({
    queryKey: ["it-profiles", "critical"],
    queryFn: () => itApi.getCritical().then((r) => r.data),
  });

  if (loadingStats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Cumplimiento normativo</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card h-40 animate-pulse bg-gray-100" />)}
        </div>
      </div>
    );
  }

  const totalUnresolved  = summary?.total_unresolved ?? 0;
  const criticalAlerts   = summary?.critica ?? 0;
  const expiredCount     = expiredLicenses?.length ?? 0;
  const pendingScanCount = pendingScan?.length ?? 0;
  const expiringCount    = expiringLicenses?.length ?? 0;
  const criticalITCount  = criticalIT?.length ?? 0;
  const fullyDep         = stats?.fully_deprecated ?? 0;
  const needsMaint       = stats?.needs_maintenance ?? 0;

  const sections: ComplianceSection[] = [
    {
      title: "Alertas y riesgo operativo",
      icon: <Shield size={18} />,
      norm: "Superintendencia de Bancos — Riesgo Operativo",
      items: [
        {
          label: "Alertas críticas sin resolver",
          value: criticalAlerts,
          status: criticalAlerts > 0 ? "error" : "ok",
          detail: criticalAlerts > 0
            ? "Existen alertas de severidad CRÍTICA que requieren atención inmediata"
            : "No hay alertas críticas pendientes",
        },
        {
          label: "Total alertas sin resolver",
          value: totalUnresolved,
          status: totalUnresolved > 10 ? "warning" : totalUnresolved > 0 ? "info" : "ok",
          detail: "Alertas generadas por el engine automático del sistema",
        },
        {
          label: "Activos TI de riesgo crítico/alto",
          value: criticalITCount,
          status: criticalITCount > 0 ? "warning" : "ok",
          detail: "Equipos con nivel de riesgo CRÍTICO o ALTO — requieren reporte a SB",
        },
      ],
    },
    {
      title: "Depreciación y activos fijos",
      icon: <BarChart3 size={18} />,
      norm: "LORTI Art. 28 / NIC 16 / SEPS Catálogo 18xx",
      items: [
        {
          label: "Activos totalmente depreciados",
          value: fullyDep,
          status: fullyDep > 0 ? "warning" : "ok",
          detail: fullyDep > 0
            ? "Activos con valor en libros cero — evaluar baja o renovación"
            : "Todos los activos tienen depreciación parcial",
        },
        {
          label: "Activos en proceso de mantenimiento",
          value: needsMaint,
          status: needsMaint > 5 ? "warning" : "info",
          detail: "Activos con flag 'requiere mantenimiento' activado",
        },
        {
          label: "Total activos registrados",
          value: stats?.total_assets ?? 0,
          status: "ok",
          detail: "Activos activos en el sistema (excluye bajas y vendidos)",
        },
      ],
    },
    {
      title: "Licencias de software",
      icon: <FileText size={18} />,
      norm: "BSA Software Compliance / Política TI interna",
      items: [
        {
          label: "Licencias vencidas",
          value: expiredCount,
          status: expiredCount > 0 ? "error" : "ok",
          detail: expiredCount > 0
            ? "Licencias expiradas — riesgo de incumplimiento legal"
            : "Todas las licencias están vigentes",
        },
        {
          label: "Licencias por vencer (60 días)",
          value: expiringCount,
          status: expiringCount > 0 ? "warning" : "ok",
          detail: "Licencias que expiran en los próximos 60 días — planificar renovación",
        },
      ],
    },
    {
      title: "Seguridad de activos TI",
      icon: <Building2 size={18} />,
      norm: "Superintendencia de Bancos — Seguridad de la Información",
      items: [
        {
          label: "Equipos sin escaneo de seguridad (+30 días)",
          value: pendingScanCount,
          status: pendingScanCount > 0 ? (pendingScanCount > 5 ? "error" : "warning") : "ok",
          detail: pendingScanCount > 0
            ? "Equipos TI sin escaneo antivirus/seguridad en los últimos 30 días"
            : "Todos los equipos tienen escaneos recientes",
        },
        {
          label: "Total componentes registrados",
          value: stats?.total_components ?? 0,
          status: "info",
          detail: "Periféricos y componentes asociados a activos principales",
        },
      ],
    },
  ];

  // Score general
  const allItems = sections.flatMap((s) => s.items);
  const errors   = allItems.filter((i) => i.status === "error").length;
  const warnings = allItems.filter((i) => i.status === "warning").length;
  const oks      = allItems.filter((i) => i.status === "ok").length;
  const score    = Math.round((oks / allItems.length) * 100);

  const scoreColor = score >= 90 ? "text-green-600" : score >= 70 ? "text-yellow-600" : "text-red-600";
  const scoreBg    = score >= 90 ? "bg-green-50 border-green-200" : score >= 70 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cumplimiento normativo</h1>
        <p className="text-gray-500 text-sm mt-1">
          Panel de indicadores — SEPS · Superintendencia de Bancos · LORTI Art. 28 · NIC 16
        </p>
      </div>

      {/* Score general */}
      <div className={`card p-5 border ${scoreBg} flex items-center gap-6`}>
        <div className="text-center shrink-0">
          <p className={`text-5xl font-bold ${scoreColor}`}>{score}%</p>
          <p className="text-xs text-gray-500 mt-1">Índice de cumplimiento</p>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{oks}</p>
            <p className="text-xs text-gray-500">Indicadores OK</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{warnings}</p>
            <p className="text-xs text-gray-500">Avisos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{errors}</p>
            <p className="text-xs text-gray-500">Críticos</p>
          </div>
        </div>
        {errors > 0 && (
          <div className="text-xs text-red-600 bg-red-100 rounded-lg p-3 max-w-xs">
            Existen {errors} indicador{errors > 1 ? "es" : ""} crítico{errors > 1 ? "s" : ""} que requieren acción inmediata antes de cualquier auditoría regulatoria.
          </div>
        )}
        {errors === 0 && score === 100 && (
          <div className="text-xs text-green-700 bg-green-100 rounded-lg p-3 max-w-xs">
            Todos los indicadores en cumplimiento. El sistema está listo para auditoría regulatoria.
          </div>
        )}
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section) => (
          <ComplianceCard key={section.title} section={section} />
        ))}
      </div>

      {/* Nota legal */}
      <div className="card p-4 bg-gray-50 text-xs text-gray-500">
        <p className="font-medium text-gray-700 mb-1">Normativa de referencia:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>SEPS — Resolución de activos fijos y catálogo de cuentas cooperativas</li>
          <li>Superintendencia de Bancos — Normas de riesgo operativo y seguridad de la información</li>
          <li>LORTI Art. 28 — Tasas de depreciación de activos fijos para impuesto a la renta</li>
          <li>NIC 16 — Propiedades, planta y equipo (reconocimiento y medición)</li>
          <li>BSA — Alianza de software para cumplimiento de licencias</li>
        </ul>
        <p className="mt-2 text-gray-400">Este panel se actualiza en tiempo real desde la base de datos del sistema. No reemplaza una auditoría formal.</p>
      </div>
    </div>
  );
}

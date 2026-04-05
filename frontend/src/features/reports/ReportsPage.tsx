import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, BarChart3, Building2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { locationsApi } from "@/api/locationsApi";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

async function downloadCSV(url: string, filename: string, token: string) {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? "Error al exportar");
    }
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (e: any) {
    toast.error(e.message ?? "Error al descargar");
  }
}

interface ExportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  compliance: string;
  color: string;
  onExport: () => Promise<void>;
  filters?: React.ReactNode;
  isLoading: boolean;
}

function ExportCard({ icon, title, description, compliance, color, onExport, filters, isLoading }: ExportCardProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    await onExport();
    setExporting(false);
  }

  return (
    <div className={`card p-5 border-l-4 ${color} space-y-4`}>
      <div className="flex items-start gap-4">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5">{compliance}</span>
        </div>
      </div>
      {filters && <div className="pt-1">{filters}</div>}
      <button
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
        onClick={handleExport}
        disabled={exporting || isLoading}
      >
        <Download size={15} />
        {exporting ? "Generando..." : "Exportar CSV"}
      </button>
    </div>
  );
}

export default function ReportsPage() {
  const { accessToken, user } = useAuthStore();
  const isFinance = user?.role === "ADMIN" || user?.role === "CONTABILIDAD";

  // Filtros inventario
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAgency, setFilterAgency] = useState("");

  // Filtro depreciación
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const { data: agenciesData, isLoading: loadingAgencies } = useQuery({
    queryKey: ["agencies-select"],
    queryFn: () => locationsApi.getAgencies({ page_size: 100 }).then((r) => r.data),
  });
  const agencies = agenciesData?.results ?? [];

  function buildInventoryUrl() {
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterStatus) params.set("status", filterStatus);
    if (filterAgency) params.set("agency", filterAgency);
    const qs = params.toString();
    return `${BASE_URL}/reports/export/inventory/${qs ? "?" + qs : ""}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportería</h1>
        <p className="text-gray-500 text-sm mt-1">Exportación de informes en formato CSV — compatible con Excel</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-700">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <div>
          Los reportes se generan en tiempo real desde la base de datos. Los archivos CSV incluyen BOM UTF-8 para compatibilidad con Microsoft Excel.
          Los campos monetarios están protegidos con cifrado AES-256 en la base de datos y se exportan como valores calculados.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventario completo */}
        <ExportCard
          icon={<FileText size={22} className="text-blue-500" />}
          title="Inventario de activos"
          description="Listado completo de activos activos con todos sus atributos: código, categoría, estado, ubicación, proveedor, garantía, cuenta SEPS y UUID de QR."
          compliance="SEPS / Superintendencia de Bancos"
          color="border-l-blue-500"
          isLoading={loadingAgencies}
          onExport={() => downloadCSV(buildInventoryUrl(), "inventario_activos.csv", accessToken!)}
          filters={
            <div className="grid grid-cols-1 gap-2">
              <p className="text-xs font-medium text-gray-600 mb-1">Filtros opcionales:</p>
              <div className="grid grid-cols-3 gap-2">
                <select className="input text-xs" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="">Categoría</option>
                  <option value="COMPUTO">Cómputo</option>
                  <option value="VEHICULO">Vehículo</option>
                  <option value="MAQUINARIA">Maquinaria</option>
                  <option value="MUEBLE">Mueble</option>
                  <option value="INMUEBLE">Inmueble</option>
                  <option value="TELECOMUNICACION">Telecomunicación</option>
                  <option value="OTRO">Otro</option>
                </select>
                <select className="input text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Estado</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="VENDIDO">Vendido</option>
                </select>
                <select className="input text-xs" value={filterAgency} onChange={(e) => setFilterAgency(e.target.value)}>
                  <option value="">Agencia</option>
                  {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          }
        />

        {/* Depreciación LORTI */}
        {isFinance && (
          <ExportCard
            icon={<BarChart3 size={22} className="text-emerald-500" />}
            title="Tabla de depreciación"
            description="Cronograma de depreciación por activo: valor apertura, depreciación mensual, acumulada y valor cierre. Basado en LORTI Art. 28."
            compliance="LORTI Art. 28 / NIC 16"
            color="border-l-emerald-500"
            isLoading={false}
            onExport={() => downloadCSV(
              `${BASE_URL}/reports/export/depreciation/${filterYear ? "?year=" + filterYear : ""}`,
              `depreciacion_${filterYear || "todos"}.csv`,
              accessToken!
            )}
            filters={
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Año fiscal:</p>
                <select className="input text-xs w-32" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                  <option value="">Todos</option>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            }
          />
        )}

        {/* Reporte SEPS */}
        <ExportCard
          icon={<Building2 size={22} className="text-purple-500" />}
          title="Reporte SEPS — Activos fijos"
          description="Detalle de activos fijos por cuenta contable SEPS (1801–1899). Incluye estado de depreciación y mantenimiento. Para entrega a la Superintendencia."
          compliance="SEPS Resolución / SB Cumplimiento"
          color="border-l-purple-500"
          isLoading={false}
          onExport={() => downloadCSV(
            `${BASE_URL}/reports/export/seps/`,
            "reporte_seps_activos_fijos.csv",
            accessToken!
          )}
        />

        {/* Historial de bajas — usa el endpoint de audit */}
        <div className="card p-5 border-l-4 border-l-red-400 space-y-4">
          <div className="flex items-start gap-4">
            <FileText size={22} className="text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900">Historial de bajas y ventas</h3>
              <p className="text-sm text-gray-500 mt-0.5">Consulta el módulo de Auditoría para exportar bajas y ventas filtradas por rango de fecha.</p>
              <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5">Auditoría → tab Bajas</span>
            </div>
          </div>
          <a href="/audit" className="btn-secondary w-full text-center block text-sm">
            Ir a Auditoría
          </a>
        </div>
      </div>

      {/* Nota de cumplimiento */}
      <div className="card p-4 bg-gray-50 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-700">Normativa aplicada en los reportes:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li><strong>LORTI Art. 28</strong> — Tasas de depreciación por categoría de activo fijo</li>
          <li><strong>NIC 16</strong> — Reconocimiento y medición de propiedades, planta y equipo</li>
          <li><strong>SEPS</strong> — Catálogo de cuentas 18xx para cooperativas del segmento financiero</li>
          <li><strong>Superintendencia de Bancos</strong> — Reporte de activos TI críticos y riesgo operativo</li>
        </ul>
      </div>
    </div>
  );
}

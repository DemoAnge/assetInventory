import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download, FileText, Building2, AlertCircle,
  FileSpreadsheet, TrendingDown, ArrowLeftRight, Archive,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { locationsApi } from "@/api/locationsApi";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

async function downloadFile(url: string, filename: string, token: string) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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

interface ExportAction {
  label: string;
  filename: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary";
  buildUrl: () => string;
}

interface ExportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  compliance: string;
  color: string;
  actions: ExportAction[];
  filters?: React.ReactNode;
  isLoading?: boolean;
}

function ExportCard({ icon, title, description, compliance, color, actions, filters, isLoading }: ExportCardProps) {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleExport(action: ExportAction) {
    setLoading(action.label);
    await downloadFile(action.buildUrl(), action.filename, accessToken!);
    setLoading(null);
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
      <div className="flex gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 px-3 rounded-lg font-medium transition-colors ${
              action.variant === "primary"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            } disabled:opacity-60`}
            onClick={() => handleExport(action)}
            disabled={!!loading || !!isLoading}
          >
            {loading === action.label ? (
              <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
            ) : action.icon}
            {loading === action.label ? "Generando..." : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────


const MOVEMENT_TYPES = [
  { value: "TRASLADO",     label: "Traslado" },
  { value: "PRESTAMO",     label: "Préstamo" },
  { value: "DEVOLUCION",   label: "Devolución" },
  { value: "REASIGNACION", label: "Reasignación" },
  { value: "INGRESO",      label: "Ingreso" },
  { value: "BAJA",         label: "Baja / Retiro" },
  { value: "REACTIVACION", label: "Reactivación" },
];

const CATEGORY_OPTIONS = [
  { value: "COMPUTO",          label: "Cómputo" },
  { value: "VEHICULO",         label: "Vehículo" },
  { value: "MAQUINARIA",       label: "Maquinaria" },
  { value: "MUEBLE",           label: "Mueble" },
  { value: "INMUEBLE",         label: "Inmueble" },
  { value: "TELECOMUNICACION", label: "Telecomunicación" },
  { value: "OTRO",             label: "Otro" },
];

function csvExcel(csvUrl: () => string, xlsxUrl: () => string, csvFile: string, xlsxFile: string): ExportAction[] {
  return [
    { label: "CSV",   filename: csvFile,  icon: <Download size={14} />,        variant: "primary",   buildUrl: csvUrl },
    { label: "Excel", filename: xlsxFile, icon: <FileSpreadsheet size={14} />, variant: "secondary", buildUrl: xlsxUrl },
  ];
}

function buildUrl(base: string, params: Record<string, string | boolean | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === true)  p.set(k, "true");
    else if (v)      p.set(k, String(v));
  }
  const qs = p.toString();
  return qs ? `${BASE_URL}${base}?${qs}` : `${BASE_URL}${base}`;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ReportsPage() {
  // Inventario
  const [invCategory, setInvCategory]   = useState("");
  const [invStatus,   setInvStatus]     = useState("");
  const [invAgency,   setInvAgency]     = useState("");

  // Contable
  const [sepsAgency,   setSepsAgency]   = useState("");
  const [sepsCategory, setSepsCategory] = useState("");

  // Bajas
  const [bajasFrom,     setBajasFrom]     = useState("");
  const [bajasTo,       setBajasTo]       = useState("");
  const [bajasAgency,   setBajasAgency]   = useState("");
  const [bajasCategory, setBajasCategory] = useState("");

  // Movimientos
  const [movFrom,  setMovFrom]  = useState("");
  const [movTo,    setMovTo]    = useState("");
  const [movType,  setMovType]  = useState("");
  const [movAgency,setMovAgency] = useState("");
  const [movNoCascade, setMovNoCascade] = useState(true);

  // Depreciación
  const [depCategory, setDepCategory] = useState("");
  const [depAgency,   setDepAgency]   = useState("");
  const [depYear,     setDepYear]     = useState("");

  const { data: agenciesData, isLoading: loadingAgencies } = useQuery({
    queryKey: ["agencies-select"],
    queryFn:  () => locationsApi.getAgencies({ page_size: 100 }).then((r) => r.data),
  });
  const agencies = agenciesData?.results ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportería</h1>
        <p className="text-gray-500 text-sm mt-1">Exportación de informes en formato CSV o Excel</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-700">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <span>
          Los reportes se generan en tiempo real. Los Excel incluyen hoja de resumen + detalle agrupado con
          subtotales. Los valores monetarios se exportan desencriptados.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── 1. Inventario de activos ──────────────────────────────────── */}
        <ExportCard
          icon={<FileText size={22} className="text-blue-500" />}
          title="Inventario de activos"
          description="Listado completo con código, categoría, estado, marca, modelo, serie, ubicación, custodio, proveedor, garantía y cuenta contable."
          compliance="Control interno"
          color="border-l-blue-500"
          isLoading={loadingAgencies}
          actions={csvExcel(
            () => buildUrl("/reports/export/inventory/",       { category: invCategory, status: invStatus, agency: invAgency }),
            () => buildUrl("/reports/export/inventory/excel/", { category: invCategory, status: invStatus, agency: invAgency }),
            "inventario_activos.csv", "inventario_activos.xlsx",
          )}
          filters={
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Filtros opcionales:</p>
              <div className="grid grid-cols-3 gap-2">
                <select className="input text-xs" value={invCategory} onChange={(e) => setInvCategory(e.target.value)}>
                  <option value="">Categoría</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select className="input text-xs" value={invStatus} onChange={(e) => setInvStatus(e.target.value)}>
                  <option value="">Estado</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="PRESTADO">Prestado</option>
                  <option value="VENDIDO">Vendido</option>
                  <option value="ROBADO">Robado</option>
                </select>
                <select className="input text-xs" value={invAgency} onChange={(e) => setInvAgency(e.target.value)}>
                  <option value="">Agencia</option>
                  {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          }
        />

        {/* ── 2. Reporte contable ───────────────────────────────────── */}
        <ExportCard
          icon={<Building2 size={22} className="text-purple-500" />}
          title="Reporte contable — Activos fijos"
          description="Activos fijos agrupados por cuenta contable con valores de compra, depreciación acumulada, valor en libros y residual. Excel con hoja resumen + detalle."
          compliance="Control interno"
          color="border-l-purple-500"
          isLoading={loadingAgencies}
          actions={csvExcel(
            () => buildUrl("/reports/export/seps/",       { agency: sepsAgency, category: sepsCategory }),
            () => buildUrl("/reports/export/seps/excel/", { agency: sepsAgency, category: sepsCategory }),
            "reporte_contable_activos_fijos.csv", "reporte_contable_activos_fijos.xlsx",
          )}
          filters={
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Filtros opcionales:</p>
              <div className="grid grid-cols-2 gap-2">
                <select className="input text-xs" value={sepsCategory} onChange={(e) => setSepsCategory(e.target.value)}>
                  <option value="">Categoría</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select className="input text-xs" value={sepsAgency} onChange={(e) => setSepsAgency(e.target.value)}>
                  <option value="">Agencia</option>
                  {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          }
        />

        {/* ── 3. Historial de bajas ─────────────────────────────────────── */}
        <ExportCard
          icon={<Archive size={22} className="text-red-500" />}
          title="Historial de bajas"
          description="Registro completo de activos dados de baja: fecha, código, custodio anterior, motivo, autorizado por y usuario que ejecutó la baja. Excel con filas coloreadas por categoría."
          compliance="Control interno"
          color="border-l-red-500"
          isLoading={loadingAgencies}
          actions={csvExcel(
            () => buildUrl("/reports/export/bajas/",       { date_from: bajasFrom, date_to: bajasTo, agency: bajasAgency, category: bajasCategory }),
            () => buildUrl("/reports/export/bajas/excel/", { date_from: bajasFrom, date_to: bajasTo, agency: bajasAgency, category: bajasCategory }),
            "historial_bajas.csv", "historial_bajas.xlsx",
          )}
          filters={
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Filtros opcionales:</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Desde</label>
                  <input type="date" className="input text-xs w-full" value={bajasFrom} onChange={(e) => setBajasFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Hasta</label>
                  <input type="date" className="input text-xs w-full" value={bajasTo} onChange={(e) => setBajasTo(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select className="input text-xs" value={bajasAgency} onChange={(e) => setBajasAgency(e.target.value)}>
                  <option value="">Agencia</option>
                  {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select className="input text-xs" value={bajasCategory} onChange={(e) => setBajasCategory(e.target.value)}>
                  <option value="">Categoría</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
          }
        />

        {/* ── 4. Historial de movimientos ───────────────────────────────── */}
        <ExportCard
          icon={<ArrowLeftRight size={22} className="text-amber-500" />}
          title="Historial de movimientos"
          description="Todos los movimientos de activos: traslados, préstamos, devoluciones, reasignaciones, ingresos, bajas y reactivaciones. Excel con hoja resumen + hojas separadas por tipo."
          compliance="Control interno / Trazabilidad de activos"
          color="border-l-amber-500"
          isLoading={loadingAgencies}
          actions={csvExcel(
            () => buildUrl("/reports/export/movements/",       { date_from: movFrom, date_to: movTo, movement_type: movType, agency: movAgency, exclude_cascade: movNoCascade || undefined }),
            () => buildUrl("/reports/export/movements/excel/", { date_from: movFrom, date_to: movTo, movement_type: movType, agency: movAgency, exclude_cascade: movNoCascade || undefined }),
            "historial_movimientos.csv", "historial_movimientos.xlsx",
          )}
          filters={
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Filtros opcionales:</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Desde</label>
                  <input type="date" className="input text-xs w-full" value={movFrom} onChange={(e) => setMovFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Hasta</label>
                  <input type="date" className="input text-xs w-full" value={movTo} onChange={(e) => setMovTo(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select className="input text-xs" value={movType} onChange={(e) => setMovType(e.target.value)}>
                  <option value="">Tipo de movimiento</option>
                  {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select className="input text-xs" value={movAgency} onChange={(e) => setMovAgency(e.target.value)}>
                  <option value="">Agencia (origen o destino)</option>
                  {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={movNoCascade} onChange={(e) => setMovNoCascade(e.target.checked)} className="rounded border-gray-300" />
                Excluir movimientos de arrastre (componentes arrastrados por el padre)
              </label>
            </div>
          }
        />

        {/* ── 5. Tabla de depreciación ──────────────────────────────────── */}
        <ExportCard
          icon={<TrendingDown size={22} className="text-emerald-600" />}
          title="Tabla de depreciación"
          description="Depreciación por activo: valor de compra, depreciación anual calculada, acumulada, valor en libros y residual. Excel con resumen por cuenta y detalle con filas rojas para activos totalmente depreciados."
          compliance="Control interno"
          color="border-l-emerald-600"
          isLoading={loadingAgencies}
          actions={csvExcel(
            () => buildUrl("/reports/export/depreciation/",       { category: depCategory, agency: depAgency, year: depYear }),
            () => buildUrl("/reports/export/depreciation/excel/", { category: depCategory, agency: depAgency, year: depYear }),
            "tabla_depreciacion.csv", "tabla_depreciacion.xlsx",
          )}
          filters={
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Filtros opcionales:</p>
              <div className="grid grid-cols-3 gap-2">
                <select className="input text-xs" value={depCategory} onChange={(e) => setDepCategory(e.target.value)}>
                  <option value="">Categoría</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select className="input text-xs" value={depAgency} onChange={(e) => setDepAgency(e.target.value)}>
                  <option value="">Agencia</option>
                  {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select className="input text-xs" value={depYear} onChange={(e) => setDepYear(e.target.value)}>
                  <option value="">Año compra</option>
                  {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          }
        />


      </div>

    </div>
  );
}

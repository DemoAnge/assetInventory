import type { AssetType } from "@/@types/asset.types";
import type { DashboardStats, AssetsByMonth } from "@/api/reportsApi";
import type { MaintenanceRecord } from "@/api/maintenanceApi";
import type { DashSource } from "./buildDashboard";

const DAY = 86400000;

function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY).toISOString();
}

function monthKey(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function asset(
  id: number,
  patch: Partial<AssetType> & Pick<AssetType, "asset_code" | "name" | "category" | "category_display" | "status" | "status_display" | "agency_name">,
): AssetType {
  return {
    id,
    serial_number: `SN-${1000 + id}`,
    asset_model: 1,
    brand_name: "Genérico",
    model_name: "Base",
    asset_type_name: patch.category_display,
    color: "",
    observations: "",
    parent_asset: null,
    parent_code: null,
    component_type: null,
    is_component: false,
    components: [],
    components_count: patch.category === "COMPUTO" ? 2 : 0,
    agency: 1,
    department: 1,
    department_name: "Operaciones",
    area: 1,
    area_name: "Piso 1",
    custodian: 1,
    custodian_name: patch.custodian_name ?? "Custodio demo",
    custodian_position: "Analista",
    purchase_value: "1200.00",
    residual_value: "120.00",
    current_value: "780.00",
    accumulated_depreciation: "420.00",
    monthly_depreciation: 18,
    depreciation_info: { years: 5, rate: 20 },
    purchase_date: daysAgo(200),
    activation_date: daysAgo(190),
    deactivation_date: null,
    warranty_expiry: daysAgo(-120),
    useful_life_years: 5,
    depreciation_rate: "20.00",
    is_fully_depreciated: false,
    invoice_number: `F-${8000 + id}`,
    supplier: "Proveedor demo",
    account_code: 1,
    account_code_display: "1.2.3 Equipo",
    qr_uuid: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    is_active: patch.status === "ACTIVO" || patch.status === "PRESTADO" || patch.status === "MANTENIMIENTO",
    is_critical_it: patch.category === "TELECOMUNICACION" || patch.asset_code === "COM-0022",
    requires_maintenance: patch.status === "MANTENIMIENTO",
    it_profile_id: patch.category === "COMPUTO" || patch.category === "TELECOMUNICACION" ? id : null,
    it_risk_level: patch.category === "TELECOMUNICACION" ? "ALTO" : patch.category === "COMPUTO" ? "MEDIO" : null,
    it_hostname: patch.category === "COMPUTO" || patch.category === "TELECOMUNICACION" ? `host-${id}` : null,
    it_ip_address: patch.category === "COMPUTO" || patch.category === "TELECOMUNICACION" ? `10.0.4.${id}` : null,
    created_at: daysAgo(200),
    updated_at: daysAgo(4),
    ...patch,
  };
}

const DEMO_ASSETS: AssetType[] = [
  asset(1, { asset_code: "COM-0001", name: "Portátil Dell Latitude", category: "COMPUTO", category_display: "Cómputo", status: "ACTIVO", status_display: "Activo", agency_name: "Matriz", purchase_value: "1450.00", current_value: "980.00", custodian_name: "Ana Mora" }),
  asset(2, { asset_code: "COM-0002", name: "Workstation HP Z2", category: "COMPUTO", category_display: "Cómputo", status: "MANTENIMIENTO", status_display: "Mantenimiento", agency_name: "Norte", purchase_value: "2100.00", current_value: "1320.00", requires_maintenance: true, custodian_name: "Luis Cedeño" }),
  asset(3, { asset_code: "TEL-0008", name: "Switch Cisco 24p", category: "TELECOMUNICACION", category_display: "Telecomunicación", status: "ACTIVO", status_display: "Activo", agency_name: "Matriz", purchase_value: "890.00", current_value: "610.00", custodian_name: "Mesa de ayuda" }),
  asset(4, { asset_code: "VEH-0012", name: "Camioneta Ranger", category: "VEHICULO", category_display: "Vehículo", status: "ACTIVO", status_display: "Activo", agency_name: "Costa", purchase_value: "28500.00", current_value: "19200.00", depreciation_rate: "12.50", custodian_name: "Logística Costa" }),
  asset(5, { asset_code: "MAQ-0004", name: "Generador 20 kVA", category: "MAQUINARIA", category_display: "Maquinaria", status: "ACTIVO", status_display: "Activo", agency_name: "Sur", purchase_value: "6400.00", current_value: "4100.00", custodian_name: "Planta Sur" }),
  asset(6, { asset_code: "MUE-0031", name: "Estación de trabajo", category: "MUEBLE", category_display: "Mueble", status: "ACTIVO", status_display: "Activo", agency_name: "Norte", purchase_value: "340.00", current_value: "210.00", custodian_name: "Ana Mora" }),
  asset(7, { asset_code: "INM-0001", name: "Bodega auxiliar", category: "INMUEBLE", category_display: "Inmueble", status: "ACTIVO", status_display: "Activo", agency_name: "Sur", purchase_value: "48000.00", current_value: "45500.00", depreciation_rate: "2.50", custodian_name: "Administración" }),
  asset(8, { asset_code: "COM-0019", name: "Impresora láser", category: "COMPUTO", category_display: "Cómputo", status: "PRESTADO", status_display: "Prestado", agency_name: "Norte", purchase_value: "420.00", current_value: "180.00", custodian_name: "Auditoría" }),
  asset(9, { asset_code: "COM-0022", name: "Servidor Dell R740", category: "COMPUTO", category_display: "Cómputo", status: "ACTIVO", status_display: "Activo", agency_name: "Matriz", purchase_value: "9200.00", current_value: "5400.00", components_count: 6, custodian_name: "Mesa de ayuda" }),
  asset(10, { asset_code: "TEL-0014", name: "AP Ubiquiti", category: "TELECOMUNICACION", category_display: "Telecomunicación", status: "INACTIVO", status_display: "Inactivo", agency_name: "Costa", purchase_value: "210.00", current_value: "40.00", is_fully_depreciated: true, custodian_name: "TI Costa" }),
  asset(11, { asset_code: "VEH-0003", name: "Sedán institucional", category: "VEHICULO", category_display: "Vehículo", status: "MANTENIMIENTO", status_display: "Mantenimiento", agency_name: "Matriz", purchase_value: "17800.00", current_value: "9200.00", requires_maintenance: true, custodian_name: "Chofer pool" }),
  asset(12, { asset_code: "MAQ-0009", name: "Montacargas", category: "MAQUINARIA", category_display: "Maquinaria", status: "ACTIVO", status_display: "Activo", agency_name: "Costa", purchase_value: "11200.00", current_value: "7600.00", custodian_name: "Bodega Costa" }),
  asset(13, { asset_code: "MUE-0044", name: "Archivador metálico", category: "MUEBLE", category_display: "Mueble", status: "ACTIVO", status_display: "Activo", agency_name: "Matriz", purchase_value: "180.00", current_value: "95.00", custodian_name: "Archivo" }),
  asset(14, { asset_code: "COM-0030", name: "Laptop Lenovo T14", category: "COMPUTO", category_display: "Cómputo", status: "ROBADO", status_display: "Robado", agency_name: "Norte", purchase_value: "1280.00", current_value: "0.00", custodian_name: "Ana Mora" }),
  asset(15, { asset_code: "COM-0033", name: "Monitor 27 pulgadas", category: "COMPUTO", category_display: "Cómputo", status: "ACTIVO", status_display: "Activo", agency_name: "Sur", purchase_value: "310.00", current_value: "190.00", is_fully_depreciated: false, custodian_name: "Luis Cedeño" }),
  asset(16, { asset_code: "TEL-0021", name: "Firewall FortiGate", category: "TELECOMUNICACION", category_display: "Telecomunicación", status: "ACTIVO", status_display: "Activo", agency_name: "Matriz", purchase_value: "3100.00", current_value: "2480.00", custodian_name: "Mesa de ayuda" }),
  asset(17, { asset_code: "OTR-0005", name: "Kit de herramientas", category: "OTRO", category_display: "Otro", status: "ACTIVO", status_display: "Activo", agency_name: "Sur", purchase_value: "260.00", current_value: "140.00", custodian_name: "Mantenimiento" }),
  asset(18, { asset_code: "COM-0041", name: "NAS Synology", category: "COMPUTO", category_display: "Cómputo", status: "ACTIVO", status_display: "Activo", agency_name: "Matriz", purchase_value: "1750.00", current_value: "1210.00", is_fully_depreciated: false, custodian_name: "Mesa de ayuda" }),
];

function ot(
  id: number,
  asset: AssetType,
  overdue: boolean,
): MaintenanceRecord {
  return {
    id,
    asset: asset.id,
    asset_code: asset.asset_code,
    asset_name: asset.name,
    asset_serial_number: asset.serial_number,
    maintenance_type: overdue ? "CORRECTIVO" : "PREVENTIVO",
    maintenance_type_display: overdue ? "Correctivo" : "Preventivo",
    status: overdue ? "VENCIDO" : "PROGRAMADO",
    status_display: overdue ? "Vencido" : "Programado",
    scheduled_date: daysAgo(overdue ? 6 : -9),
    completed_date: null,
    next_maintenance: daysAgo(-40),
    technician: overdue ? "Taller Norte" : "Técnico interno",
    technician_ref: null,
    technician_name: overdue ? "Taller Norte" : "Técnico interno",
    supplier: "",
    work_order: `OT-${2400 + id}`,
    description: overdue ? "Falla reportada en campo" : "Rutina de 90 días",
    findings: "",
    parts_replaced: [],
    cost: overdue ? "180.00" : "0.00",
    downtime_hours: overdue ? "4.00" : "0.00",
    created_at: daysAgo(12),
    status_logs: [],
  };
}

export function demoSource(): DashSource {
  const months: AssetsByMonth[] = Array.from({ length: 12 }, (_, i) => {
    const offset = 11 - i;
    const counts = [4, 3, 5, 2, 6, 4, 7, 5, 3, 8, 6, 5];
    return { month: monthKey(offset), count: counts[i] };
  });

  const byCategory = [
    { category: "Cómputo", count: 8 },
    { category: "Telecomunicación", count: 3 },
    { category: "Vehículo", count: 2 },
    { category: "Maquinaria", count: 2 },
    { category: "Mueble", count: 2 },
    { category: "Inmueble", count: 1 },
  ];
  const byStatus = [
    { status: "Activo", count: 13 },
    { status: "Mantenimiento", count: 2 },
    { status: "Prestado", count: 1 },
    { status: "Inactivo", count: 1 },
    { status: "Robado", count: 1 },
  ];
  const byAgency = [
    { agency__name: "Matriz", count: 8 },
    { agency__name: "Norte", count: 4 },
    { agency__name: "Sur", count: 3 },
    { agency__name: "Costa", count: 3 },
  ];

  const stats: DashboardStats = {
    total_assets: DEMO_ASSETS.length,
    total_components: 12,
    critical_it: 3,
    fully_deprecated: 1,
    needs_maintenance: 2,
    alerts_unresolved: 4,
    by_category: byCategory,
    by_status: byStatus,
    by_agency: byAgency,
    recent_activity: [
      { object_code: "COM-0041", object_name: "NAS Synology", user_email: "admin@sgacop.com", action_date: daysAgo(1) },
      { object_code: "TEL-0021", object_name: "Firewall FortiGate", user_email: "ti@sgacop.com", action_date: daysAgo(3) },
      { object_code: "VEH-0012", object_name: "Camioneta Ranger", user_email: "admin@sgacop.com", action_date: daysAgo(8) },
    ],
    financial: {
      total_assets_with_value: 17,
      fully_depreciated_count: 1,
      sales_count: 0,
    },
    generated_at: new Date().toISOString(),
  };

  const maintAssets = DEMO_ASSETS.filter((a) => a.status === "MANTENIMIENTO");
  return {
    assets: DEMO_ASSETS,
    stats,
    months,
    upcoming: [ot(1, DEMO_ASSETS[4], false), ot(2, DEMO_ASSETS[11], false)],
    overdue: maintAssets.map((a, i) => ot(10 + i, a, true)),
    demo: true,
  };
}

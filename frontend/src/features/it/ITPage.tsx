import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield, AlertTriangle, Key, Monitor, ChevronLeft, Search, Package } from "lucide-react";
import { itApi, type ITAssetProfile, type SoftwareLicense } from "@/api/itApi";
import { assetsApi } from "@/api/assetsApi";
import ITAssetFormModal from "./ITAssetFormModal";
import { ITProfileForm } from "./components/ITProfileForm";
import { LicenseForm } from "./components/LicenseForm";
import { RISK_STYLES, LICENSE_TYPE_LABELS } from "./components/itConstants";
import toast from "react-hot-toast";

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ITPage() {
  // Vista principal: home → elige sección; it_assets → activos tecnológicos; profiles → perfiles/licencias
  const [mainView, setMainView] = useState<"home" | "it_assets" | "profiles">("home");

  // ── Estado de activos tecnológicos ──
  const [itCategory, setItCategory] = useState<"COMPUTO" | "TELECOMUNICACION">("COMPUTO");
  const [itSearch, setItSearch] = useState("");
  const [itPage, setItPage] = useState(1);
  const [itStatus, setItStatus] = useState("");
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingProfileInAssets, setEditingProfileInAssets] = useState<ITAssetProfile | null>(null);
  const [showProfileFormInAssets, setShowProfileFormInAssets] = useState(false);

  async function openProfileFromAsset(profileId: number) {
    try {
      const res = await itApi.getProfileById(profileId);
      setEditingProfileInAssets(res.data);
      setShowProfileFormInAssets(true);
    } catch {
      toast.error("No se pudo cargar el perfil TI.");
    }
  }

  // Construir parámetros: si status=INACTIVO enviar is_active=false; si vacío, omitir (default activos)
  const itQueryParams: Record<string, unknown> = {
    category: itCategory,
    page: itPage,
    ...(itSearch ? { search: itSearch } : {}),
    ...(itStatus === "INACTIVO"
      ? { is_active: "false", status: "INACTIVO" }
      : itStatus
      ? { status: itStatus }
      : {}),
  };

  const { data: itAssetsData, isLoading: itAssetsLoading } = useQuery({
    queryKey: ["it-assets-list", itCategory, itSearch, itPage, itStatus],
    queryFn: () => assetsApi.getAll(itQueryParams).then(r => r.data),
    enabled: mainView === "it_assets",
  });

  const qcIt = useQueryClient();
  const associateMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await itApi.createProfile({ asset: id, risk_level: "BAJO" });
      }
    },
    onSuccess: () => {
      qcIt.invalidateQueries({ queryKey: ["it-assets-list"] });
      qcIt.invalidateQueries({ queryKey: ["it-profiles"] });
      setSelectedIds(new Set());
      toast.success("Activos asociados al módulo TI. Puedes editar sus perfiles en 'Activos Existentes de TI'.");
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al asociar. Puede que ya tengan perfil."),
  });

  function toggleSelect(id: number, hasProfile: boolean) {
    if (hasProfile) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Estado de perfiles TI ──
  const [tab, setTab] = useState<"profiles" | "licenses">("profiles");
  const [subTab, setSubTab] = useState<"all" | "critical" | "pending-scan" | "expiring" | "expired">("all");
  const [page, setPage] = useState(1);
  const [filterRisk, setFilterRisk] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ITAssetProfile | null>(null);
  const [editingLicense, setEditingLicense] = useState<SoftwareLicense | null>(null);

  const profileParams: Record<string, unknown> = { page };
  if (filterRisk) profileParams.risk_level = filterRisk;

  const { data: profilesData } = useQuery({
    queryKey: ["it-profiles", "all", profileParams],
    queryFn: () => itApi.getAllProfiles(profileParams).then((r) => r.data),
    enabled: tab === "profiles" && subTab === "all",
  });

  const { data: critical } = useQuery({
    queryKey: ["it-profiles", "critical"],
    queryFn: () => itApi.getCritical().then((r) => r.data),
    enabled: tab === "profiles" && subTab === "critical",
  });

  const { data: pendingScan } = useQuery({
    queryKey: ["it-profiles", "pending-scan"],
    queryFn: () => itApi.getPendingScan().then((r) => r.data),
    enabled: tab === "profiles" && subTab === "pending-scan",
  });

  const { data: licensesData } = useQuery({
    queryKey: ["it-license", "list", page],
    queryFn: () => itApi.getAllLicenses({ page }).then((r) => r.data),
    enabled: tab === "licenses" && subTab === "all",
    staleTime: 0,
  });

  const { data: expiring } = useQuery({
    queryKey: ["it-license", "expiring"],
    queryFn: () => itApi.getExpiring().then((r) => r.data),
    enabled: tab === "licenses" && subTab === "expiring",
    staleTime: 0,
  });

  const { data: expired } = useQuery({
    queryKey: ["it-license", "expired"],
    queryFn: () => itApi.getExpired().then((r) => r.data),
    enabled: tab === "licenses" && subTab === "expired",
    staleTime: 0,
  });

  const profileList: ITAssetProfile[] =
    subTab === "critical" ? (critical ?? []) :
    subTab === "pending-scan" ? (pendingScan ?? []) :
    (profilesData?.results ?? []);

  const licenseList: SoftwareLicense[] =
    subTab === "expiring" ? (expiring ?? []) :
    subTab === "expired" ? (expired ?? []) :
    (licensesData?.results ?? []);

  function switchTab(t: typeof tab) {
    setTab(t);
    setSubTab("all");
    setPage(1);
  }

  // ── Vista HOME ────────────────────────────────────────────────────────────────
  if (mainView === "home") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulo TI</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de activos tecnológicos y perfiles TI</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Tarjeta 1 — Activos Tecnológicos */}
          <button
            onClick={() => setMainView("it_assets")}
            className="card p-8 text-left hover:shadow-lg hover:border-blue-200 border border-transparent transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                <Monitor size={28} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Activos Tecnológicos</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Lista de todos los activos de categoría Cómputo y Telecomunicaciones registrados en el sistema.
                </p>
                <span className="inline-block mt-3 text-sm text-blue-600 font-medium group-hover:underline">
                  Ver activos →
                </span>
              </div>
            </div>
          </button>

          {/* Tarjeta 2 — Activos con perfil TI */}
          <button
            onClick={() => setMainView("profiles")}
            className="card p-8 text-left hover:shadow-lg hover:border-green-200 border border-transparent transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-100 transition-colors">
                <Shield size={28} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Activos Existentes de TI</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Activos con perfil TI ya configurado: hostname, IP, SO, RAM, nivel de riesgo y licencias.
                </p>
                <span className="inline-block mt-3 text-sm text-green-600 font-medium group-hover:underline">
                  Ver perfiles TI →
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Vista ACTIVOS TECNOLÓGICOS ────────────────────────────────────────────────
  if (mainView === "it_assets") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMainView("home")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Activos Tecnológicos</h1>
              <p className="text-gray-500 text-sm mt-0.5">{itAssetsData?.count ?? 0} activos encontrados</p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <button
                className="btn-primary flex items-center gap-2"
                disabled={associateMutation.isPending}
                onClick={() => associateMutation.mutate(Array.from(selectedIds))}
              >
                <Shield size={16} />
                {associateMutation.isPending
                  ? "Asociando..."
                  : `Asociar a TI (${selectedIds.size})`}
              </button>
            )}
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => setShowNewProfileModal(true)}
            >
              <Plus size={16} /> Perfil manual
            </button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Package size={14} />
            <span>{selectedIds.size} activo(s) seleccionado(s). Pulsa <strong>Asociar a TI</strong> para crear sus perfiles con riesgo inicial <em>Bajo</em>. Podrás editar cada perfil en "Activos Existentes de TI".</span>
            <button className="ml-auto text-xs underline" onClick={() => setSelectedIds(new Set())}>Limpiar selección</button>
          </div>
        )}

        {/* Filtros */}
        <div className="card p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9"
              placeholder="Buscar por código, nombre, serie..."
              value={itSearch}
              onChange={e => { setItSearch(e.target.value); setItPage(1); }}
            />
          </div>
          <select
            className="input-field w-auto"
            value={itCategory}
            onChange={e => { setItCategory(e.target.value as "COMPUTO" | "TELECOMUNICACION"); setItPage(1); }}
          >
            <option value="COMPUTO">Equipo de Cómputo</option>
            <option value="TELECOMUNICACION">Telecomunicaciones</option>
          </select>
          <select
            className="input-field w-auto"
            value={itStatus}
            onChange={e => { setItStatus(e.target.value); setItPage(1); setSelectedIds(new Set()); }}
          >
            <option value="">Todos los estados (activos)</option>
            <option value="ACTIVO">Activo</option>
            <option value="MANTENIMIENTO">En mantenimiento</option>
            <option value="PRESTADO">Prestado</option>
            <option value="VENDIDO">Vendido</option>
            <option value="ROBADO">Robado</option>
            <option value="INACTIVO">Inactivo (dados de baja)</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 w-10"></th>
                  {["Código activo", "Nombre", "Marca / Modelo", "Categoría", "Estado", "Custodio", "Perfil TI"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itAssetsLoading && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
                )}
                {!itAssetsLoading && !itAssetsData?.results.length && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin activos en esta categoría.</td></tr>
                )}
                {itAssetsData?.results.map(a => {
                  const hasProfile = !!a.it_profile_id;
                  const isSelected = selectedIds.has(a.id);
                  return (
                    <tr
                      key={a.id}
                      className={`border-b border-gray-100 transition-colors ${
                        hasProfile
                          ? "bg-blue-50/40 hover:bg-blue-100/60 cursor-pointer"
                          : isSelected
                          ? "bg-primary-50"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={hasProfile && a.it_profile_id ? () => openProfileFromAsset(a.it_profile_id!) : undefined}
                    >
                      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={hasProfile}
                          onChange={() => toggleSelect(a.id, hasProfile)}
                          className="rounded border-gray-300 text-primary-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-primary-600 font-semibold">{a.asset_code}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                      <td className="px-4 py-3 text-gray-600">{[a.brand_name, a.model_name].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{a.category_display}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.status === "ACTIVO" ? "bg-green-100 text-green-700"
                          : a.status === "MANTENIMIENTO" ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                        }`}>{a.status_display}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.custodian_name ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {hasProfile ? (
                          <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium inline-flex items-center gap-1">
                            <Shield size={11} /> Ver perfil →
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Sin perfil</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {itAssetsData && itAssetsData.total_pages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
              <span>Página {itPage} de {itAssetsData.total_pages}</span>
              <div className="flex gap-2">
                <button className="btn-secondary py-1 px-3 disabled:opacity-40" disabled={!itAssetsData.previous} onClick={() => setItPage(p => p - 1)}>Anterior</button>
                <button className="btn-secondary py-1 px-3 disabled:opacity-40" disabled={!itAssetsData.next} onClick={() => setItPage(p => p + 1)}>Siguiente</button>
              </div>
            </div>
          )}
        </div>

        {showNewProfileModal && (
          <ITAssetFormModal onClose={() => setShowNewProfileModal(false)} />
        )}

        {showProfileFormInAssets && editingProfileInAssets && (
          <ITProfileForm
            profile={editingProfileInAssets}
            onClose={() => { setShowProfileFormInAssets(false); setEditingProfileInAssets(null); }}
          />
        )}
      </div>
    );
  }

  // ── Vista PERFILES TI (lógica existente) ──────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setMainView("home")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activos Existentes de TI</h1>
            <p className="text-gray-500 text-sm mt-1">Perfiles TI y licencias de software</p>
          </div>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => { setEditingProfile(null); setEditingLicense(null); setShowForm(true); }}
        >
          <Plus size={16} /> {tab === "profiles" ? "Nuevo perfil TI" : "Nueva licencia"}
        </button>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "profiles", label: "Perfiles TI", icon: <Shield size={14} /> },
          { key: "licenses", label: "Licencias", icon: <Key size={14} /> },
        ].map((t) => (
          <button
            key={t.key}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => switchTab(t.key as typeof tab)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      {tab === "profiles" && (
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Todos" },
            { key: "critical", label: "Críticos / Altos" },
            { key: "pending-scan", label: "Sin escaneo (+30 días)" },
          ].map((s) => (
            <button
              key={s.key}
              className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-colors ${
                subTab === s.key ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:border-blue-400"
              }`}
              onClick={() => { setSubTab(s.key as typeof subTab); setPage(1); }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      {tab === "licenses" && (
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Todas" },
            { key: "expiring", label: "Por vencer (60 días)" },
            { key: "expired", label: "Vencidas" },
          ].map((s) => (
            <button
              key={s.key}
              className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-colors ${
                subTab === s.key ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:border-blue-400"
              }`}
              onClick={() => { setSubTab(s.key as typeof subTab); setPage(1); }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      {tab === "profiles" && subTab === "all" && (
        <div className="card p-4 flex gap-3">
          <select className="input w-40" value={filterRisk} onChange={(e) => { setFilterRisk(e.target.value); setPage(1); }}>
            <option value="">Todos los riesgos</option>
            <option value="CRITICO">Crítico</option>
            <option value="ALTO">Alto</option>
            <option value="MEDIO">Medio</option>
            <option value="BAJO">Bajo</option>
          </select>
        </div>
      )}

      {/* IT Profiles Table */}
      {tab === "profiles" && (
        <div className="card overflow-hidden">
          {subTab === "critical" && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle size={14} /> Activos TI de nivel CRÍTICO o ALTO — reporte Superintendencia de Bancos
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Activo", "Hostname", "IP", "SO", "RAM", "Riesgo", "Servidor", "Último escaneo", "Antivirus", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profileList.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Sin registros</td></tr>
                )}
                {profileList.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-blue-50 border-b border-gray-100 cursor-pointer transition-colors"
                    onClick={() => { setEditingProfile(p); setShowForm(true); }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-primary-600 font-semibold text-xs">{p.asset_code}</span>
                      <p className="text-gray-700 text-xs mt-0.5">{p.asset_name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.hostname || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.ip_address || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.os_name ? `${p.os_name} ${p.os_version}` : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.ram_gb ? `${p.ram_gb} GB` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium rounded px-2 py-0.5 ${RISK_STYLES[p.risk_level] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{p.is_server ? "✓" : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.last_scan_date ? (
                        <span className={new Date(p.last_scan_date) < new Date(Date.now() - 30 * 86400000) ? "text-red-600" : "text-gray-600"}>
                          {p.last_scan_date}
                        </span>
                      ) : <span className="text-red-500 font-medium">Sin escaneo</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.antivirus || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-colors">
                        Editar →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Licenses Table */}
      {tab === "licenses" && (
        <div className="card overflow-hidden">
          {subTab === "expiring" && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-700">
              Licencias que vencen en los próximos 60 días
            </div>
          )}
          {subTab === "expired" && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
              Licencias vencidas — requieren renovación o baja
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Software", "Versión", "Tipo", "Total", "En uso", "Disponibles", "Proveedor", "Vencimiento", "Costo", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {licenseList.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Sin licencias</td></tr>
                )}
                {licenseList.map((lic) => (
                  <tr key={lic.id} className={`hover:bg-gray-50 border-b border-gray-100 ${lic.is_expired ? "bg-red-50/50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{lic.software_name}</td>
                    <td className="px-4 py-3 text-gray-600">{lic.version || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">
                        {LICENSE_TYPE_LABELS[lic.license_type] ?? lic.license_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{lic.seats}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{lic.used_seats}</td>
                    <td className="px-4 py-3 text-center font-semibold text-green-700">{lic.available_seats}</td>
                    <td className="px-4 py-3 text-gray-600">{lic.vendor || "—"}</td>
                    <td className="px-4 py-3">
                      {lic.expiry_date ? (
                        <span className={lic.is_expired ? "text-red-600 font-medium" : "text-gray-600"}>
                          {lic.expiry_date}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lic.cost ? `$${lic.cost}` : "—"}</td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-blue-600 hover:underline" onClick={() => { setEditingLicense(lic); setShowForm(true); }}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {tab === "profiles" && subTab === "all" && profilesData && profilesData.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm text-gray-600 px-3 py-2">Página {page} de {profilesData.total_pages}</span>
          <button className="btn-secondary text-sm" disabled={page === profilesData.total_pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      )}
      {tab === "licenses" && subTab === "all" && licensesData && licensesData.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm text-gray-600 px-3 py-2">Página {page} de {licensesData.total_pages}</span>
          <button className="btn-secondary text-sm" disabled={page === licensesData.total_pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      )}

      {showForm && tab === "profiles" && (
        <ITProfileForm profile={editingProfile ?? undefined} onClose={() => { setShowForm(false); setEditingProfile(null); }} />
      )}
      {showForm && tab === "licenses" && (
        <LicenseForm license={editingLicense ?? undefined} onClose={() => { setShowForm(false); setEditingLicense(null); }} />
      )}
    </div>
  );
}

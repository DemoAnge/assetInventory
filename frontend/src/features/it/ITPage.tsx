import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield, AlertTriangle, Key, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { itApi, type ITAssetProfile, type SoftwareLicense, type ITAssetProfileFormData, type SoftwareLicenseFormData } from "@/api/itApi";
import toast from "react-hot-toast";

const RISK_STYLES: Record<string, string> = {
  CRITICO: "bg-red-100 text-red-700",
  ALTO:    "bg-orange-100 text-orange-700",
  MEDIO:   "bg-yellow-100 text-yellow-700",
  BAJO:    "bg-green-100 text-green-700",
};

const LICENSE_TYPE_LABELS: Record<string, string> = {
  PERPETUA:    "Perpetua",
  SUSCRIPCION: "Suscripción",
  OEM:         "OEM",
  OPEN_SOURCE: "Open Source",
  VOLUMEN:     "Por volumen",
};

// ── IT Profile Form ────────────────────────────────────────────────────────────
function ITProfileForm({ profile, onClose }: { profile?: ITAssetProfile; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<ITAssetProfileFormData>({
    defaultValues: profile ?? { risk_level: "BAJO" },
  });

  const mutation = useMutation({
    mutationFn: (data: ITAssetProfileFormData) =>
      profile ? itApi.updateProfile(profile.id, data) : itApi.createProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["it-profiles"] });
      toast.success(profile ? "Perfil actualizado" : "Perfil TI creado");
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al guardar"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{profile ? "Editar perfil TI" : "Nuevo perfil TI"}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID del activo *</label>
              <input type="number" className="input w-full" {...register("asset", { required: true, valueAsNumber: true })} />
              {errors.asset && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de riesgo *</label>
              <select className="input w-full" {...register("risk_level", { required: true })}>
                <option value="BAJO">Bajo</option>
                <option value="MEDIO">Medio</option>
                <option value="ALTO">Alto</option>
                <option value="CRITICO">Crítico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hostname</label>
              <input className="input w-full" {...register("hostname")} placeholder="PC-ADMIN-01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección IP</label>
              <input className="input w-full" {...register("ip_address")} placeholder="192.168.1.100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
              <input className="input w-full" {...register("mac_address")} placeholder="AA:BB:CC:DD:EE:FF" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sistema operativo</label>
              <input className="input w-full" {...register("os_name")} placeholder="Windows 11" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Versión SO</label>
              <input className="input w-full" {...register("os_version")} placeholder="23H2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Procesador</label>
              <input className="input w-full" {...register("processor")} placeholder="Intel Core i7-12700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RAM (GB)</label>
              <input type="number" className="input w-full" {...register("ram_gb", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Almacenamiento (GB)</label>
              <input type="number" className="input w-full" {...register("storage_gb", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Antivirus</label>
              <input className="input w-full" {...register("antivirus")} placeholder="Windows Defender" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Último escaneo</label>
              <input type="date" className="input w-full" {...register("last_scan_date")} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_server" className="rounded" {...register("is_server")} />
              <label htmlFor="is_server" className="text-sm text-gray-700">Es servidor</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_network_device" className="rounded" {...register("is_network_device")} />
              <label htmlFor="is_network_device" className="text-sm text-gray-700">Es dispositivo de red</label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas TI</label>
            <textarea className="input w-full h-20 resize-none" {...register("notes")} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── License Form ───────────────────────────────────────────────────────────────
function LicenseForm({ license, onClose }: { license?: SoftwareLicense; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<SoftwareLicenseFormData>({
    defaultValues: license ? {
      software_name: license.software_name,
      version: license.version,
      license_type: license.license_type,
      seats: license.seats,
      used_seats: license.used_seats,
      vendor: license.vendor,
      purchase_date: license.purchase_date ?? "",
      expiry_date: license.expiry_date ?? "",
      cost: license.cost,
      notes: license.notes,
    } : { license_type: "PERPETUA", seats: 1, used_seats: 0 },
  });

  const mutation = useMutation({
    mutationFn: (data: SoftwareLicenseFormData) =>
      license ? itApi.updateLicense(license.id, data) : itApi.createLicense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["it-licenses"] });
      toast.success(license ? "Licencia actualizada" : "Licencia creada");
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al guardar"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl my-8 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{license ? "Editar licencia" : "Nueva licencia"}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Software *</label>
              <input className="input w-full" {...register("software_name", { required: true })} placeholder="Microsoft Office 365" />
              {errors.software_name && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Versión</label>
              <input className="input w-full" {...register("version")} placeholder="2024" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select className="input w-full" {...register("license_type", { required: true })}>
                <option value="PERPETUA">Perpetua</option>
                <option value="SUSCRIPCION">Suscripción</option>
                <option value="OEM">OEM</option>
                <option value="OPEN_SOURCE">Open Source</option>
                <option value="VOLUMEN">Por volumen</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° licencias *</label>
              <input type="number" className="input w-full" {...register("seats", { required: true, min: 1, valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">En uso</label>
              <input type="number" className="input w-full" {...register("used_seats", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input className="input w-full" {...register("vendor")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
              <input type="number" step="0.01" className="input w-full" {...register("cost")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">F. compra</label>
              <input type="date" className="input w-full" {...register("purchase_date")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">F. vencimiento</label>
              <input type="date" className="input w-full" {...register("expiry_date")} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clave de licencia</label>
            <input className="input w-full font-mono text-sm" {...register("license_key")} placeholder="XXXXX-XXXXX-XXXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea className="input w-full h-16 resize-none" {...register("notes")} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ITPage() {
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
    queryKey: ["it-licenses", "all", page],
    queryFn: () => itApi.getAllLicenses({ page }).then((r) => r.data),
    enabled: tab === "licenses" && subTab === "all",
  });

  const { data: expiring } = useQuery({
    queryKey: ["it-licenses", "expiring"],
    queryFn: () => itApi.getExpiring().then((r) => r.data),
    enabled: tab === "licenses" && subTab === "expiring",
  });

  const { data: expired } = useQuery({
    queryKey: ["it-licenses", "expired"],
    queryFn: () => itApi.getExpired().then((r) => r.data),
    enabled: tab === "licenses" && subTab === "expired",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulo TI</h1>
          <p className="text-gray-500 text-sm mt-1">Inventario tecnológico y licencias de software</p>
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
                  <tr key={p.id} className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.asset_code}</td>
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
                    <td className="px-4 py-3">
                      <button className="text-xs text-blue-600 hover:underline" onClick={() => { setEditingProfile(p); setShowForm(true); }}>
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

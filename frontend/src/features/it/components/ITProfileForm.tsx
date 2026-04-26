import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, X, Plus, Trash2, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { itApi, type ITAssetProfile, type ITAssetProfileFormData, type SoftwareLicense } from "@/api/itApi";
import { AssetSearchSelect } from "@/components/shared/AssetSearchSelect";
import toast from "react-hot-toast";

// ── Panel de software instalado (solo en edición) ─────────────────────────────
function SoftwarePanel({ assetId }: { assetId: number }) {
  const qc = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  // Licencias ya asignadas a este activo
  const { data: assignedData, isLoading: loadingAssigned } = useQuery({
    queryKey: ["it-license", "asset", assetId],
    queryFn: () => itApi.getLicensesForAsset(assetId).then((r) => r.data.results),
    staleTime: 0,
  });

  // Todas las licencias disponibles (para el picker)
  const { data: allData } = useQuery({
    queryKey: ["it-license", "picker", search],
    queryFn: () =>
      itApi.getAllLicenses({ page_size: 100, search: search || undefined }).then((r) => r.data.results),
    enabled: showPicker,
    staleTime: 0,
  });

  const assignedIds = new Set((assignedData ?? []).map((l) => l.id));

  // Licencias disponibles para asignar: no asignadas aún y con asientos libres
  const available = (allData ?? []).filter(
    (l) => !assignedIds.has(l.id) && l.available_seats > 0 && !l.is_expired
  );

  const assignMutation = useMutation({
    mutationFn: (licenseId: number) => itApi.assignLicense(licenseId, assetId),
    onSuccess: (res) => {
      // Añade inmediatamente la licencia a la lista asignada SIN esperar refetch
      qc.setQueryData(
        ["it-license", "asset", assetId],
        (old: SoftwareLicense[] | undefined) =>
          old ? [...old, res.data] : [res.data],
      );
      // Elimina del picker (ya no está disponible) y actualiza la tabla global
      qc.setQueryData(
        ["it-license", "picker", search],
        (old: SoftwareLicense[] | undefined) =>
          old?.filter((l) => l.id !== res.data.id),
      );
      qc.invalidateQueries({ queryKey: ["it-license"] });
      toast.success("Software asignado — licencia descontada.");
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al asignar"),
  });

  const unassignMutation = useMutation({
    mutationFn: (licenseId: number) => itApi.unassignLicense(licenseId, assetId),
    onSuccess: (res, licenseId) => {
      // Elimina inmediatamente de la lista asignada SIN esperar refetch
      qc.setQueryData(
        ["it-license", "asset", assetId],
        (old: SoftwareLicense[] | undefined) =>
          old?.filter((l) => l.id !== licenseId),
      );
      // Devuelve la licencia al picker con asientos actualizados
      qc.setQueryData(
        ["it-license", "picker", search],
        (old: SoftwareLicense[] | undefined) =>
          old ? old.map((l) => (l.id === res.data.id ? res.data : l)) : [res.data],
      );
      qc.invalidateQueries({ queryKey: ["it-license"] });
      toast.success("Software quitado — licencia liberada.");
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Error al quitar"),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Package size={15} className="text-blue-500" />
          Software instalado
          {assignedData && assignedData.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
              {assignedData.length}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          <Plus size={13} /> Asignar software
        </button>
      </div>

      {/* Picker de software disponible */}
      {showPicker && (
        <div className="border border-blue-200 rounded-xl bg-blue-50 p-3 space-y-2">
          <input
            type="text"
            className="input-field text-sm"
            placeholder="Buscar licencia por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-44 overflow-y-auto space-y-1">
            {available.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-3">
                No hay licencias disponibles para asignar.
              </p>
            )}
            {available.map((lic) => (
              <button
                key={lic.id}
                type="button"
                onClick={() => { assignMutation.mutate(lic.id); setShowPicker(false); setSearch(""); }}
                disabled={assignMutation.isPending}
                className="w-full text-left bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-primary-400 hover:bg-primary-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{lic.software_name}</p>
                    <p className="text-xs text-gray-500">
                      {lic.version && `v${lic.version} · `}
                      {lic.license_type_display}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    lic.available_seats <= 2
                      ? "bg-orange-100 text-orange-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {lic.available_seats} disp.
                  </span>
                </div>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { setShowPicker(false); setSearch(""); }}
            className="text-xs text-gray-500 hover:text-gray-700 w-full text-center pt-1">
            Cancelar
          </button>
        </div>
      )}

      {/* Lista de software instalado */}
      {loadingAssigned && (
        <p className="text-xs text-gray-400 py-2">Cargando software...</p>
      )}
      {!loadingAssigned && assignedData?.length === 0 && (
        <div className="border border-dashed border-gray-200 rounded-xl px-4 py-5 text-center text-xs text-gray-400">
          Sin software asignado. Use "Asignar software" para agregar.
        </div>
      )}
      <div className="space-y-2">
        {assignedData?.map((lic) => (
          <LicenseRow
            key={lic.id}
            license={lic}
            onRemove={() => unassignMutation.mutate(lic.id)}
            removing={unassignMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function LicenseRow({ license: lic, onRemove, removing }: {
  license: SoftwareLicense;
  onRemove: () => void;
  removing: boolean;
}) {
  const seatsUsedPct = lic.seats > 0 ? Math.round((lic.used_seats / lic.seats) * 100) : 0;
  const almostFull = lic.available_seats <= 2 && lic.available_seats > 0;
  const full = lic.available_seats <= 0;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${
      lic.is_expired ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900 truncate">{lic.software_name}</span>
          {lic.version && <span className="text-xs text-gray-500">v{lic.version}</span>}
          <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
            {lic.license_type_display}
          </span>
          {lic.is_expired && (
            <span className="text-xs bg-red-100 text-red-700 rounded px-1.5 py-0.5 flex items-center gap-1">
              <AlertTriangle size={10} /> Vencida
            </span>
          )}
        </div>
        {/* Barra de uso de licencias */}
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                full ? "bg-red-500" : almostFull ? "bg-orange-400" : "bg-green-500"
              }`}
              style={{ width: `${seatsUsedPct}%` }}
            />
          </div>
          <span className={`text-xs font-medium shrink-0 ${
            full ? "text-red-600" : almostFull ? "text-orange-600" : "text-green-600"
          }`}>
            {lic.used_seats}/{lic.seats} en uso
          </span>
          {full ? (
            <span className="text-xs text-red-500 font-medium">Sin disp.</span>
          ) : (
            <span className="text-xs text-green-600 flex items-center gap-0.5">
              <CheckCircle size={11} /> {lic.available_seats} disp.
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="Quitar este software del activo"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ── Select de antivirus desde licencias asignadas al activo ──────────────────
function AntivirusFromLicenses({
  assetId,
  value,
  onChange,
}: {
  assetId: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["it-license", "asset", assetId],
    queryFn: () => itApi.getLicensesForAsset(assetId).then((r) => r.data.results),
    staleTime: 0,
  });

  const label = (l: { software_name: string; version: string }) =>
    l.version ? `${l.software_name} v${l.version}` : l.software_name;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Antivirus instalado
        <span className="text-xs text-gray-400 ml-1 font-normal">— desde software asignado</span>
      </label>
      <select
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      >
        <option value="">— Sin antivirus —</option>
        {licenses.map((lic) => (
          <option key={lic.id} value={label(lic)}>
            {label(lic)}{lic.is_expired ? " ⚠ Vencida" : ""}
          </option>
        ))}
        {!isLoading && licenses.length === 0 && (
          <option disabled>Agregue software primero</option>
        )}
      </select>
    </div>
  );
}

// ── Formulario principal ──────────────────────────────────────────────────────

interface FormState {
  asset?: number;
  hostname: string;
  ip_address: string;
  mac_address: string;
  os_name: string;
  os_version: string;
  processor: string;
  ram_gb: string;
  storage_gb: string;
  risk_level: string;
  is_server: boolean;
  is_network_device: boolean;
  last_scan_date: string;
  antivirus: string;
  notes: string;
}

interface Props {
  profile?: ITAssetProfile;
  onClose: () => void;
}

export function ITProfileForm({ profile, onClose }: Props) {
  const qc = useQueryClient();
  const isEditing = !!profile;

  const [form, setForm] = useState<FormState>({
    asset: profile?.asset,
    hostname: profile?.hostname ?? "",
    ip_address: profile?.ip_address ?? "",
    mac_address: profile?.mac_address ?? "",
    os_name: profile?.os_name ?? "",
    os_version: profile?.os_version ?? "",
    processor: profile?.processor ?? "",
    ram_gb: profile?.ram_gb?.toString() ?? "",
    storage_gb: profile?.storage_gb?.toString() ?? "",
    risk_level: profile?.risk_level ?? "BAJO",
    is_server: profile?.is_server ?? false,
    is_network_device: profile?.is_network_device ?? false,
    last_scan_date: profile?.last_scan_date ?? "",
    antivirus: profile?.antivirus ?? "",
    notes: profile?.notes ?? "",
  });

  const f = (key: keyof FormState, val: unknown) =>
    setForm((p) => ({ ...p, [key]: val }));

  const mutation = useMutation({
    mutationFn: (data: ITAssetProfileFormData) =>
      profile ? itApi.updateProfile(profile.id, data) : itApi.createProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["it-profiles"] });
      qc.invalidateQueries({ queryKey: ["it-assets-list"] });
      toast.success(profile ? "Perfil actualizado" : "Perfil TI creado");
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail
        ?? Object.values(err?.response?.data ?? {})[0]
        ?? "Error al guardar";
      toast.error(String(msg));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && !form.asset) {
      toast.error("Seleccione un activo.");
      return;
    }
    mutation.mutate({
      asset: form.asset!,
      hostname: form.hostname || undefined,
      ip_address: form.ip_address || undefined,
      mac_address: form.mac_address || undefined,
      os_name: form.os_name || undefined,
      os_version: form.os_version || undefined,
      processor: form.processor || undefined,
      ram_gb: form.ram_gb ? Number(form.ram_gb) : undefined,
      storage_gb: form.storage_gb ? Number(form.storage_gb) : undefined,
      risk_level: form.risk_level,
      is_server: form.is_server,
      is_network_device: form.is_network_device,
      last_scan_date: form.last_scan_date || undefined,
      antivirus: form.antivirus || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield size={18} className="text-blue-500" />
            {profile ? `Editar perfil TI — ${profile.asset_code}` : "Nuevo perfil TI"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* ── Selección de activo ── */}
          {isEditing ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <Shield size={16} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Activo vinculado</p>
                <span className="font-mono text-primary-600 font-bold">{profile.asset_code}</span>
                <span className="text-gray-700 text-sm ml-2">{profile.asset_name}</span>
                {profile.asset_serial_number && (
                  <span className="text-gray-400 text-xs ml-2 font-mono">· S/N: {profile.asset_serial_number}</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Activo <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 ml-1 font-normal">
                  — buscar por código, serie o nombre
                </span>
              </label>
              <AssetSearchSelect
                value={form.asset ?? null}
                onChange={(id) => f("asset", id ?? undefined)}
                placeholder="Buscar activo TI por código, serie o nombre..."
                extraParams={{ category: "COMPUTO,TELECOMUNICACION" }}
              />
              <p className="text-xs text-gray-400 mt-1">Solo activos de categoría Cómputo o Telecomunicaciones.</p>
            </div>
          )}

          {/* ── Riesgo operativo ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nivel de riesgo operativo *</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "BAJO",    label: "Bajo",    cls: "border-green-300 bg-green-50 text-green-700"  },
                { value: "MEDIO",   label: "Medio",   cls: "border-yellow-300 bg-yellow-50 text-yellow-700" },
                { value: "ALTO",    label: "Alto",    cls: "border-orange-300 bg-orange-50 text-orange-700" },
                { value: "CRITICO", label: "Crítico", cls: "border-red-300 bg-red-50 text-red-700"       },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => f("risk_level", opt.value)}
                  className={`py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                    form.risk_level === opt.value
                      ? `${opt.cls} ring-2 ring-offset-1 ring-current`
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Red y sistema ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hostname</label>
              <input className="input-field" value={form.hostname}
                onChange={(e) => f("hostname", e.target.value)} placeholder="PC-ADMIN-01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección IP</label>
              <input className="input-field" value={form.ip_address}
                onChange={(e) => f("ip_address", e.target.value)} placeholder="192.168.1.100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
              <input className="input-field font-mono" value={form.mac_address}
                onChange={(e) => f("mac_address", e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sistema operativo</label>
              <input className="input-field" value={form.os_name}
                onChange={(e) => f("os_name", e.target.value)} placeholder="Windows 11 Pro" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Versión SO</label>
              <input className="input-field" value={form.os_version}
                onChange={(e) => f("os_version", e.target.value)} placeholder="23H2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Procesador</label>
              <input className="input-field" value={form.processor}
                onChange={(e) => f("processor", e.target.value)} placeholder="Intel Core i7-12700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RAM (GB)</label>
              <input type="number" className="input-field" value={form.ram_gb}
                onChange={(e) => f("ram_gb", e.target.value)} placeholder="16" min={1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Almacenamiento (GB)</label>
              <input type="number" className="input-field" value={form.storage_gb}
                onChange={(e) => f("storage_gb", e.target.value)} placeholder="512" min={1} />
            </div>
          </div>

          {/* ── Seguridad ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Último escaneo de seguridad</label>
              <input type="date" className="input-field" value={form.last_scan_date}
                onChange={(e) => f("last_scan_date", e.target.value)} />
            </div>
            {/* Antivirus: se carga de las licencias asignadas al activo seleccionado */}
            {(form.asset || (isEditing && profile?.asset)) && (
              <AntivirusFromLicenses
                assetId={(isEditing ? profile!.asset : form.asset)!}
                value={form.antivirus}
                onChange={(v) => f("antivirus", v)}
              />
            )}
          </div>

          {/* ── Flags ── */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" className="rounded border-gray-300 text-primary-600 h-4 w-4"
                checked={form.is_server} onChange={(e) => f("is_server", e.target.checked)} />
              <span className="text-sm text-gray-700">Es servidor</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" className="rounded border-gray-300 text-primary-600 h-4 w-4"
                checked={form.is_network_device} onChange={(e) => f("is_network_device", e.target.checked)} />
              <span className="text-sm text-gray-700">Es dispositivo de red</span>
            </label>
          </div>

          {/* ── Notas ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas TI</label>
            <textarea className="input-field resize-none" rows={2}
              value={form.notes} onChange={(e) => f("notes", e.target.value)}
              placeholder="Observaciones técnicas relevantes..." />
          </div>

          {/* ── Software instalado: visible en edición Y en creación cuando hay activo seleccionado ── */}
          {(isEditing ? profile?.asset : form.asset) && (
            <div className="border-t border-gray-100 pt-4">
              <SoftwarePanel assetId={(isEditing ? profile!.asset : form.asset)!} />
            </div>
          )}

          {/* ── Acciones ── */}
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear perfil TI"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

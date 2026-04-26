/**
 * Formulario combinado TI — crea/edita un activo de cómputo/telecomunicación
 * y su perfil TI (hostname, IP, SO, RAM, etc.) en un solo panel.
 *
 * Flujo:
 *   1. Buscar activo por código → si existe, pre-carga datos
 *   2. Si no existe, permite crear activo nuevo
 *   3. Guarda activo + perfil TI en dos llamadas API
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Search, RefreshCw, Plus, CheckCircle, Package2, AlertCircle } from "lucide-react";
import { assetsApi } from "@/api/assetsApi";
import { itApi } from "@/api/itApi";
import type { SoftwareLicense } from "@/api/itApi";
import { locationsApi } from "@/api/locationsApi";
import { usersApi } from "@/api/usersApi";
import type { AssetType, AssetModelType } from "@/@types/asset.types";
import type { ITAssetProfileFormData } from "@/@types/it.types";
import { IT_CATEGORIES, USEFUL_LIFE } from "@/utils/assetConstants";
import { RISK_LEVELS } from "@/utils/itConstants";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AssetFormData {
  asset_code: string;
  name: string;
  category: "COMPUTO" | "TELECOMUNICACION";
  asset_model: number | null;
  serial_number: string;
  color: string;
  observations: string;
  warranty_expiry: string;
  agency: number | null;
  department: number | null;
  area: number | null;
  custodian: number | null;
  is_critical_it: boolean;
  // Financiero — no se muestra en UI de TI, se completa desde módulo Activos
  purchase_value: string;
  purchase_date: string;
}

const TODAY = new Date().toISOString().slice(0, 10);

const ASSET_INITIAL: AssetFormData = {
  asset_code: "", name: "", category: "COMPUTO",
  asset_model: null, serial_number: "", color: "", observations: "",
  warranty_expiry: "", agency: null, department: null, area: null,
  custodian: null, is_critical_it: false,
  // defaults silenciosos — el usuario completa desde módulo Activos
  purchase_value: "0.00", purchase_date: TODAY,
};

const IT_INITIAL: Omit<ITAssetProfileFormData, "asset"> = {
  hostname: "", ip_address: "", mac_address: "",
  os_name: "", os_version: "", processor: "",
  ram_gb: undefined, storage_gb: undefined,
  risk_level: "BAJO", is_server: false, is_network_device: false,
  last_scan_date: "", antivirus: "", notes: "",
};

interface Props { onClose: () => void; }

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ITAssetFormModal({ onClose }: Props) {
  const qc = useQueryClient();

  // ── Búsqueda de activo existente ──
  const [codeSearch, setCodeSearch] = useState("");
  const [foundAsset, setFoundAsset] = useState<AssetType | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  // ── Formulario activo ──
  const [assetForm, setAssetForm] = useState<AssetFormData>(ASSET_INITIAL);
  const [selectedCategory, setSelectedCategory] = useState<"COMPUTO" | "TELECOMUNICACION">("COMPUTO");
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [newBrandMode, setNewBrandMode] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newModelMode, setNewModelMode] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [assetErrors, setAssetErrors] = useState<Partial<Record<keyof AssetFormData, string>>>({});

  // ── Formulario IT ──
  const [itForm, setItForm] = useState<Omit<ITAssetProfileFormData, "asset">>(IT_INITIAL);

  // ── Softwares / licencias ──
  const [assignSoftware, setAssignSoftware] = useState(false);
  const [selectedLicenses, setSelectedLicenses] = useState<Set<number>>(new Set());
  const [initialLicenses, setInitialLicenses] = useState<Set<number>>(new Set());

  const isExistingAsset = !!foundAsset;
  const existingProfileId = foundAsset?.it_profile_id ?? null;

  // ── Queries catálogos ──
  const { data: typesData } = useQuery({
    queryKey: ["asset-types", selectedCategory],
    queryFn: () => assetsApi.getAssetTypes({ category: selectedCategory, page_size: 100 }).then(r => r.data.results),
    staleTime: 120_000,
  });

  const { data: modelsData } = useQuery({
    queryKey: ["asset-models", selectedTypeId, selectedBrandId],
    queryFn: () => assetsApi.getAssetModels({
      asset_type: selectedTypeId,
      ...(selectedBrandId ? { brand: selectedBrandId } : {}),
      page_size: 100,
    }).then(r => r.data.results),
    enabled: !!selectedTypeId,
    staleTime: 60_000,
  });

  const { data: brandsData } = useQuery({
    queryKey: ["brands"],
    queryFn: () => assetsApi.getBrands({ page_size: 100 }).then(r => r.data.results),
    staleTime: 120_000,
  });

  const { data: agenciesData } = useQuery({
    queryKey: ["agencies-select"],
    queryFn: () => locationsApi.getAgencies({ page_size: 100 }).then(r => r.data.results),
    staleTime: 60_000,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments-select", assetForm.agency],
    queryFn: () => locationsApi.getDepartments({ agency: assetForm.agency, page_size: 100 }).then(r => r.data.results),
    enabled: !!assetForm.agency,
    staleTime: 30_000,
  });

  const { data: areasData } = useQuery({
    queryKey: ["areas-select", assetForm.department],
    queryFn: () => locationsApi.getAreas({ department: assetForm.department, page_size: 100 }).then(r => r.data.results),
    enabled: !!assetForm.department,
    staleTime: 30_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-select"],
    queryFn: () => usersApi.getAll({ page_size: 200, is_active: true }).then(r => r.data.results),
    staleTime: 60_000,
  });

  // Todas las licencias disponibles
  const { data: allLicensesData } = useQuery({
    queryKey: ["all-licenses-for-assignment"],
    queryFn: () => itApi.getAllLicenses({ page_size: 200 }).then(r => r.data.results),
    staleTime: 60_000,
    enabled: assignSoftware,
  });

  // (Las licencias asignadas se cargan en handleSearchAsset para sincronizar estado)

  // ── Mutations ──
  const createBrand = useMutation({
    mutationFn: (name: string) => assetsApi.createBrand({ name }).then(r => r.data),
    onSuccess: (brand) => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      setSelectedBrandId(brand.id);
      setA("asset_model", null);
      setNewBrandMode(false); setNewBrandName("");
      toast.success(`Marca "${brand.name}" creada.`);
    },
    onError: () => toast.error("Error al crear la marca."),
  });

  const createModel = useMutation({
    mutationFn: (d: { name: string; brand: number; asset_type: number }) =>
      assetsApi.createAssetModel(d).then(r => r.data),
    onSuccess: (model: AssetModelType) => {
      qc.invalidateQueries({ queryKey: ["asset-models"] });
      setA("asset_model", model.id);
      setNewModelMode(false); setNewModelName("");
      toast.success(`Modelo "${model.name}" creado.`);
    },
    onError: () => toast.error("Error al crear el modelo."),
  });

  // ── Helpers formulario activo ──
  function setA<K extends keyof AssetFormData>(k: K, v: AssetFormData[K]) {
    setAssetForm(f => ({ ...f, [k]: v }));
    setAssetErrors(e => ({ ...e, [k]: undefined }));
  }

  function setIT<K extends keyof typeof IT_INITIAL>(k: K, v: (typeof IT_INITIAL)[K]) {
    setItForm(f => ({ ...f, [k]: v }));
  }

  // ── Auto-fill cuando cambia tipo ──
  useEffect(() => {
    if (isExistingAsset) return;
    setSelectedBrandId(null);
    setA("asset_model", null);
  }, [selectedTypeId]);

  useEffect(() => {
    if (isExistingAsset || !selectedTypeId) return;
    const tipo = typesData?.find(t => t.id === selectedTypeId);
    if (!tipo) return;
    setA("category", tipo.category as "COMPUTO" | "TELECOMUNICACION");
    fetchNextCode(selectedTypeId);
  }, [selectedTypeId]);

  // ── Auto-fill nombre desde marca+modelo ──
  useEffect(() => {
    if (isExistingAsset) return;
    const brand = brandsData?.find(b => b.id === selectedBrandId);
    const model = modelsData?.find(m => m.id === assetForm.asset_model);
    const tipo  = typesData?.find(t => t.id === selectedTypeId);
    if (brand && model) {
      setA("name", `${brand.name} ${model.name}`);
    } else if (tipo) {
      setA("name", tipo.name);
    }
  }, [assetForm.asset_model, selectedBrandId, selectedTypeId]);

  async function fetchNextCode(typeId: number) {
    setCodeLoading(true);
    try {
      const res = await assetsApi.nextCode(typeId);
      setA("asset_code", res.data.next_code);
    } catch { /* noop */ } finally {
      setCodeLoading(false);
    }
  }

  // ── Buscar activo por código ──
  async function handleSearchAsset() {
    const code = codeSearch.trim().toUpperCase();
    if (!code) return;
    setSearching(true);
    setSearchDone(false);
    try {
      const res = await assetsApi.getAll({ search: code, page_size: 5 });
      const exact = res.data.results.find(a => a.asset_code === code);
      if (exact) {
        setFoundAsset(exact);
        // Pre-cargar datos del activo
        setAssetForm({
          asset_code: exact.asset_code,
          name: exact.name,
          category: exact.category as "COMPUTO" | "TELECOMUNICACION",
          asset_model: exact.asset_model,
          serial_number: exact.serial_number ?? "",
          color: exact.color ?? "",
          observations: exact.observations ?? "",
          warranty_expiry: exact.warranty_expiry ?? "",
          agency: exact.agency, department: exact.department,
          area: exact.area, custodian: exact.custodian,
          is_critical_it: exact.is_critical_it,
          // mantener valores financieros existentes (no se muestran pero se preservan)
          purchase_value: exact.purchase_value ?? "0.00",
          purchase_date: exact.purchase_date ?? TODAY,
        });
        setSelectedCategory(exact.category as "COMPUTO" | "TELECOMUNICACION");
        // Pre-cargar perfil TI si existe
        if (exact.it_profile_id) {
          try {
            const profileRes = await itApi.getProfileById(exact.it_profile_id);
            const p = profileRes.data;
            setItForm({
              hostname: p.hostname ?? "", ip_address: p.ip_address ?? "",
              mac_address: p.mac_address ?? "", os_name: p.os_name ?? "",
              os_version: p.os_version ?? "", processor: p.processor ?? "",
              ram_gb: p.ram_gb ?? undefined, storage_gb: p.storage_gb ?? undefined,
              risk_level: p.risk_level ?? "BAJO",
              is_server: p.is_server, is_network_device: p.is_network_device,
              last_scan_date: p.last_scan_date ?? "", antivirus: p.antivirus ?? "",
              notes: p.notes ?? "",
            });
          } catch { /* sin perfil previo */ }
        }
        toast.success(`Activo ${code} encontrado — datos pre-cargados.`);
        // Cargar licencias asignadas
        try {
          const licRes = await itApi.getLicensesForAsset(exact.id);
          const ids = new Set(licRes.data.results.map((l: SoftwareLicense) => l.id));
          setInitialLicenses(ids);
          setSelectedLicenses(new Set(ids));
          if (ids.size > 0) setAssignSoftware(true);
        } catch { /* ignore */ }
      } else {
        setFoundAsset(null);
        setAssetForm({ ...ASSET_INITIAL, asset_code: code, category: "COMPUTO" });
        toast("Activo no encontrado — se creará uno nuevo.", { icon: "ℹ️" });
      }
    } catch {
      toast.error("Error al buscar activo.");
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }

  // ── Validar ──
  function validate(): boolean {
    const e: typeof assetErrors = {};
    if (!assetForm.asset_code.trim()) e.asset_code = "Código obligatorio.";
    if (!assetForm.name.trim())       e.name        = "Nombre obligatorio.";
    setAssetErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Guardar ──
  async function handleSave() {
    if (!validate()) return;
    try {
      let assetId: number;

      if (isExistingAsset) {
        // Actualizar solo campos editables del activo (no financieros)
        await assetsApi.update(foundAsset!.id, {
          name: assetForm.name,
          serial_number: assetForm.serial_number || undefined,
          color: assetForm.color || undefined,
          observations: assetForm.observations || undefined,
          warranty_expiry: assetForm.warranty_expiry || undefined,
          asset_model: assetForm.asset_model,
          agency: assetForm.agency,
          department: assetForm.department,
          area: assetForm.area,
          custodian: assetForm.custodian,
          is_critical_it: assetForm.is_critical_it,
        });
        assetId = foundAsset!.id;
      } else {
        // Crear activo nuevo con defaults financieros (se completan luego en módulo Activos)
        const res = await assetsApi.create({
          asset_code: assetForm.asset_code,
          name: assetForm.name,
          category: assetForm.category,
          asset_model: assetForm.asset_model,
          serial_number: assetForm.serial_number || undefined,
          color: assetForm.color || undefined,
          observations: assetForm.observations || undefined,
          warranty_expiry: assetForm.warranty_expiry || undefined,
          agency: assetForm.agency,
          department: assetForm.department,
          area: assetForm.area,
          custodian: assetForm.custodian,
          is_critical_it: assetForm.is_critical_it,
          purchase_value: assetForm.purchase_value,
          purchase_date: assetForm.purchase_date,
          residual_value: "0",
        });
        assetId = res.data.id;
      }

      // Crear o actualizar perfil TI
      const itPayload: ITAssetProfileFormData = { ...itForm, asset: assetId };
      if (existingProfileId) {
        await itApi.updateProfile(existingProfileId, itPayload);
      } else {
        await itApi.createProfile(itPayload);
      }

      // Aplicar cambios de licencias
      if (assignSoftware) {
        const toAdd    = [...selectedLicenses].filter(id => !initialLicenses.has(id));
        const toRemove = [...initialLicenses].filter(id => !selectedLicenses.has(id));
        await Promise.allSettled([
          ...toAdd.map(licId => itApi.assignLicense(licId, assetId)),
          ...toRemove.map(licId => itApi.unassignLicense(licId, assetId)),
        ]);
        qc.invalidateQueries({ queryKey: ["all-licenses-for-assignment"] });
        qc.invalidateQueries({ queryKey: ["asset-licenses"] });
      }

      qc.invalidateQueries({ queryKey: ["it-profiles"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success(isExistingAsset ? "Activo TI actualizado." : "Activo TI registrado.");
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data;
      const detail = typeof msg === "string" ? msg
        : msg?.detail ?? msg?.asset?.[0] ?? msg?.purchase_value?.[0]
          ?? JSON.stringify(msg) ?? "Error al guardar.";
      toast.error(detail);
    }
  }

  // Cerrar con Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const selectedType = typesData?.find(t => t.id === selectedTypeId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="h-full w-full max-w-2xl bg-white shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Activo TI — Registro Completo</h2>
            <p className="text-xs text-gray-400 mt-0.5">Activo de cómputo / telecomunicación + perfil TI (hostname, IP, SO, normativa)</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

          {/* ── 1. Buscar activo existente ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Buscar activo existente (opcional)
            </h3>
            <div className="flex gap-2">
              <input
                className="input-field flex-1 font-mono"
                placeholder="Ej. PC-001"
                value={codeSearch}
                onChange={e => setCodeSearch(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleSearchAsset()}
              />
              <button
                type="button"
                onClick={handleSearchAsset}
                disabled={searching}
                className="btn-secondary flex items-center gap-2 px-4"
              >
                <Search size={14} className={searching ? "animate-pulse" : ""} />
                Buscar
              </button>
            </div>
            {searchDone && foundAsset && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle size={14} />
                <span>Activo <strong>{foundAsset.asset_code}</strong> — {foundAsset.name}
                  {foundAsset.it_profile_id ? " · Tiene perfil TI (editando)" : " · Sin perfil TI aún (creando)"}
                </span>
              </div>
            )}
            {searchDone && !foundAsset && (
              <p className="mt-2 text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                Código no encontrado — se creará un nuevo activo.
              </p>
            )}
          </section>

          {/* ── 2. Clasificación del activo ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Clasificación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  className="input-field"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value as "COMPUTO" | "TELECOMUNICACION")}
                  disabled={isExistingAsset}
                >
                  {IT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select
                  className="input-field"
                  value={selectedTypeId ?? ""}
                  onChange={e => setSelectedTypeId(e.target.value ? Number(e.target.value) : null)}
                  disabled={isExistingAsset}
                >
                  <option value="">— Seleccione —</option>
                  {typesData?.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.code_prefix ? ` (${t.code_prefix})` : ""}</option>
                  ))}
                </select>
                {selectedType && (
                  <p className="text-xs text-primary-600 mt-0.5">
                    Vida útil sugerida: {USEFUL_LIFE[selectedType.category]} años
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── 3. Marca y Modelo ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Marca y Modelo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                {!newBrandMode ? (
                  <div className="flex gap-2">
                    <select className="input-field flex-1" value={selectedBrandId ?? ""}
                      onChange={e => { setSelectedBrandId(e.target.value ? Number(e.target.value) : null); setA("asset_model", null); }}
                      disabled={isExistingAsset}>
                      <option value="">— Sin marca —</option>
                      {brandsData?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {!isExistingAsset && (
                      <button type="button" onClick={() => setNewBrandMode(true)}
                        className="btn-secondary px-3 text-xs flex items-center gap-1"><Plus size={13} /></button>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input autoFocus className="input-field flex-1" placeholder="Nombre de la marca"
                      value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
                    <button type="button" disabled={!newBrandName.trim() || createBrand.isPending}
                      onClick={() => createBrand.mutate(newBrandName.trim())}
                      className="btn-primary px-3 text-xs">{createBrand.isPending ? "..." : "Crear"}</button>
                    <button type="button" onClick={() => { setNewBrandMode(false); setNewBrandName(""); }}
                      className="btn-secondary px-2 text-xs"><X size={13} /></button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                {!newModelMode ? (
                  <div className="flex gap-2">
                    <select className="input-field flex-1" value={assetForm.asset_model ?? ""}
                      onChange={e => setA("asset_model", e.target.value ? Number(e.target.value) : null)}
                      disabled={!selectedTypeId || isExistingAsset}>
                      <option value="">— Sin modelo —</option>
                      {modelsData?.map((m: AssetModelType) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {selectedTypeId && !isExistingAsset && (
                      <button type="button" onClick={() => setNewModelMode(true)}
                        className="btn-secondary px-3 text-xs flex items-center gap-1"><Plus size={13} /></button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input autoFocus className="input-field" placeholder="Nombre del modelo"
                      value={newModelName} onChange={e => setNewModelName(e.target.value)} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setNewModelMode(false); setNewModelName(""); }}
                        className="btn-secondary text-xs flex-1">Cancelar</button>
                      <button type="button"
                        disabled={!newModelName.trim() || !selectedTypeId || createModel.isPending}
                        onClick={() => selectedTypeId && createModel.mutate({
                          name: newModelName.trim(),
                          brand: selectedBrandId ?? (brandsData?.[0]?.id ?? 0),
                          asset_type: selectedTypeId,
                        })}
                        className="btn-primary text-xs flex-1">
                        {createModel.isPending ? "Creando..." : "Crear"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── 4. Identificación ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identificación</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <div className="relative">
                  <input
                    className={`input-field pr-8 font-mono ${assetErrors.asset_code ? "border-red-400" : ""}`}
                    value={assetForm.asset_code}
                    onChange={e => setA("asset_code", e.target.value.toUpperCase())}
                    disabled={isExistingAsset}
                    placeholder="PC-001"
                  />
                  {!isExistingAsset && selectedTypeId && (
                    <button type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
                      onClick={() => fetchNextCode(selectedTypeId!)}>
                      <RefreshCw size={13} className={codeLoading ? "animate-spin" : ""} />
                    </button>
                  )}
                </div>
                {assetErrors.asset_code && <p className="text-xs text-red-500 mt-1">{assetErrors.asset_code}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° de Serie</label>
                <input className="input-field font-mono" value={assetForm.serial_number}
                  onChange={e => setA("serial_number", e.target.value)} placeholder="SN..." />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre * <span className="text-xs font-normal text-gray-400">(auto-generado, editable)</span>
                </label>
                <input className={`input-field bg-gray-50 ${assetErrors.name ? "border-red-400" : ""}`}
                  value={assetForm.name} onChange={e => setA("name", e.target.value)} />
                {assetErrors.name && <p className="text-xs text-red-500 mt-1">{assetErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input className="input-field" value={assetForm.color}
                  onChange={e => setA("color", e.target.value)} placeholder="Negro, plateado..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Garantía hasta</label>
                <input type="date" className="input-field" value={assetForm.warranty_expiry}
                  onChange={e => setA("warranty_expiry", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea className="input-field resize-none" rows={2} value={assetForm.observations}
                  onChange={e => setA("observations", e.target.value)} placeholder="Notas adicionales..." />
              </div>
            </div>
          </section>

          {/* ── 5. Ubicación ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ubicación y custodio</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agencia</label>
                <select className="input-field" value={assetForm.agency ?? ""}
                  onChange={e => { setA("agency", e.target.value ? Number(e.target.value) : null); setA("department", null); setA("area", null); }}>
                  <option value="">— Sin asignar —</option>
                  {agenciesData?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                <select className="input-field" value={assetForm.department ?? ""}
                  onChange={e => { setA("department", e.target.value ? Number(e.target.value) : null); setA("area", null); }}
                  disabled={!assetForm.agency}>
                  <option value="">— Seleccione agencia —</option>
                  {departmentsData?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                <select className="input-field" value={assetForm.area ?? ""}
                  onChange={e => setA("area", e.target.value ? Number(e.target.value) : null)}
                  disabled={!assetForm.department}>
                  <option value="">— Sin área —</option>
                  {areasData?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custodio</label>
                <select className="input-field" value={assetForm.custodian ?? ""}
                  onChange={e => setA("custodian", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— Sin custodio —</option>
                  {usersData?.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* ── 6. Perfil TI — Normativa ── */}
          <section className="border-t-2 border-primary-100 pt-6" id="it-section">
            <h3 className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1">
              Perfil TI — Inventario Tecnológico
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Campos requeridos por Superintendencia de Bancos / SEPS para activos de cómputo.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hostname</label>
                <input className="input-field font-mono" value={itForm.hostname ?? ""}
                  onChange={e => setIT("hostname", e.target.value)} placeholder="PC-SISTEMAS-01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección IP</label>
                <input className="input-field font-mono" value={itForm.ip_address ?? ""}
                  onChange={e => setIT("ip_address", e.target.value)} placeholder="192.168.1.100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
                <input className="input-field font-mono" value={itForm.mac_address ?? ""}
                  onChange={e => setIT("mac_address", e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de riesgo</label>
                <select className="input-field" value={itForm.risk_level}
                  onChange={e => setIT("risk_level", e.target.value)}>
                  {RISK_LEVELS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sistema Operativo</label>
                <input className="input-field" value={itForm.os_name ?? ""}
                  onChange={e => setIT("os_name", e.target.value)} placeholder="Windows 11 Pro" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Versión SO</label>
                <input className="input-field font-mono" value={itForm.os_version ?? ""}
                  onChange={e => setIT("os_version", e.target.value)} placeholder="22H2 - Build 22621" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Procesador</label>
                <input className="input-field" value={itForm.processor ?? ""}
                  onChange={e => setIT("processor", e.target.value)} placeholder="Intel Core i7-12700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RAM (GB)</label>
                <input type="number" min="1" className="input-field" value={itForm.ram_gb ?? ""}
                  onChange={e => setIT("ram_gb", e.target.value ? Number(e.target.value) : undefined)} placeholder="16" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Almacenamiento (GB)</label>
                <input type="number" min="1" className="input-field" value={itForm.storage_gb ?? ""}
                  onChange={e => setIT("storage_gb", e.target.value ? Number(e.target.value) : undefined)} placeholder="512" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Antivirus</label>
                <input className="input-field" value={itForm.antivirus ?? ""}
                  onChange={e => setIT("antivirus", e.target.value)} placeholder="Windows Defender, ESET..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Último escaneo de seguridad</label>
                <input type="date" className="input-field" value={itForm.last_scan_date ?? ""}
                  onChange={e => setIT("last_scan_date", e.target.value)} />
              </div>
              <div className="flex gap-4 items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                  <input type="checkbox" className="rounded" checked={itForm.is_server ?? false}
                    onChange={e => setIT("is_server", e.target.checked)} />
                  Es servidor
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                  <input type="checkbox" className="rounded" checked={itForm.is_network_device ?? false}
                    onChange={e => setIT("is_network_device", e.target.checked)} />
                  Dispositivo de red
                </label>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas TI</label>
                <textarea className="input-field resize-none" rows={2} value={itForm.notes ?? ""}
                  onChange={e => setIT("notes", e.target.value)} />
              </div>
            </div>
          </section>

          {/* ── Softwares y Licencias ── */}
          <section>
            <label className="flex items-center gap-3 cursor-pointer select-none mb-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={assignSoftware}
                onChange={e => setAssignSoftware(e.target.checked)}
              />
              <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Package2 size={15} className="text-primary-500" />
                Asignar Softwares y Licencias
              </span>
            </label>

            {assignSoftware && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Resumen de selección */}
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between text-xs text-gray-500">
                  <span>{selectedLicenses.size} software{selectedLicenses.size !== 1 ? "s" : ""} seleccionado{selectedLicenses.size !== 1 ? "s" : ""}</span>
                  {selectedLicenses.size > 0 && (
                    <button type="button" onClick={() => setSelectedLicenses(new Set())}
                      className="text-red-500 hover:text-red-700">Limpiar selección</button>
                  )}
                </div>

                {/* Lista de licencias */}
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {!allLicensesData && (
                    <div className="px-4 py-3 text-sm text-gray-400">Cargando catálogo de software...</div>
                  )}
                  {allLicensesData?.map((lic: SoftwareLicense) => {
                    const isSelected = selectedLicenses.has(lic.id);
                    const isAlreadyAssigned = initialLicenses.has(lic.id);
                    // Si no está asignado y no hay asientos disponibles, deshabilitar
                    const noSeatsLeft = !isAlreadyAssigned && lic.available_seats <= 0;

                    return (
                      <label key={lic.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          noSeatsLeft ? "opacity-50 cursor-not-allowed bg-gray-50"
                          : isSelected ? "bg-primary-50" : "hover:bg-gray-50"
                        }`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={isSelected}
                          disabled={noSeatsLeft}
                          onChange={(e) => {
                            const next = new Set(selectedLicenses);
                            if (e.target.checked) next.add(lic.id); else next.delete(lic.id);
                            setSelectedLicenses(next);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-800">{lic.software_name}</span>
                            {lic.version && <span className="text-xs text-gray-400">v{lic.version}</span>}
                            {lic.is_expired && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <AlertCircle size={10} /> Expirada
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {lic.license_type_display}
                            {lic.vendor && ` · ${lic.vendor}`}
                          </div>
                        </div>
                        {/* Contador de licencias */}
                        <div className="text-right text-xs shrink-0">
                          <div className={`font-semibold ${lic.available_seats === 0 ? "text-red-600" : "text-green-600"}`}>
                            {lic.available_seats} disp.
                          </div>
                          <div className="text-gray-400">
                            {lic.used_seats}/{lic.seats} en uso
                          </div>
                        </div>
                      </label>
                    );
                  })}
                  {allLicensesData?.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      No hay licencias registradas. Agréguelas desde el módulo TI → Licencias.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} className="btn-primary flex-1">
            {isExistingAsset ? "Actualizar activo TI" : "Registrar activo TI"}
          </button>
        </div>
      </div>
    </div>
  );
}

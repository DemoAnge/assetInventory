/**
 * Modal de creación / edición de activos.
 * - Tipo de activo desde catálogo (AssetType) con búsqueda
 * - Modelo comercial (AssetModel) filtrado por tipo, con opción de crear nuevo
 * - Código automático consultado al backend según el tipo seleccionado
 * - Cascada: AgencyType → Department → Area → Custodian
 */
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, RefreshCw, Plus } from "lucide-react";
import { useCreateAsset, useUpdateAsset, useAddComponent } from "@/hooks/useAssets";
import { useAssetChoices } from "@/hooks/useAssetChoices";
import { locationsApi } from "@/api/locationsApi";
import { custodiansApi } from "@/api/custodiansApi";
import { assetsApi } from "@/api/assetsApi";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type {
  AssetType, AssetFormType, AssetStatus, AssetModelType, ComponentType, AccountCodeType,
} from "@/@types/asset.types";
import { USEFUL_LIFE } from "@/utils/assetConstants";
import toast from "react-hot-toast";

function AccountCodeSelect({
  value, onChange, onAutoFill,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  onAutoFill?: (ac: AccountCodeType | null) => void;
}) {
  const { data } = useQuery({
    queryKey: ["account-codes-select"],
    queryFn:  () => assetsApi.getAccountCodes({ is_active: true, page_size: 200 }).then(r => r.data.results),
    staleTime: 60_000,
  });
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : null;
    onChange(id);
    if (onAutoFill) {
      const ac = id ? (data?.find(x => x.id === id) ?? null) : null;
      onAutoFill(ac);
    }
  };
  return (
    <select className="input-field" value={value ?? ""} onChange={handleChange}>
      <option value="">— Sin cuenta —</option>
      {data?.map(ac => (
        <option key={ac.id} value={ac.id}>{ac.code} — {ac.name}</option>
      ))}
    </select>
  );
}

interface Props {
  asset?: AssetType;
  parentAsset?: AssetType;
  onClose: () => void;
}

type FormState = Omit<AssetFormType, "brand" | "model_name">;

const INITIAL: FormState = {
  asset_code: "", name: "", category: "COMPUTO",
  status: "ACTIVO", asset_model: null, color: "",
  observations: "", serial_number: "",
  purchase_value: "", residual_value: "0",
  purchase_date: new Date().toISOString().slice(0, 10),
  activation_date: "", warranty_expiry: "",
  useful_life_years: 3,
  depreciation_rate: "33.33",
  account_code: null,
  invoice_number: "", supplier: "",
  agency: null, department: null, area: null, custodian: null,
  is_critical_it: false,
  parent_asset: null, component_type: null,
};

export function AssetFormModal({ asset, parentAsset, onClose }: Props) {
  const isEdit = !!asset;
  const isComponent = !!parentAsset;
  const [form, setForm] = useState<FormState>(() => {
    if (!asset && !parentAsset) return INITIAL;
    if (!asset && parentAsset) return {
      ...INITIAL,
      category: parentAsset.category,
      useful_life_years: USEFUL_LIFE[parentAsset.category] ?? 5,
      asset_model: parentAsset.asset_model ?? null,
      agency: parentAsset.agency,
      department: parentAsset.department,
      area: parentAsset.area,
      custodian: parentAsset.custodian,
      parent_asset: parentAsset.id,
      component_type: "OTRO",
    };
    const a = asset!;
    return {
      asset_code: a.asset_code, name: a.name,
      category: a.category, status: a.status,
      asset_model: a.asset_model ?? null,
      color: a.color ?? "", observations: a.observations ?? "",
      serial_number: a.serial_number ?? "",
      purchase_value: a.purchase_value,
      residual_value: a.residual_value ?? "0",
      purchase_date: a.purchase_date,
      activation_date: a.activation_date ?? "",
      warranty_expiry: a.warranty_expiry ?? "",
      useful_life_years: a.useful_life_years ?? 3,
      depreciation_rate: a.depreciation_rate ?? null,
      account_code: a.account_code ?? null,
      invoice_number: a.invoice_number ?? "",
      supplier: a.supplier ?? "",
      agency: a.agency, department: a.department,
      area: a.area, custodian: a.custodian,
      is_critical_it: a.is_critical_it,
      parent_asset: a.parent_asset ?? null,
      component_type: a.component_type ?? null,
    };
  });

  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => asset?.category ?? parentAsset?.category ?? ""
  );
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [codeLoading, setCodeLoading] = useState(false);
  // Para crear nueva marca al vuelo
  const [newBrandMode, setNewBrandMode] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  // Para crear nuevo modelo al vuelo
  const [newModelMode, setNewModelMode] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const qc = useQueryClient();

  const create = useCreateAsset();
  const update = useUpdateAsset(asset?.id ?? 0);
  const addComponent = useAddComponent(parentAsset?.id ?? 0);
  const { componentTypes, assetCategories } = useAssetChoices();

  // ── Catálogos ────────────────────────────────────────────────────────────
  const { data: typesData } = useQuery({
    queryKey: ["asset-types", selectedCategory],
    queryFn: () => assetsApi.getAssetTypes({
      ...(selectedCategory ? { category: selectedCategory } : {}),
      page_size: 100,
    }).then(r => r.data.results),
    staleTime: 120_000,
  });

  const { data: modelsData } = useQuery({
    queryKey: ["asset-models", selectedBrandId],
    queryFn: () => assetsApi.getAssetModels({
      ...(selectedBrandId ? { brand: selectedBrandId } : {}),
      page_size: 100,
    }).then(r => r.data.results),
    enabled: !!selectedBrandId,
    staleTime: 60_000,
  });

  const { data: brandsData } = useQuery({
    queryKey: ["brands"],
    queryFn: () => assetsApi.getBrands({ page_size: 100 }).then(r => r.data.results),
    staleTime: 120_000,
  });

  // Todos los tipos (sin filtro de categoría) — necesario para lookup por component_type
  const { data: allTypesData } = useQuery({
    queryKey: ["asset-types", "all"],
    queryFn: () => assetsApi.getAssetTypes({ page_size: 200 }).then(r => r.data.results),
    staleTime: 120_000,
    enabled: isComponent,
  });

  const { data: agenciesData } = useQuery({
    queryKey: ["agencies-select"],
    queryFn: () => locationsApi.getAgencies({ page_size: 100 }).then(r => r.data.results),
    staleTime: 60_000,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments-select", form.agency],
    queryFn: () => locationsApi.getDepartments({ agency: form.agency, page_size: 100 }).then(r => r.data.results),
    enabled: !!form.agency,
    staleTime: 30_000,
  });

  const { data: areasData } = useQuery({
    queryKey: ["areas-select", form.department],
    queryFn: () => locationsApi.getAreas({ department: form.department, page_size: 100 }).then(r => r.data.results),
    enabled: !!form.department,
    staleTime: 30_000,
  });

  const { data: custodiansData } = useQuery({
    queryKey: ["custodians-select"],
    queryFn: () => custodiansApi.getAll({ page_size: 200, is_active: true }).then(r => r.data.results),
    staleTime: 60_000,
  });

  // Mutation para crear nueva marca
  const createBrand = useMutation({
    mutationFn: (name: string) => assetsApi.createBrand({ name }).then(r => r.data),
    onSuccess: (brand) => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      setSelectedBrandId(brand.id);
      set("asset_model", null);
      setNewBrandMode(false);
      setNewBrandName("");
      toast.success(`Marca "${brand.name}" creada.`);
    },
    onError: () => toast.error("Error al crear la marca."),
  });

  // Mutation para crear nuevo modelo
  const createModel = useMutation({
    mutationFn: (data: { name: string; brand: number }) =>
      assetsApi.createAssetModel(data).then(r => r.data),
    onSuccess: (model: AssetModelType) => {
      qc.invalidateQueries({ queryKey: ["asset-models"] });
      set("asset_model", model.id);
      setNewModelMode(false);
      setNewModelName("");
      toast.success(`Modelo "${model.name}" creado.`);
    },
    onError: () => toast.error("Error al crear el modelo."),
  });

  // ── Init desde asset en edición ──────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !asset) return;
    setSelectedCategory(asset.category);
  }, [isEdit, asset?.category]);

  useEffect(() => {
    if (!isEdit || !modelsData || !asset?.asset_model) return;
    const model = modelsData.find(m => m.id === asset.asset_model);
    if (model) {
      setSelectedTypeId(model.asset_type);
      setSelectedBrandId(model.brand);
    }
  }, [isEdit, modelsData]);

  // ── Pre-cargar marca del padre (solo componentes) ────────────────────────
  useEffect(() => {
    if (!isComponent || !brandsData || !parentAsset?.brand_name || selectedBrandId) return;
    const brand = brandsData.find(b => b.name === parentAsset.brand_name);
    if (brand) setSelectedBrandId(brand.id);
  }, [brandsData, isComponent]);

  // ── Al cambiar tipo de componente: buscar AssetType por component_type_link y generar código ─────
  useEffect(() => {
    if (!isComponent || !form.component_type || !allTypesData) return;
    const tipo = allTypesData.find(t => t.component_type_link === form.component_type);
    if (tipo && tipo.id !== selectedTypeId) {
      setSelectedTypeId(tipo.id);
      setSelectedCategory(tipo.category);
    }
  }, [form.component_type, allTypesData]);

  // ── Al cambiar categoría: reset tipo y modelo (NO aplica para componentes) ──
  useEffect(() => {
    if (isEdit || isComponent) return;
    setSelectedTypeId(null);
    setSelectedBrandId(null);
    set("asset_model", null);
  }, [selectedCategory]);

  // ── Auto-fill al cambiar tipo ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTypeId || isEdit) return;
    const tipo = (isComponent ? allTypesData : typesData)?.find(t => t.id === selectedTypeId);
    if (!tipo) return;
    setForm(f => ({
      ...f,
      category: tipo.category,
      useful_life_years: USEFUL_LIFE[tipo.category] ?? 5,
      // En modo componente conservar marca y modelo del padre; en activo normal limpiar
      ...(isComponent ? {} : { asset_model: null }),
    }));
    if (!isComponent) setSelectedBrandId(null);
    fetchNextCode(selectedTypeId);
  }, [selectedTypeId]);

  // Auto-llenar nombre cuando cambia marca/modelo/tipo
  // Si el tipo es "Otros"/"Otro", no se auto-llena para que el usuario lo escriba
  useEffect(() => {
    if (isEdit) return;
    const brand = brandsData?.find(b => b.id === selectedBrandId);
    const model = modelsData?.find(m => m.id === form.asset_model);
    const tipo  = typesData?.find(t => t.id === selectedTypeId);
    const isOtros = tipo?.name?.toLowerCase().startsWith("otro");
    if (isOtros) {
      setForm(f => ({ ...f, name: "" })); // dejar en blanco para que el usuario escriba
      return;
    }
    if (brand && model) {
      setForm(f => ({ ...f, name: `${brand.name} ${model.name}` }));
    } else if (tipo && !brand) {
      setForm(f => ({ ...f, name: `${tipo.name}` }));
    }
  }, [form.asset_model, selectedBrandId, selectedTypeId]);

  async function fetchNextCode(typeId: number) {
    setCodeLoading(true);
    try {
      const res = await assetsApi.nextCode(typeId);
      setForm(f => ({ ...f, asset_code: res.data.next_code }));
    } catch {
      // ignore
    } finally {
      setCodeLoading(false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.asset_code.trim())  e.asset_code     = "Seleccione el tipo para generar el código.";
    if (!form.name.trim())        e.name           = "Nombre obligatorio.";
    if (!form.purchase_value)     e.purchase_value = "Valor de compra obligatorio.";
    if (!form.purchase_date)      e.purchase_date  = "Fecha de compra obligatoria.";
    if (parseFloat(form.purchase_value) <= 0) e.purchase_value = "Debe ser mayor a 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function capitalize(s: string | undefined): string | undefined {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: AssetFormType = {
      ...form,
      name:            capitalize(form.name)!,
      color:           capitalize(form.color)           || undefined,
      observations:    capitalize(form.observations)    || undefined,
      supplier:        capitalize(form.supplier)        || undefined,
      serial_number:   form.serial_number   || undefined,
      invoice_number:  form.invoice_number  || undefined,
      activation_date: form.activation_date || undefined,
      warranty_expiry: form.warranty_expiry || undefined,
    };
    if (isEdit) {
      update.mutate(payload, { onSuccess: onClose });
    } else if (isComponent) {
      addComponent.mutate(payload, { onSuccess: onClose });
    } else {
      create.mutate(payload, { onSuccess: onClose });
    }
  }

  const isPending = create.isPending || update.isPending || addComponent.isPending;

  // Cerrar con Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const selectedType = typesData?.find(t => t.id === selectedTypeId);
  const isOtrosType = selectedType?.name?.toLowerCase().startsWith("otro") ?? false;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-end z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="h-full w-full max-w-2xl bg-white shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit
              ? `Editar — ${asset.asset_code}`
              : isComponent
                ? `Nuevo Componente de ${parentAsset.asset_code}`
                : "Nuevo Activo"
            }
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-8">

            {/* ── 1. Clasificación ── */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Clasificación
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Tipo de componente — solo visible si es componente */}
                {isComponent && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de componente <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input-field"
                      value={form.component_type ?? "OTRO"}
                      onChange={e => set("component_type", e.target.value as ComponentType)}
                    >
                      {componentTypes.map(ct => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input-field"
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                  >
                    <option value="">— Seleccione categoría —</option>
                    {assetCategories.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo específico */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input-field"
                    value={selectedTypeId ?? ""}
                    onChange={e => setSelectedTypeId(e.target.value ? Number(e.target.value) : null)}
                    disabled={!selectedCategory}
                  >
                    <option value="">— Seleccione tipo —</option>
                    {typesData?.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.code_prefix ? ` (${t.code_prefix})` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedType && (
                    <p className="text-xs text-primary-600 mt-1">
                      Vida útil sugerida: {USEFUL_LIFE[selectedType.category]} años
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ── 2. Marca y Modelo ── */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Marca y Modelo
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Marca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  {!newBrandMode ? (
                    <div className="flex gap-2">
                      <select
                        className="input-field flex-1"
                        value={selectedBrandId ?? ""}
                        onChange={e => {
                          setSelectedBrandId(e.target.value ? Number(e.target.value) : null);
                          set("asset_model", null);
                        }}
                      >
                        <option value="">— Sin marca —</option>
                        {brandsData?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setNewBrandMode(true)}
                        className="btn-secondary px-3 text-xs flex items-center gap-1" title="Nueva marca">
                        <Plus size={13} />
                      </button>
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

                {/* Modelo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  {!newModelMode ? (
                    <div className="flex gap-2">
                      <select
                        className="input-field flex-1"
                        value={form.asset_model ?? ""}
                        onChange={e => set("asset_model", e.target.value ? Number(e.target.value) : null)}
                        disabled={!selectedTypeId}
                      >
                        <option value="">— Sin modelo —</option>
                        {modelsData?.map((m: AssetModelType) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      {selectedTypeId && (
                        <button type="button" onClick={() => setNewModelMode(true)}
                          className="btn-secondary px-3 text-xs flex items-center gap-1" title="Nuevo modelo">
                          <Plus size={13} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input autoFocus className="input-field" placeholder="Nombre del modelo (ej. Latitude 5540)"
                        value={newModelName} onChange={e => setNewModelName(e.target.value)} />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setNewModelMode(false); setNewModelName(""); }}
                          className="btn-secondary text-xs flex-1">Cancelar</button>
                        <button type="button"
                          disabled={!newModelName.trim() || !selectedBrandId || createModel.isPending}
                          onClick={() => {
                            if (newModelName.trim() && selectedBrandId) {
                              createModel.mutate({
                                name: newModelName.trim(),
                                brand: selectedBrandId,
                              });
                            }
                          }}
                          className="btn-primary text-xs flex-1">
                          {createModel.isPending ? "Creando..." : "Crear modelo"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── 3. Identificación ── */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Identificación
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      className={`input-field pr-8 font-mono bg-gray-50 cursor-not-allowed ${errors.asset_code ? "border-red-400" : ""}`}
                      value={form.asset_code}
                      readOnly
                      placeholder={selectedTypeId ? (codeLoading ? "Generando..." : "—") : "Seleccione el tipo"}
                    />
                    {!isEdit && selectedTypeId && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
                        onClick={() => fetchNextCode(selectedTypeId!)}
                        title="Regenerar código"
                      >
                        <RefreshCw size={13} className={codeLoading ? "animate-spin" : ""} />
                      </button>
                    )}
                  </div>
                  {errors.asset_code && <p className="text-xs text-red-500 mt-1">{errors.asset_code}</p>}
                  {!isEdit && (
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedTypeId
                        ? "Código auto-generado — no editable."
                        : "Se generará automáticamente al seleccionar el tipo."}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° de Serie</label>
                  <input
                    className="input-field font-mono"
                    value={form.serial_number ?? ""}
                    onChange={e => set("serial_number", e.target.value)}
                    placeholder="SN1234567"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                    {isOtrosType
                      ? <span className="text-xs font-normal text-primary-600 ml-2">Ingrese un nombre descriptivo</span>
                      : <span className="text-xs font-normal text-gray-400 ml-2">(auto-generado, editable)</span>
                    }
                  </label>
                  <input
                    className={`input-field ${isOtrosType ? "" : "bg-gray-50"} ${errors.name ? "border-red-400" : ""}`}
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    placeholder={isOtrosType
                      ? "Ej: Silla ejecutiva negra, Mesa de trabajo 1..."
                      : "Se genera automáticamente al elegir marca y modelo"
                    }
                    autoFocus={isOtrosType}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <textarea
                    className="input-field resize-none"
                    rows={2}
                    value={form.observations}
                    onChange={e => set("observations", e.target.value)}
                    placeholder="Notas, características adicionales..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    className="input-field"
                    value={form.color}
                    onChange={e => set("color", e.target.value)}
                    placeholder="Negro, plateado..."
                  />
                </div>

                {isEdit && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      className="input-field"
                      value={form.status}
                      onChange={e => set("status", e.target.value as AssetStatus)}
                    >
                      <option value="ACTIVO">Activo</option>
                      <option value="INACTIVO">Inactivo</option>
                      <option value="MANTENIMIENTO">En mantenimiento</option>
                      <option value="PRESTADO">Prestado</option>
                    </select>
                  </div>
                )}

              </div>
            </section>

            {/* ── 4. Ubicación ── */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Ubicación y custodio
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agencia</label>
                  <SearchableSelect
                    options={(agenciesData ?? []).map(a => ({ value: a.id, label: a.name }))}
                    value={form.agency}
                    onChange={id => { set("agency", id); set("department", null); set("area", null); }}
                    placeholder="Buscar agencia..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                  <SearchableSelect
                    options={(departmentsData ?? []).map(d => ({ value: d.id, label: d.name }))}
                    value={form.department}
                    onChange={id => { set("department", id); set("area", null); }}
                    placeholder={form.agency ? "Buscar departamento..." : "— Seleccione agencia —"}
                    disabled={!form.agency}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                  <SearchableSelect
                    options={(areasData ?? []).map(a => ({ value: a.id, label: a.name }))}
                    value={form.area}
                    onChange={id => set("area", id)}
                    placeholder={form.department ? "Buscar área..." : "— Seleccione departamento —"}
                    disabled={!form.department}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custodio</label>
                  <SearchableSelect
                    options={(custodiansData ?? []).map(c => ({ value: c.id, label: `${c.full_name}${c.position ? ` — ${c.position}` : ""}` }))}
                    value={form.custodian}
                    onChange={id => set("custodian", id)}
                    placeholder="Buscar custodio..."
                  />
                </div>
              </div>
            </section>

            {/* ── 5. Datos financieros ── */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Datos financieros
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor de compra ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" step="0.01" min="0.01"
                    className={`input-field ${errors.purchase_value ? "border-red-400" : ""}`}
                    value={form.purchase_value}
                    onChange={e => set("purchase_value", e.target.value)}
                    placeholder="0.00"
                  />
                  {errors.purchase_value && <p className="text-xs text-red-500 mt-1">{errors.purchase_value}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor residual ($)</label>
                  <input
                    type="number" step="0.01" min="0"
                    className="input-field"
                    value={form.residual_value}
                    onChange={e => set("residual_value", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de compra <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={`input-field ${errors.purchase_date ? "border-red-400" : ""}`}
                    value={form.purchase_date}
                    onChange={e => set("purchase_date", e.target.value)}
                  />
                  {errors.purchase_date && <p className="text-xs text-red-500 mt-1">{errors.purchase_date}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de activación</label>
                  <input
                    type="date" className="input-field"
                    value={form.activation_date ?? ""}
                    onChange={e => set("activation_date", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Factura</label>
                  <input
                    className="input-field"
                    value={form.invoice_number}
                    onChange={e => set("invoice_number", e.target.value)}
                    placeholder="001-001-000123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input
                    className="input-field"
                    value={form.supplier}
                    onChange={e => set("supplier", e.target.value)}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venc. garantía</label>
                  <input
                    type="date" className="input-field"
                    value={form.warranty_expiry ?? ""}
                    onChange={e => set("warranty_expiry", e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* ── 5. Depreciación y cuenta contable ── */}
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Depreciación
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vida útil (años)</label>
                  <input
                    type="number" min="1" max="50" className="input-field"
                    value={form.useful_life_years ?? ""}
                    onChange={e => {
                      const years = e.target.value ? Number(e.target.value) : null;
                      setForm(f => ({
                        ...f,
                        useful_life_years: years ?? undefined,
                        depreciation_rate: years ? String((100 / years).toFixed(2)) : f.depreciation_rate,
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tasa de depreciación (%)
                    <span className="text-xs font-normal text-gray-400 ml-1">(auto-calculada, editable)</span>
                  </label>
                  <input
                    type="number" min="0" max="100" step="0.01" className="input-field"
                    value={form.depreciation_rate ?? ""}
                    onChange={e => set("depreciation_rate", e.target.value || null)}
                    placeholder="Ej: 33.33"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuenta contable
                    <span className="text-xs font-normal text-gray-400 ml-1">(opcional)</span>
                  </label>
                  <AccountCodeSelect
                    value={form.account_code ?? null}
                    onChange={v => set("account_code", v)}
                    onAutoFill={ac => {
                      if (ac?.useful_life_years) {
                        setForm(f => ({
                          ...f,
                          useful_life_years: ac.useful_life_years!,
                          depreciation_rate: ac.depreciation_rate
                            ?? String((100 / ac.useful_life_years!).toFixed(2)),
                        }));
                      }
                    }}
                  />
                </div>
              </div>
            </section>

            {/* ── 6. Flags ── */}
            <section>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={form.is_critical_it}
                  onChange={e => set("is_critical_it", e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">
                  Activo crítico de TI
                  <span className="ml-2 text-xs text-gray-400 font-normal">(atención prioritaria en incidentes)</span>
                </span>
              </label>
            </section>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={isPending}>
            Cancelar
          </button>
          <button onClick={handleSubmit} className="btn-primary flex-1" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear activo"}
          </button>
        </div>
      </div>
    </div>
  );
}

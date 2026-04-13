import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Save, Search, ChevronDown, ChevronRight } from "lucide-react";
import { assetsApi } from "@/api/assetsApi";
import type { BrandType, AssetModelType } from "@/@types/asset.types";
import { ConfirmDelete } from "@/components/shared/ConfirmDelete";
import toast from "react-hot-toast";

export function ModelsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedBrands, setExpandedBrands] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", brand: "" });
  const [editForm, setEditForm] = useState({ name: "", brand: "" });

  const { data: brandsData } = useQuery({
    queryKey: ["brands", "all"],
    queryFn: () => assetsApi.getBrands({ page_size: 200 }),
  });
  const { data: modelsData, isLoading } = useQuery({
    queryKey: ["asset-models", "all"],
    queryFn: () => assetsApi.getAssetModels({ page_size: 500 }),
  });

  const brands: BrandType[]      = brandsData?.data?.results ?? [];
  const models: AssetModelType[] = modelsData?.data?.results ?? [];

  const filtered = models.filter(m =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.brand_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar por marca
  const grouped = brands
    .map(brand => ({
      brand,
      models: filtered.filter(m => m.brand === brand.id),
    }))
    .filter(g => g.models.length > 0);

  const toggleBrand = (id: number) => {
    setExpandedBrands(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  const createMut = useMutation({
    mutationFn: () => assetsApi.createAssetModel({
      name: cap(form.name.trim()),
      brand: Number(form.brand),
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["asset-models"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Modelo creado");
      setShowNew(false);
      setForm({ name: "", brand: "" });
      setExpandedBrands(prev => new Set(prev).add(res.data.brand));
    },
    onError: () => toast.error("Error al crear modelo"),
  });

  const updateMut = useMutation({
    mutationFn: (id: number) => assetsApi.updateAssetModel(id, {
      name: cap(editForm.name.trim()),
      brand: Number(editForm.brand),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-models"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Modelo actualizado");
      setEditingId(null);
    },
    onError: () => toast.error("Error al actualizar modelo"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => assetsApi.deleteAssetModel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-models"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Modelo eliminado");
      setConfirmDeleteId(null);
    },
    onError: () => toast.error("No se puede eliminar — tiene activos asociados"),
  });

  const startEdit = (m: AssetModelType) => {
    setEditingId(m.id);
    setEditForm({ name: m.name, brand: String(m.brand) });
  };

  const expandAll = () => setExpandedBrands(new Set(grouped.map(g => g.brand.id)));
  const collapseAll = () => setExpandedBrands(new Set());

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar modelo o marca..."
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg w-full"
          />
        </div>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={expandAll}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
          >
            Expandir todo
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
          >
            Colapsar todo
          </button>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          <Plus size={14} /> Nuevo modelo
        </button>
      </div>

      {/* Formulario nuevo modelo */}
      {showNew && (
        <div className="border border-primary-200 bg-primary-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-primary-700 mb-3">Nuevo modelo</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Nombre del modelo *</label>
              <input
                autoFocus
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder="Ej: Latitude 5540"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Marca *</label>
              <select
                value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="">Seleccionar...</option>
                {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => { setShowNew(false); setForm({ name: "", brand: "" }); }}
              className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              disabled={!form.name.trim() || !form.brand || createMut.isPending}
              onClick={() => createMut.mutate()}
              className="text-sm px-3 py-1.5 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Save size={13} /> Guardar
            </button>
          </div>
        </div>
      )}

      {/* Lista agrupada por marca */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm border border-gray-200 rounded-lg">
          {search ? "Sin resultados para los filtros aplicados." : "No hay modelos registrados. Crea uno con el botón de arriba."}
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ brand, models: brandModels }) => {
            const isExpanded = expandedBrands.has(brand.id);
            return (
              <div key={brand.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Cabecera de marca */}
                <button
                  type="button"
                  onClick={() => toggleBrand(brand.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded
                      ? <ChevronDown size={15} className="text-gray-500" />
                      : <ChevronRight size={15} className="text-gray-500" />
                    }
                    <span className="font-semibold text-sm text-gray-800">{brand.name}</span>
                    {brand.website && (
                      <a
                        href={brand.website}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        {brand.website}
                      </a>
                    )}
                  </div>
                  <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {brandModels.length} {brandModels.length === 1 ? "modelo" : "modelos"}
                  </span>
                </button>

                {/* Tabla de modelos */}
                {isExpanded && (
                  <table className="w-full text-sm">
                    <thead className="bg-white border-b border-gray-100">
                      <tr>
                        <th className="text-left px-6 py-2 text-xs font-semibold text-gray-500">Modelo</th>
                        <th className="w-24" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {brandModels.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          {editingId === m.id ? (
                            <>
                              <td className="px-6 py-2">
                                <input
                                  autoFocus
                                  value={editForm.name}
                                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => updateMut.mutate(m.id)}
                                    disabled={updateMut.isPending}
                                    className="p-1 rounded bg-primary-600 text-white hover:bg-primary-700"
                                  >
                                    <Save size={13} />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-2.5 font-medium text-gray-800">{m.name}</td>
                              <td className="px-4 py-2.5">
                                {confirmDeleteId === m.id ? (
                                  <ConfirmDelete
                                    label={m.name}
                                    onConfirm={() => deleteMut.mutate(m.id)}
                                    onCancel={() => setConfirmDeleteId(null)}
                                  />
                                ) : (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => startEdit(m)}
                                      className="p-1 rounded hover:bg-gray-100 text-gray-500"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(m.id)}
                                      className="p-1 rounded hover:bg-red-50 text-red-400"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

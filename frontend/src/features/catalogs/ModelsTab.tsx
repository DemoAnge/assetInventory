import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Save, Search } from "lucide-react";
import { assetsApi } from "@/api/assetsApi";
import type { BrandType, AssetTypeType, AssetModelType } from "@/@types/asset.types";
import { Badge } from "@/components/shared/Badge";
import { ConfirmDelete } from "@/components/shared/ConfirmDelete";
import { CAT_COLORS } from "@/utils/assetConstants";
import toast from "react-hot-toast";

export function ModelsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterType, setFilterType] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", brand: "", asset_type: "", specs: "" });
  const [editForm, setEditForm] = useState({ name: "", brand: "", asset_type: "", specs: "" });

  const { data: brandsData } = useQuery({ queryKey: ["brands", "all"], queryFn: () => assetsApi.getBrands({ page_size: 200 }) });
  const { data: typesData }  = useQuery({ queryKey: ["asset-types", "all"], queryFn: () => assetsApi.getAssetTypes({ page_size: 200 }) });
  const { data: modelsData, isLoading } = useQuery({ queryKey: ["asset-models", "all"], queryFn: () => assetsApi.getAssetModels({ page_size: 500 }) });

  const brands: BrandType[]      = brandsData?.data?.results ?? [];
  const types:  AssetTypeType[]  = typesData?.data?.results ?? [];
  const models: AssetModelType[] = modelsData?.data?.results ?? [];

  const filtered = models.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.brand_name?.toLowerCase().includes(search.toLowerCase());
    const matchBrand  = !filterBrand || String(m.brand) === filterBrand;
    const matchType   = !filterType  || String(m.asset_type) === filterType;
    return matchSearch && matchBrand && matchType;
  });

  const createMut = useMutation({
    mutationFn: () => assetsApi.createAssetModel({
      name: form.name.trim(),
      brand: Number(form.brand),
      asset_type: Number(form.asset_type),
      specs: form.specs.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-models"] });
      toast.success("Modelo creado");
      setShowNew(false);
      setForm({ name: "", brand: "", asset_type: "", specs: "" });
    },
    onError: () => toast.error("Error al crear modelo"),
  });

  const updateMut = useMutation({
    mutationFn: (id: number) => assetsApi.updateAssetModel(id, {
      name: editForm.name.trim(),
      brand: Number(editForm.brand),
      asset_type: Number(editForm.asset_type),
      specs: editForm.specs.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-models"] });
      toast.success("Modelo actualizado");
      setEditingId(null);
    },
    onError: () => toast.error("Error al actualizar modelo"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => assetsApi.deleteAssetModel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-models"] });
      toast.success("Modelo eliminado");
      setConfirmDeleteId(null);
    },
    onError: () => toast.error("No se puede eliminar — tiene activos asociados"),
  });

  const startEdit = (m: AssetModelType) => {
    setEditingId(m.id);
    setEditForm({ name: m.name, brand: String(m.brand), asset_type: String(m.asset_type), specs: m.specs ?? "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar modelo..." className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg w-full" />
        </div>
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white min-w-36">
          <option value="">Todas las marcas</option>
          {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white min-w-36">
          <option value="">Todos los tipos</option>
          {types.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
        </select>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm px-3 py-1.5 rounded-lg">
          <Plus size={14} /> Nuevo modelo
        </button>
      </div>

      {showNew && (
        <div className="border border-primary-200 bg-primary-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-primary-700 mb-3">Nuevo modelo</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Nombre del modelo *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="Ej: Latitude 5540" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Marca *</label>
              <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white">
                <option value="">Seleccionar...</option>
                {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Tipo de activo *</label>
              <select value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white">
                <option value="">Seleccionar...</option>
                {types.map(t => <option key={t.id} value={String(t.id)}>{t.name} ({t.category_display || t.category})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Especificaciones</label>
              <input value={form.specs} onChange={e => setForm(f => ({ ...f, specs: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="Ej: i7-12th, 16GB RAM, 512GB SSD" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowNew(false)} className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">Cancelar</button>
            <button disabled={!form.name.trim() || !form.brand || !form.asset_type || createMut.isPending}
              onClick={() => createMut.mutate()}
              className="text-sm px-3 py-1.5 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1">
              <Save size={13} /> Guardar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Modelo</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Marca</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Tipo</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Especificaciones</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400">Sin resultados</td></tr>
              )}
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  {editingId === m.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                      </td>
                      <td className="px-4 py-2">
                        <select value={editForm.brand} onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white w-full">
                          {brands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={editForm.asset_type} onChange={e => setEditForm(f => ({ ...f, asset_type: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white w-full">
                          {types.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.specs} onChange={e => setEditForm(f => ({ ...f, specs: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => updateMut.mutate(m.id)} disabled={updateMut.isPending}
                            className="p-1 rounded bg-primary-600 text-white hover:bg-primary-700"><Save size={13} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"><X size={13} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{m.name}</td>
                      <td className="px-4 py-2.5 text-gray-700">{m.brand_name}</td>
                      <td className="px-4 py-2.5">
                        <Badge
                          text={m.asset_type_name || String(m.asset_type)}
                          className={CAT_COLORS[m.category] ?? "bg-gray-100 text-gray-600"}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">{m.specs || "—"}</td>
                      <td className="px-4 py-2.5">
                        {confirmDeleteId === m.id ? (
                          <ConfirmDelete label={m.name} onConfirm={() => deleteMut.mutate(m.id)} onCancel={() => setConfirmDeleteId(null)} />
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(m)} className="p-1 rounded hover:bg-gray-100 text-gray-500"><Pencil size={13} /></button>
                            <button onClick={() => setConfirmDeleteId(m.id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

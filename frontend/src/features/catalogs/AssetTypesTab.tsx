import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Save, Search } from "lucide-react";
import { assetsApi } from "@/api/assetsApi";
import type { AssetTypeType } from "@/@types/asset.types";
import { Badge } from "@/components/shared/Badge";
import { ConfirmDelete } from "@/components/shared/ConfirmDelete";
import { CATEGORIES, CAT_COLORS } from "@/utils/assetConstants";
import toast from "react-hot-toast";

export function AssetTypesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", category: "COMPUTO", code_prefix: "", is_it_managed: false, description: "" });
  const [editForm, setEditForm] = useState({ name: "", category: "COMPUTO", code_prefix: "", is_it_managed: false, description: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["asset-types", "all"],
    queryFn: () => assetsApi.getAssetTypes({ page_size: 200 }),
  });

  const types: AssetTypeType[] = data?.data?.results ?? [];
  const filtered = types.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category_display?.toLowerCase().includes(search.toLowerCase()) ||
    t.code_prefix?.toLowerCase().includes(search.toLowerCase())
  );

  const createMut = useMutation({
    mutationFn: () => assetsApi.createAssetType({
      name: form.name.trim(), category: form.category,
      code_prefix: form.code_prefix.trim().toUpperCase(),
      is_it_managed: form.is_it_managed,
      description: form.description.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-types"] });
      toast.success("Tipo de activo creado");
      setShowNew(false);
      setForm({ name: "", category: "COMPUTO", code_prefix: "", is_it_managed: false, description: "" });
    },
    onError: () => toast.error("Error al crear tipo de activo"),
  });

  const updateMut = useMutation({
    mutationFn: (id: number) => assetsApi.updateAssetType(id, {
      name: editForm.name.trim(), category: editForm.category,
      code_prefix: editForm.code_prefix.trim().toUpperCase(),
      is_it_managed: editForm.is_it_managed,
      description: editForm.description.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-types"] });
      toast.success("Tipo actualizado");
      setEditingId(null);
    },
    onError: () => toast.error("Error al actualizar tipo"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => assetsApi.deleteAssetType(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-types"] });
      toast.success("Tipo eliminado");
      setConfirmDeleteId(null);
    },
    onError: () => toast.error("No se puede eliminar — tiene modelos o activos asociados"),
  });

  const startEdit = (t: AssetTypeType) => {
    setEditingId(t.id);
    setEditForm({ name: t.name, category: t.category, code_prefix: t.code_prefix ?? "", is_it_managed: t.is_it_managed, description: t.description ?? "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tipo..." className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg w-full" />
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm px-3 py-1.5 rounded-lg">
          <Plus size={14} /> Nuevo tipo
        </button>
      </div>

      {showNew && (
        <div className="border border-primary-200 bg-primary-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-primary-700 mb-3">Nuevo tipo de activo</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Nombre *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="Ej: Laptop" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Categoría *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Prefijo de código</label>
              <input value={form.code_prefix} onChange={e => setForm(f => ({ ...f, code_prefix: e.target.value.toUpperCase() }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono" placeholder="Ej: LAP" maxLength={10} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Descripción</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="Opcional" />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input type="checkbox" checked={form.is_it_managed} onChange={e => setForm(f => ({ ...f, is_it_managed: e.target.checked }))}
              className="rounded" />
            <span className="text-sm text-gray-700">Gestionado por TI (aparece en módulo TI)</span>
          </label>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowNew(false)} className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">Cancelar</button>
            <button disabled={!form.name.trim() || createMut.isPending} onClick={() => createMut.mutate()}
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
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Tipo</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Categoría</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Prefijo</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">TI</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Descripción</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400">Sin resultados</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  {editingId === t.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                      </td>
                      <td className="px-4 py-2">
                        <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white w-full">
                          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.code_prefix} onChange={e => setEditForm(f => ({ ...f, code_prefix: e.target.value.toUpperCase() }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm font-mono w-24" maxLength={10} />
                      </td>
                      <td className="px-4 py-2">
                        <input type="checkbox" checked={editForm.is_it_managed}
                          onChange={e => setEditForm(f => ({ ...f, is_it_managed: e.target.checked }))}
                          className="rounded" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => updateMut.mutate(t.id)} disabled={updateMut.isPending}
                            className="p-1 rounded bg-primary-600 text-white hover:bg-primary-700"><Save size={13} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"><X size={13} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{t.name}</td>
                      <td className="px-4 py-2.5">
                        <Badge text={t.category_display || t.category} className={CAT_COLORS[t.category] ?? "bg-gray-100 text-gray-600"} />
                      </td>
                      <td className="px-4 py-2.5">
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{t.code_prefix || "—"}</code>
                      </td>
                      <td className="px-4 py-2.5">
                        {t.is_it_managed
                          ? <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">TI</span>
                          : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">{t.description || "—"}</td>
                      <td className="px-4 py-2.5">
                        {confirmDeleteId === t.id ? (
                          <ConfirmDelete label={t.name} onConfirm={() => deleteMut.mutate(t.id)} onCancel={() => setConfirmDeleteId(null)} />
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(t)} className="p-1 rounded hover:bg-gray-100 text-gray-500"><Pencil size={13} /></button>
                            <button onClick={() => setConfirmDeleteId(t.id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
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

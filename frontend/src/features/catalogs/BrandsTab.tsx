import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Save, Search, Package } from "lucide-react";
import { assetsApi } from "@/api/assetsApi";
import type { BrandType } from "@/@types/asset.types";
import { ConfirmDelete } from "@/components/shared/ConfirmDelete";
import toast from "react-hot-toast";

export function BrandsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", website: "" });
  const [editForm, setEditForm] = useState({ name: "", website: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["brands", "all"],
    queryFn: () => assetsApi.getBrands({ page_size: 200 }),
  });

  const brands: BrandType[] = data?.data?.results ?? [];
  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  const createMut = useMutation({
    mutationFn: () => assetsApi.createBrand({
      name: cap(form.name.trim()),
      website: form.website.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Marca creada");
      setShowNew(false);
      setForm({ name: "", website: "" });
    },
    onError: () => toast.error("Error al crear marca"),
  });

  const updateMut = useMutation({
    mutationFn: (id: number) => assetsApi.updateBrand(id, {
      name: cap(editForm.name.trim()),
      website: editForm.website.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Marca actualizada");
      setEditingId(null);
    },
    onError: () => toast.error("Error al actualizar marca"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => assetsApi.deleteBrand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Marca eliminada");
      setConfirmDeleteId(null);
    },
    onError: () => toast.error("No se puede eliminar — tiene modelos asociados"),
  });

  const startEdit = (b: BrandType) => {
    setEditingId(b.id);
    setEditForm({ name: b.name, website: b.website ?? "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar marca..."
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg w-full"
          />
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          <Plus size={14} /> Nueva marca
        </button>
      </div>

      {showNew && (
        <div className="border border-primary-200 bg-primary-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-primary-700 mb-3">Nueva marca</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Nombre *</label>
              <input
                autoFocus
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder="Ej: Dell"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Sitio web</label>
              <input
                value={form.website}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => { setShowNew(false); setForm({ name: "", website: "" }); }}
              className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              disabled={!form.name.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
              className="text-sm px-3 py-1.5 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
            >
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
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Marca</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Sitio web</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-600">Modelos</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-400">Sin resultados</td>
                </tr>
              )}
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  {editingId === b.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          autoFocus
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.website}
                          onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                          placeholder="https://..."
                        />
                      </td>
                      <td className="px-4 py-2 text-center text-gray-400 text-xs">—</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateMut.mutate(b.id)}
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
                      <td className="px-4 py-2.5 font-medium text-gray-800">{b.name}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {b.website
                          ? <a href={b.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{b.website}</a>
                          : "—"
                        }
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          b.models_count > 0
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-400"
                        }`}>
                          <Package size={11} />
                          {b.models_count}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {confirmDeleteId === b.id ? (
                          <ConfirmDelete
                            label={b.name}
                            onConfirm={() => deleteMut.mutate(b.id)}
                            onCancel={() => setConfirmDeleteId(null)}
                          />
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(b)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-500"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(b.id)}
                              className="p-1 rounded hover:bg-red-50 text-red-400"
                              title={b.models_count > 0 ? `Tiene ${b.models_count} modelo(s)` : "Eliminar"}
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
        </div>
      )}
    </div>
  );
}

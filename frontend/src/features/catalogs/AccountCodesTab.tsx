import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import toast from "react-hot-toast";
import { assetsApi } from "@/api/assetsApi";
import type { AccountCodeType } from "@/@types/asset.types";
import { CATEGORIES } from "@/utils/assetConstants";

const EMPTY: Partial<AccountCodeType> = {
  code: "", name: "", description: "", category: null,
  useful_life_years: null, depreciation_rate: null, is_active: true,
};

function AccountCodeForm({
  initial, onSave, onCancel, isPending,
}: {
  initial: Partial<AccountCodeType>;
  onSave: (d: Partial<AccountCodeType>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <tr className="bg-primary-50/40">
      <td className="px-3 py-2">
        <input
          className="input-field text-sm font-mono"
          value={form.code ?? ""}
          onChange={e => set("code", e.target.value)}
          placeholder="Ej: 1805"
          autoFocus
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="input-field text-sm"
          value={form.name ?? ""}
          onChange={e => set("name", e.target.value)}
          placeholder="Nombre de la cuenta"
        />
      </td>
      <td className="px-3 py-2">
        <select
          className="input-field text-sm"
          value={form.category ?? ""}
          onChange={e => set("category", e.target.value || null)}
        >
          <option value="">— Sin categoría —</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          className="input-field text-sm"
          value={form.description ?? ""}
          onChange={e => set("description", e.target.value)}
          placeholder="Descripción opcional"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number" min="1" max="50"
          className="input-field text-sm w-20"
          value={form.useful_life_years ?? ""}
          onChange={e => {
            const years = e.target.value ? Number(e.target.value) : null;
            setForm(f => ({
              ...f,
              useful_life_years: years,
              depreciation_rate: years ? String((100 / years).toFixed(2)) : f.depreciation_rate,
            }));
          }}
          placeholder="Años"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number" min="0" max="100" step="0.01"
          className="input-field text-sm w-24"
          value={form.depreciation_rate ?? ""}
          onChange={e => set("depreciation_rate", e.target.value || null)}
          placeholder="% anual"
        />
      </td>
      <td className="px-3 py-2">
        <select
          className="input-field text-sm"
          value={form.is_active ? "true" : "false"}
          onChange={e => set("is_active", e.target.value === "true")}
        >
          <option value="true">Activa</option>
          <option value="false">Inactiva</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => { if (!form.code?.trim() || !form.name?.trim()) { toast.error("Código y nombre son obligatorios."); return; } onSave(form); }}
            disabled={isPending}
            className="p-1.5 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            title="Guardar"
          >
            <Check size={14} />
          </button>
          <button onClick={onCancel} className="p-1.5 rounded bg-gray-200 hover:bg-gray-300" title="Cancelar">
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AccountCodesTab() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["account-codes"],
    queryFn:  () => assetsApi.getAccountCodes({ page_size: 200 }).then(r => r.data.results),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<AccountCodeType>) => assetsApi.createAccountCode(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["account-codes"] }); qc.invalidateQueries({ queryKey: ["account-codes-select"] }); toast.success("Cuenta creada."); setAdding(false); },
    onError: (e: any) => toast.error(e?.response?.data?.code?.[0] ?? "Error al crear la cuenta."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AccountCodeType> }) =>
      assetsApi.updateAccountCode(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["account-codes"] }); qc.invalidateQueries({ queryKey: ["account-codes-select"] }); toast.success("Cuenta actualizada."); setEditingId(null); },
    onError: () => toast.error("Error al actualizar la cuenta."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => assetsApi.deleteAccountCode(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["account-codes"] }); qc.invalidateQueries({ queryKey: ["account-codes-select"] }); toast.success("Cuenta eliminada."); setConfirmDelete(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "No se puede eliminar: tiene activos asociados."),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Define el plan de cuentas de tu institución. Cada activo puede asociarse a una cuenta.
        </p>
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="btn-primary flex items-center gap-2 text-sm"
          disabled={adding}
        >
          <Plus size={14} /> Nueva cuenta
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-28">Código</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">Nombre</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-36">Categoría</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500">Descripción</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-20">Vida útil</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-24">Tasa dep.</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-24">Estado</th>
                <th className="px-3 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adding && (
                <AccountCodeForm
                  initial={EMPTY}
                  onSave={d => createMutation.mutate(d)}
                  onCancel={() => setAdding(false)}
                  isPending={createMutation.isPending}
                />
              )}
              {!data?.length && !adding && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-gray-400">
                    No hay cuentas contables. Agrega la primera con el botón de arriba.
                  </td>
                </tr>
              )}
              {data?.map(ac => (
                editingId === ac.id ? (
                  <AccountCodeForm
                    key={ac.id}
                    initial={ac}
                    onSave={d => updateMutation.mutate({ id: ac.id, data: d })}
                    onCancel={() => setEditingId(null)}
                    isPending={updateMutation.isPending}
                  />
                ) : (
                  <tr key={ac.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 font-mono font-semibold text-gray-800">{ac.code}</td>
                    <td className="px-3 py-2.5 text-gray-800">{ac.name}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{ac.category_display ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{ac.description || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2.5 text-gray-700 text-xs text-center">
                      {ac.useful_life_years != null ? `${ac.useful_life_years} años` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 text-xs text-center">
                      {ac.depreciation_rate != null ? `${parseFloat(ac.depreciation_rate).toFixed(2)}%` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ac.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {ac.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {confirmDelete === ac.id ? (
                          <>
                            <span className="text-xs text-red-600">¿Eliminar?</span>
                            <button onClick={() => deleteMutation.mutate(ac.id)} className="px-2 py-0.5 text-xs rounded bg-red-500 text-white hover:bg-red-600">Sí</button>
                            <button onClick={() => setConfirmDelete(null)} className="px-2 py-0.5 text-xs rounded bg-gray-200 hover:bg-gray-300">No</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingId(ac.id); setAdding(false); }} className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50" title="Editar">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setConfirmDelete(ac.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="Eliminar">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

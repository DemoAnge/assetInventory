import { useState } from "react";
import { Users, Plus, Search, Pencil, UserCheck, UserX } from "lucide-react";
import { useCustodians, useDeactivateCustodian, useActivateCustodian } from "@/hooks/useCustodians";
import { useAuthStore } from "@/store/authStore";
import { CustodianFormModal } from "./CustodianFormModal";
import type { CustodianType } from "@/@types/custodian.types";

export default function CustodiansPage() {
  const { user } = useAuthStore();
  const [search, setSearch]             = useState("");
  const [filterActive, setFilterActive] = useState<string>("");
  const [page, setPage]                 = useState(1);
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState<CustodianType | undefined>(undefined);
  const [confirmId, setConfirmId]       = useState<number | null>(null);

  const canWrite = user?.role === "ADMIN" || user?.role === "TI";

  const { data, isLoading } = useCustodians({
    search:    search || undefined,
    is_active: filterActive !== "" ? filterActive : undefined,
    page,
  });

  const deactivate = useDeactivateCustodian();
  const activate   = useActivateCustodian();

  function openCreate() {
    setEditing(undefined);
    setShowModal(true);
  }

  function openEdit(c: CustodianType) {
    setEditing(c);
    setShowModal(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Responsables / Custodios</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {data?.count ?? 0} responsables registrados
            </p>
          </div>
        </div>
        {canWrite && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nuevo Responsable
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o cargo..."
              className="input-field pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input-field w-auto"
            value={filterActive}
            onChange={e => { setFilterActive(e.target.value); setPage(1); }}
          >
            <option value="">Todos los estados</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Cargando...</div>
        ) : !data?.results.length ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Users size={32} className="opacity-30" />
            <p>No se encontraron responsables.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-14">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cédula</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Cargo</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Activos Asignados</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Estado</th>
                {canWrite && (
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.results.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.full_name}</td>
                  <td className="px-4 py-3 font-mono text-gray-700">{c.id_number}</td>
                  <td className="px-4 py-3 text-gray-600">{c.position}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      c.assets_count > 0
                        ? "bg-primary-100 text-primary-700"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      {c.assets_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {c.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {confirmId === c.id ? (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-orange-600 text-xs">
                              {c.is_active ? "¿Desactivar?" : "¿Reactivar?"}
                            </span>
                            <button
                              onClick={() => {
                                if (c.is_active) deactivate.mutate(c.id);
                                else activate.mutate(c.id);
                                setConfirmId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-orange-500 text-white hover:bg-orange-600 text-xs"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 text-xs"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmId(c.id)}
                              className={`p-1.5 rounded transition-colors ${
                                c.is_active
                                  ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                  : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                              }`}
                              title={c.is_active ? "Desactivar" : "Reactivar"}
                            >
                              {c.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
            <span>Página {data.current_page} de {data.total_pages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!data.previous}
                className="btn-secondary py-1 px-3 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!data.next}
                className="btn-secondary py-1 px-3 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <CustodianFormModal
          custodian={editing}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}

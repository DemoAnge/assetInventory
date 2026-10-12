import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Plus, Search } from "lucide-react";
import { usersApi, type UserType } from "@/api/usersApi";
import { CreateUserForm } from "./components/CreateUserForm";
import { EditUserForm } from "./components/EditUserForm";
import { UserRow } from "./components/UserRow";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserType | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", search, filterActive, page],
    queryFn: () =>
      usersApi.getAll({
        search: search || undefined,
        is_active: filterActive || undefined,
        page,
      }).then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {data?.count ?? 0} cuentas de acceso al sistema
            </p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o cédula..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input-field w-auto"
            value={filterActive}
            onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
          >
            <option value="">Todos los estados</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Usuario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Rol</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Agencia</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Activo</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">MFA</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Último acceso</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">IP</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!data?.results?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                data.results.map((u) => (
                  <UserRow key={u.id} user={u} onEdit={() => setEditing(u)} />
                ))
              )}
            </tbody>
          </table>
        )}

        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
            <span>Página {data.current_page} de {data.total_pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!data.previous} className="btn-secondary py-1 px-3 disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={!data.next} className="btn-secondary py-1 px-3 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateUserForm onClose={() => setShowCreate(false)} />}
      {editing && <EditUserForm user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

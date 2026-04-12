import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { usersApi, type UserType } from "@/api/usersApi";
import { CreateUserForm } from "./components/CreateUserForm";
import { EditUserForm }   from "./components/EditUserForm";
import { UserRow }        from "./components/UserRow";

export default function UsersPage() {
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]     = useState<UserType | null>(null);

  const params: Record<string, unknown> = { page };
  if (search)     params.search = search;
  if (filterRole) params.role   = filterRole;

  const { data, isLoading } = useQuery({
    queryKey: ["users", params],
    queryFn:  () => usersApi.getAll(params).then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de cuentas y roles del sistema</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-44" value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}>
          <option value="">Todos los roles</option>
          <option value="ADMIN">Administrador</option>
          <option value="TI">TI</option>
          <option value="CONTABILIDAD">Contabilidad</option>
          <option value="AUDITOR">Auditor</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Usuario", "Rol", "Agencia", "Activo", "MFA", "Último acceso", "IP", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              )}
              {!isLoading && data?.results.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin usuarios</td></tr>
              )}
              {data?.results.map((u) => (
                <UserRow key={u.id} user={u} onEdit={() => setEditing(u)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary text-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className="text-sm text-gray-600 px-3 py-2">Página {page} de {data.total_pages}</span>
          <button className="btn-secondary text-sm" disabled={page === data.total_pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
        </div>
      )}

      {showCreate && <CreateUserForm onClose={() => setShowCreate(false)} />}
      {editing    && <EditUserForm user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

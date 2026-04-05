import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Shield, ShieldOff, UserCheck, UserX, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { usersApi, type UserType, type UserCreateData, type UserUpdateData } from "@/api/usersApi";
import toast from "react-hot-toast";

const ROLE_STYLES: Record<string, string> = {
  ADMIN:        "bg-red-100 text-red-700",
  TI:           "bg-blue-100 text-blue-700",
  CONTABILIDAD: "bg-green-100 text-green-700",
  AUDITOR:      "bg-purple-100 text-purple-700",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN:        "Administrador",
  TI:           "TI",
  CONTABILIDAD: "Contabilidad",
  AUDITOR:      "Auditor",
};

// ── Formulario nuevo usuario ───────────────────────────────────────────────────
function CreateUserForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<UserCreateData>({
    defaultValues: { role: "AUDITOR" },
  });

  const mutation = useMutation({
    mutationFn: (data: UserCreateData) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado correctamente");
      onClose();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      const msg = data?.detail ?? data?.email?.[0] ?? data?.password?.[0] ?? "Error al crear usuario";
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo usuario</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input className="input w-full" {...register("first_name", { required: true })} />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
              <input className="input w-full" {...register("last_name", { required: true })} />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" className="input w-full" {...register("email", { required: true })} />
              {errors.email && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input className="input w-full" {...register("cedula")} placeholder="1234567890" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input className="input w-full" {...register("phone")} placeholder="0991234567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select className="input w-full" {...register("role", { required: true })}>
                <option value="AUDITOR">Auditor</option>
                <option value="TI">TI</option>
                <option value="CONTABILIDAD">Contabilidad</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Agencia</label>
              <input type="number" className="input w-full" {...register("agency", { valueAsNumber: true })} placeholder="Opcional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
              <input type="password" className="input w-full" {...register("password", { required: true, minLength: 8 })} />
              {errors.password && <p className="text-red-500 text-xs mt-1">Mínimo 8 caracteres</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña *</label>
              <input type="password" className="input w-full" {...register("confirm_password", { required: true })} />
              {errors.confirm_password && <p className="text-red-500 text-xs mt-1">Requerido</p>}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
            Los roles <strong>ADMIN</strong> y <strong>CONTABILIDAD</strong> tendrán MFA obligatorio al siguiente inicio de sesión.
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Formulario editar usuario ─────────────────────────────────────────────────
function EditUserForm({ user, onClose }: { user: UserType; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm<UserUpdateData>({
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      cedula: user.cedula,
      phone: user.phone,
      role: user.role,
      agency: user.agency ?? undefined,
      is_active: user.is_active,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: UserUpdateData) => usersApi.update(user.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario actualizado");
      onClose();
    },
    onError: () => toast.error("Error al actualizar"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Editar usuario</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input className="input w-full" {...register("first_name")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input className="input w-full" {...register("last_name")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input className="input w-full" {...register("cedula")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input className="input w-full" {...register("phone")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select className="input w-full" {...register("role")}>
                <option value="AUDITOR">Auditor</option>
                <option value="TI">TI</option>
                <option value="CONTABILIDAD">Contabilidad</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Agencia</label>
              <input type="number" className="input w-full" {...register("agency", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_active_edit" className="rounded" {...register("is_active")} />
            <label htmlFor="is_active_edit" className="text-sm text-gray-700">Usuario activo</label>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Fila de usuario ───────────────────────────────────────────────────────────
function UserRow({ user, onEdit }: { user: UserType; onEdit: () => void }) {
  return (
    <tr className={`hover:bg-gray-50 border-b border-gray-100 ${!user.is_active ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
          <p className="text-xs text-gray-400">{user.email}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold rounded px-2 py-0.5 ${ROLE_STYLES[user.role] ?? "bg-gray-100 text-gray-600"}`}>
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{user.agency_name ?? "—"}</td>
      <td className="px-4 py-3 text-center">
        {user.is_active
          ? <UserCheck size={16} className="text-green-500 mx-auto" />
          : <UserX size={16} className="text-gray-400 mx-auto" />}
      </td>
      <td className="px-4 py-3 text-center">
        {user.mfa_enabled
          ? <Shield size={16} className="text-blue-500 mx-auto" title="MFA activo" />
          : <ShieldOff size={16} className="text-gray-300 mx-auto" title="Sin MFA" />}
        {user.mfa_required && !user.mfa_enabled && (
          <span className="text-xs text-orange-500 block">Requerido</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {user.last_login ? format(new Date(user.last_login), "dd/MM/yyyy HH:mm") : "Nunca"}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{user.last_login_ip ?? "—"}</td>
      <td className="px-4 py-3">
        <button className="text-xs text-blue-600 hover:underline" onClick={onEdit}>Editar</button>
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UserType | null>(null);

  const params: Record<string, unknown> = { page };
  if (search) params.search = search;
  if (filterRole) params.role = filterRole;

  const { data, isLoading } = useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.getAll(params).then((r) => r.data),
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

      {/* Nota MFA */}
      <div className="text-xs text-gray-400 text-center">
        MFA obligatorio para roles ADMIN y CONTABILIDAD. El usuario puede activarlo desde su perfil en /mfa/setup
      </div>

      {showCreate && <CreateUserForm onClose={() => setShowCreate(false)} />}
      {editing && <EditUserForm user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

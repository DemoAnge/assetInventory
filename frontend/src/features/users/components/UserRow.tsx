import { format } from "date-fns";
import { Shield, ShieldOff, UserCheck, UserX } from "lucide-react";
import { type UserType } from "@/api/usersApi";
import { ROLE_STYLES, ROLE_LABELS } from "../constants";

interface Props {
  user: UserType;
  onEdit: () => void;
}

export function UserRow({ user, onEdit }: Props) {
  return (
    <tr
      className={`hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors ${!user.is_active ? "opacity-50" : ""}`}
      onClick={onEdit}
    >
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
        <p className="text-xs text-gray-400">{user.email}</p>
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
      <td className="px-4 py-3 text-right">
        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-colors">
          Editar →
        </span>
      </td>
    </tr>
  );
}

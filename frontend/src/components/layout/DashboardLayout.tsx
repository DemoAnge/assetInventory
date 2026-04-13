import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Monitor, ArrowLeftRight,
  Wrench, BarChart2, FileText, MapPin,
  Building2, LogOut, ChevronLeft, ChevronRight, User, BookOpen,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/api/authApi";
import type { Role } from "@/@types/auth.types";
import toast from "react-hot-toast";

interface NavItemType {
  to: string;
  label: string;
  icon: ReactNode;
  roles: Role[];
}

const NAV_ITEMS: NavItemType[] = [
  { to: "/dashboard",   label: "Dashboard",    icon: <LayoutDashboard size={18} />, roles: ["ADMIN","TI","CONTABILIDAD","AUDITOR"] },
  { to: "/assets",      label: "Activos",      icon: <Package size={18} />,         roles: ["ADMIN","TI","CONTABILIDAD","AUDITOR"] },
  { to: "/it",          label: "TI",           icon: <Monitor size={18} />,         roles: ["ADMIN","TI"] },
  { to: "/movements",   label: "Movimientos",  icon: <ArrowLeftRight size={18} />,  roles: ["ADMIN","TI","CONTABILIDAD"] },
  { to: "/maintenance", label: "Mantenimiento",icon: <Wrench size={18} />,          roles: ["ADMIN","TI"] },
  { to: "/reports",     label: "Reportes",     icon: <BarChart2 size={18} />,       roles: ["ADMIN","TI","CONTABILIDAD","AUDITOR"] },
  { to: "/documents",   label: "Documentos",   icon: <FileText size={18} />,        roles: ["ADMIN","TI","CONTABILIDAD"] },
  { to: "/catalogs",    label: "Catálogos",    icon: <BookOpen size={18} />,        roles: ["ADMIN","TI"] },
  { to: "/locations",   label: "Ubicaciones",  icon: <MapPin size={18} />,          roles: ["ADMIN"] },
  { to: "/users",       label: "Usuarios",     icon: <User size={18} />,            roles: ["ADMIN"] },
];

const ROLE_BADGE: Record<Role, string> = {
  ADMIN:        "badge-admin",
  TI:           "badge-ti",
  CONTABILIDAD: "badge-contabilidad",
  AUDITOR:      "badge-auditor",
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // ignorar error de red en logout
    } finally {
      logout();
      navigate("/login");
      toast.success("Sesión cerrada.");
    }
  };

  const visibleItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-gray-900 text-white transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-700">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Building2 size={22} className="text-primary-400" />
              <span className="text-sm font-semibold leading-tight">
                Inventario<br />
                <span className="text-primary-400">Activos</span>
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-700 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.full_name}</p>
                <span className={`text-xs ${ROLE_BADGE[user?.role as Role]}`}>{user?.role}</span>
              </div>
              <button onClick={handleLogout} className="p-1 hover:text-red-400 transition-colors" title="Cerrar sesión">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center p-1 hover:text-red-400 transition-colors" title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3"></div>
          <div className="flex items-center gap-4"></div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

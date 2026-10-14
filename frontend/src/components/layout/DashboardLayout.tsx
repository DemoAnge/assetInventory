import { useState, useRef, useEffect, type ReactNode, Suspense } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Monitor, ArrowLeftRight,
  Wrench, BarChart2, FileText, MapPin,
  LogOut, ChevronLeft, ChevronRight, User, Users, BookOpen, Settings,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/api/authApi";
import type { Role } from "@/@types/auth.types";
import { ROUTES, canViewModule } from "@/routes/appRoutes";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import toast from "react-hot-toast";

interface NavItemType {
  to: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItemType[] = [
  { to: ROUTES.DASHBOARD,   label: "Dashboard",     icon: <LayoutDashboard size={18} /> },
  { to: ROUTES.ASSETS,      label: "Activos",        icon: <Package size={18} /> },
  { to: ROUTES.IT,          label: "TI",             icon: <Monitor size={18} /> },
  { to: ROUTES.MOVEMENTS,   label: "Movimientos",    icon: <ArrowLeftRight size={18} /> },
  { to: ROUTES.MAINTENANCE, label: "Mantenimiento",  icon: <Wrench size={18} /> },
  { to: ROUTES.REPORTS,     label: "Reportes",       icon: <BarChart2 size={18} /> },
  { to: ROUTES.DOCUMENTS,   label: "Documentos",     icon: <FileText size={18} /> },
  { to: ROUTES.CATALOGS,    label: "Catálogos",      icon: <BookOpen size={18} /> },
  { to: ROUTES.CUSTODIANS,  label: "Custodios",      icon: <Users size={18} /> },
  { to: ROUTES.LOCATIONS,   label: "Ubicaciones",    icon: <MapPin size={18} /> },
  { to: ROUTES.USERS,       label: "Usuarios",       icon: <User size={18} /> },
];

const PAGE_TITLE: Record<string, string> = {
  [ROUTES.DASHBOARD]: "Control de activos",
  [ROUTES.ASSETS]: "Activos",
  [ROUTES.IT]: "TI",
  [ROUTES.MOVEMENTS]: "Movimientos",
  [ROUTES.MAINTENANCE]: "Mantenimiento",
  [ROUTES.REPORTS]: "Reportes",
  [ROUTES.DOCUMENTS]: "Documentos",
  [ROUTES.CATALOGS]: "Catálogos",
  [ROUTES.CUSTODIANS]: "Custodios",
  [ROUTES.LOCATIONS]: "Ubicaciones",
  [ROUTES.USERS]: "Usuarios",
  [ROUTES.SETTINGS]: "Ajustes",
};

const ROLE_BADGE: Record<Role, string> = {
  ADMIN:        "badge-admin",
  TI:           "badge-ti",
  CONTABILIDAD: "badge-contabilidad",
  AUDITOR:      "badge-auditor",
};

const GROUP_AFTER = new Set<string>([
  ROUTES.MAINTENANCE,
  ROUTES.DOCUMENTS,
  ROUTES.REPORTS,
]);

function UserAvatar({ firstName = "", lastName = "" }: { firstName?: string; lastName?: string }) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.trim() || "?";
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand text-[11px] font-semibold text-white">
      {initials}
    </div>
  );
}

function titleFor(pathname: string): string {
  if (pathname.startsWith("/assets/")) return "Activos";
  const exact = PAGE_TITLE[pathname];
  if (exact) return exact;
  const base = "/" + pathname.split("/").filter(Boolean)[0];
  return PAGE_TITLE[base] ?? "SGA-CO";
}

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const { user, logout, refreshToken } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef  = useRef<HTMLDivElement>(null);
  const isCockpit = location.pathname.startsWith("/dashboard");

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // red caída: se cierra igual
    } finally {
      logout();
      navigate("/login");
      toast.success("Sesión cerrada.");
    }
  };

  const visibleItems = NAV_ITEMS.filter(item =>
    user ? canViewModule(user.role, item.to) : false
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-app">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:z-modal focus:left-3 focus:top-3 focus:bg-brand focus:px-3 focus:py-2 focus:text-white"
      >
        Saltar al contenido
      </a>

      <aside
        className={`flex flex-col border-r border-line bg-surface-sidebar text-ink transition-[width] duration-200 ${collapsed ? "w-16" : "w-60"}`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-line px-2">
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-baseline gap-2 px-2">
              <span className="text-sm font-semibold tracking-tight text-ink">SGA-CO</span>
              <span className="truncate text-[11px] text-accent">Activos</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-control text-ink-subtle hover:bg-surface-muted hover:text-ink"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-1.5" aria-label="Modulos">
          {visibleItems.map(item => (
            <div key={item.to}>
              <NavLink
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center gap-3 rounded-control px-3 text-[13px] font-medium transition-colors duration-200 ${
                    isActive
                      ? "bg-brand text-white"
                      : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                  }`
                }
              >
                {item.icon}
                <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
              </NavLink>
              {GROUP_AFTER.has(item.to) && (
                <div className="mx-2 my-2 h-px bg-line" role="separator" />
              )}
            </div>
          ))}
        </nav>

        <div className="relative border-t border-line p-2" ref={menuRef}>
          {menuOpen && (
            <div className="absolute bottom-full left-2 right-2 z-drawer mb-1 overflow-hidden rounded-panel border border-line bg-surface shadow-tint">
              <div className="flex items-center gap-3 border-b border-line px-3 py-3">
                <UserAvatar firstName={user?.first_name} lastName={user?.last_name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{user?.full_name}</p>
                  <p className="truncate text-xs text-ink-subtle">{user?.email}</p>
                </div>
              </div>
              <div className="py-1">
                <NavLink
                  to={ROUTES.SETTINGS}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center gap-3 px-3 text-sm ${
                      isActive
                        ? "bg-accent-soft text-accent"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                    }`
                  }
                >
                  <Settings size={15} /> Ajustes
                </NavLink>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex min-h-[44px] w-full items-center gap-3 px-3 text-sm text-ink-muted hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut size={15} /> Cerrar sesión
                </button>
              </div>
            </div>
          )}

          {!collapsed ? (
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex min-h-[44px] w-full items-center gap-3 rounded-control px-2 hover:bg-surface-muted"
            >
              <UserAvatar firstName={user?.first_name} lastName={user?.last_name} />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-medium text-ink">{user?.full_name}</p>
                <span className={`text-xs ${user?.role ? ROLE_BADGE[user.role] : ""}`}>{user?.role}</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="flex min-h-[44px] w-full items-center justify-center"
              title="Menú de usuario"
              aria-label="Menú de usuario"
              aria-expanded={menuOpen}
            >
              <UserAvatar firstName={user?.first_name} lastName={user?.last_name} />
            </button>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-sticky flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur">
          <p className="text-sm font-medium text-ink">{titleFor(location.pathname)}</p>
          <div className="flex items-center gap-3">
            <p className="hidden font-mono text-[11px] tabular-nums text-ink-subtle sm:block">
              {user?.email}
            </p>
            <ThemeToggle compact />
          </div>
        </header>
        {user?.mfa_required && !user.mfa_enabled && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Tu rol exige MFA.{" "}
            <NavLink to={ROUTES.SETTINGS} className="font-medium underline">
              Configúralo en Ajustes
            </NavLink>
          </div>
        )}
        <main
          id="contenido-principal"
          className={`flex flex-1 flex-col overflow-y-auto bg-app ${isCockpit ? "p-0" : "p-6"}`}
        >
          <div className="flex-1">
            <Suspense fallback={<div className="flex h-64 items-center justify-center text-sm text-ink-subtle">Cargando</div>}>
              <Outlet />
            </Suspense>
          </div>
          {!isCockpit && (
            <footer className="mt-8 border-t border-line pt-4 text-center text-xs text-ink-subtle">
              2026 Angel Pilamunga. MIT License
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}

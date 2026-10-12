/**
 * Rutas y política de acceso por rol.
 * Una sola fuente de verdad: menú, RoleGuard y botones de escritura leen esto.
 * El backend replica la misma matriz en apps.shared.permissions.
 */
import type { Role } from "@/@types/auth.types";

export const ROUTES = {
  LOGIN:        "/login",
  UNAUTHORIZED: "/unauthorized",
  DASHBOARD:    "/dashboard",
  ASSETS:       "/assets",
  ASSET_DETAIL: (id: number | string) => `/assets/${id}`,
  MOVEMENTS:    "/movements",
  REPORTS:      "/reports",
  DOCUMENTS:    "/documents",
  IT:           "/it",
  MAINTENANCE:  "/maintenance",
  CATALOGS:     "/catalogs",
  CUSTODIANS:   "/custodians",
  LOCATIONS:    "/locations",
  USERS:        "/users",
  SETTINGS:     "/settings",
} as const;

export const ROLES = {
  ALL_STAFF:              ["ADMIN", "TI", "CONTABILIDAD", "AUDITOR"] as Role[],
  ADMIN_TI:               ["ADMIN", "TI"] as Role[],
  ADMIN_TI_CONTABILIDAD:  ["ADMIN", "TI", "CONTABILIDAD"] as Role[],
  ADMIN:                  ["ADMIN"] as Role[],
};

export type ModulePolicy = {
  view: Role[];
  write?: Role[];
};

export const MODULE_POLICY: Record<string, ModulePolicy> = {
  [ROUTES.DASHBOARD]:   { view: ROLES.ALL_STAFF },
  [ROUTES.ASSETS]:      { view: ROLES.ALL_STAFF,             write: ROLES.ALL_STAFF },
  [ROUTES.MOVEMENTS]:   { view: ROLES.ADMIN_TI_CONTABILIDAD, write: ROLES.ADMIN_TI },
  [ROUTES.REPORTS]:     { view: ROLES.ALL_STAFF },
  [ROUTES.DOCUMENTS]:   { view: ROLES.ADMIN_TI_CONTABILIDAD, write: ROLES.ADMIN_TI_CONTABILIDAD },
  [ROUTES.IT]:          { view: ROLES.ADMIN_TI,              write: ROLES.ADMIN_TI },
  [ROUTES.MAINTENANCE]: { view: ROLES.ADMIN_TI,              write: ROLES.ADMIN_TI },
  [ROUTES.CATALOGS]:    { view: ROLES.ADMIN_TI,              write: ROLES.ADMIN },
  [ROUTES.CUSTODIANS]:  { view: ROLES.ADMIN_TI,              write: ROLES.ADMIN_TI },
  [ROUTES.LOCATIONS]:   { view: ROLES.ADMIN,                 write: ROLES.ADMIN },
  [ROUTES.USERS]:       { view: ROLES.ADMIN,                 write: ROLES.ADMIN },
  [ROUTES.SETTINGS]:    { view: ROLES.ALL_STAFF,             write: ROLES.ALL_STAFF },
};

export function canViewModule(role: Role, path: string): boolean {
  return MODULE_POLICY[path]?.view.includes(role) ?? false;
}

export function canWriteModule(role: Role, path: string): boolean {
  const policy = MODULE_POLICY[path];
  if (!policy) return false;
  return (policy.write ?? policy.view).includes(role);
}

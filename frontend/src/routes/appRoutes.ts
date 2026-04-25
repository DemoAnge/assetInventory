/**
 * Centralized route path constants.
 * Import these instead of hardcoding path strings throughout the app.
 */
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

import { lazy, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { MODULE_POLICY, ROUTES } from "./appRoutes";
import LoginPage from "@/features/auth/LoginPage";

const DashboardPage    = lazy(() => import("@/features/dashboard/DashboardPage"));
const AssetsPage       = lazy(() => import("@/features/assets/AssetsPage"));
const AssetDetailPage  = lazy(() => import("@/features/assets/AssetDetailPage"));
const ITPage           = lazy(() => import("@/features/it/ITPage"));
const MovementsPage    = lazy(() => import("@/features/movements/MovementsPage"));
const MaintenancePage  = lazy(() => import("@/features/maintenance/MaintenancePage"));
const ReportsPage      = lazy(() => import("@/features/reports/ReportsPage"));
const DocumentsPage    = lazy(() => import("@/features/documents/DocumentsPage"));
const LocationsPage    = lazy(() => import("@/features/locations/LocationsPage"));
const CatalogsPage     = lazy(() => import("@/features/catalogs/CatalogsPage"));
const UsersPage        = lazy(() => import("@/features/users/UsersPage"));
const CustodiansPage   = lazy(() => import("@/features/custodians/CustodiansPage"));
const SettingsPage     = lazy(() => import("@/features/settings/SettingsPage"));
const UnauthorizedPage = lazy(() => import("@/features/auth/UnauthorizedPage"));
const NotFoundPage     = lazy(() => import("@/features/auth/NotFoundPage"));

function Guard({ path, children }: { path: string; children: ReactNode }) {
  const policy = MODULE_POLICY[path];
  if (!policy) return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  return (
    <RoleGuard allowedRoles={policy.view}>
      {children}
    </RoleGuard>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN}        element={<LoginPage />} />
      <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="dashboard" element={<Guard path={ROUTES.DASHBOARD}><DashboardPage /></Guard>} />
        <Route path="assets" element={<Guard path={ROUTES.ASSETS}><AssetsPage /></Guard>} />
        <Route path="assets/:id" element={<Guard path={ROUTES.ASSETS}><AssetDetailPage /></Guard>} />
        <Route path="movements/*" element={<Guard path={ROUTES.MOVEMENTS}><MovementsPage /></Guard>} />
        <Route path="reports/*" element={<Guard path={ROUTES.REPORTS}><ReportsPage /></Guard>} />
        <Route path="documents/*" element={<Guard path={ROUTES.DOCUMENTS}><DocumentsPage /></Guard>} />
        <Route path="it/*" element={<Guard path={ROUTES.IT}><ITPage /></Guard>} />
        <Route path="maintenance/*" element={<Guard path={ROUTES.MAINTENANCE}><MaintenancePage /></Guard>} />
        <Route path="catalogs/*" element={<Guard path={ROUTES.CATALOGS}><CatalogsPage /></Guard>} />
        <Route path="custodians/*" element={<Guard path={ROUTES.CUSTODIANS}><CustodiansPage /></Guard>} />
        <Route path="locations/*" element={<Guard path={ROUTES.LOCATIONS}><LocationsPage /></Guard>} />
        <Route path="users/*" element={<Guard path={ROUTES.USERS}><UsersPage /></Guard>} />
        <Route path="settings/*" element={<Guard path={ROUTES.SETTINGS}><SettingsPage /></Guard>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { ROUTES } from "./appRoutes";

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

export default function AppRouter() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path={ROUTES.LOGIN}        element={<LoginPage />} />
      <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

      {/* Protegidas */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400 text-sm">Cargando...</div>}>
              <Routes>
                <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
                <Route path="/dashboard"   element={<DashboardPage />} />

                {/* ── Todos los roles ──────────────────────────────── */}
                <Route path="/assets"     element={<AssetsPage />} />
                <Route path="/assets/:id" element={<AssetDetailPage />} />
                <Route path="/movements/*" element={<MovementsPage />} />
                <Route path="/reports/*"   element={<ReportsPage />} />
                <Route path="/documents/*" element={<DocumentsPage />} />

                {/* ── ADMIN + TI ───────────────────────────────────── */}
                <Route
                  path="/it/*"
                  element={
                    <RoleGuard allowedRoles={["ADMIN", "TI"]}>
                      <ITPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/maintenance/*"
                  element={
                    <RoleGuard allowedRoles={["ADMIN", "TI"]}>
                      <MaintenancePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/catalogs/*"
                  element={
                    <RoleGuard allowedRoles={["ADMIN", "TI"]}>
                      <CatalogsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/custodians/*"
                  element={
                    <RoleGuard allowedRoles={["ADMIN", "TI"]}>
                      <CustodiansPage />
                    </RoleGuard>
                  }
                />

                {/* ── Solo ADMIN ───────────────────────────────────── */}
                <Route
                  path="/locations/*"
                  element={
                    <RoleGuard allowedRoles={["ADMIN"]}>
                      <LocationsPage />
                    </RoleGuard>
                  }
                />
                <Route path="/users/*" element={<UsersPage />} />

                {/* ── Todos los roles autenticados ─────────────────── */}
                <Route path="/settings/*" element={<SettingsPage />} />

                <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
              </Routes>
              </Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

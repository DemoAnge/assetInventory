import { lazy, Suspense } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { RoleGuard } from "@/components/shared/RoleGuard";

// ── Páginas de auth (no lazy — críticas) ──────────────────────────────────────
import LoginPage from "@/features/users/LoginPage";
import MfaVerifyPage from "@/features/users/MfaVerifyPage";

// ── Lazy imports ──────────────────────────────────────────────────────────────
const MfaSetupPage        = lazy(() => import("@/features/users/MfaSetupPage"));
const DashboardPage       = lazy(() => import("@/features/dashboard/DashboardPage"));
const AssetsPage          = lazy(() => import("@/features/assets/AssetsPage"));
const AssetDetailPage     = lazy(() => import("@/features/assets/AssetDetailPage"));
const AccountingPage      = lazy(() => import("@/features/accounting/AccountingPage"));
const ITPage              = lazy(() => import("@/features/it/ITPage"));
const MovementsPage       = lazy(() => import("@/features/movements/MovementsPage"));
const MaintenancePage     = lazy(() => import("@/features/maintenance/MaintenancePage"));
const ReportsPage         = lazy(() => import("@/features/reports/ReportsPage"));
const DocumentsPage       = lazy(() => import("@/features/documents/DocumentsPage"));
const InvoiceAgentPage    = lazy(() => import("@/features/invoice-agent/InvoiceAgentPage"));
const LocationsPage       = lazy(() => import("@/features/locations/LocationsPage"));
const AuditPage           = lazy(() => import("@/features/audit/AuditPage"));
const AlertsPage          = lazy(() => import("@/features/alerts/AlertsPage"));
const CompliancePage      = lazy(() => import("@/features/compliance/CompliancePage"));
const UsersPage           = lazy(() => import("@/features/users/UsersPage"));
const UnauthorizedPage    = lazy(() => import("@/features/users/UnauthorizedPage"));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  );
}

export default function App() {
  useWebSocket(); // notificaciones en tiempo real vía Socket.IO

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mfa/verify" element={<MfaVerifyPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protegidas */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/mfa/setup" element={<MfaSetupPage />} />

                    {/* Activos — todos los roles */}
                    <Route path="/assets" element={<AssetsPage />} />
                    <Route path="/assets/:id" element={<AssetDetailPage />} />

                    {/* Contabilidad */}
                    <Route
                      path="/accounting/*"
                      element={
                        <RoleGuard allowedRoles={["ADMIN", "CONTABILIDAD"]} requireMfa>
                          <AccountingPage />
                        </RoleGuard>
                      }
                    />

                    {/* TI */}
                    <Route
                      path="/it/*"
                      element={
                        <RoleGuard allowedRoles={["ADMIN", "TI"]}>
                          <ITPage />
                        </RoleGuard>
                      }
                    />

                    {/* Movimientos */}
                    <Route path="/movements/*" element={<MovementsPage />} />

                    {/* Mantenimiento */}
                    <Route
                      path="/maintenance/*"
                      element={
                        <RoleGuard allowedRoles={["ADMIN", "TI"]}>
                          <MaintenancePage />
                        </RoleGuard>
                      }
                    />

                    {/* Reportes */}
                    <Route path="/reports/*" element={<ReportsPage />} />

                    {/* Documentos */}
                    <Route path="/documents/*" element={<DocumentsPage />} />

                    {/* Agente Facturas */}
                    <Route
                      path="/invoice-agent/*"
                      element={
                        <RoleGuard allowedRoles={["ADMIN", "TI"]}>
                          <InvoiceAgentPage />
                        </RoleGuard>
                      }
                    />

                    {/* Ubicaciones */}
                    <Route
                      path="/locations/*"
                      element={
                        <RoleGuard allowedRoles={["ADMIN"]}>
                          <LocationsPage />
                        </RoleGuard>
                      }
                    />

                    {/* Auditoría */}
                    <Route
                      path="/audit/*"
                      element={
                        <RoleGuard allowedRoles={["ADMIN", "AUDITOR"]}>
                          <AuditPage />
                        </RoleGuard>
                      }
                    />

                    {/* Alertas */}
                    <Route path="/alerts/*" element={<AlertsPage />} />

                    {/* Cumplimiento */}
                    <Route
                      path="/compliance/*"
                      element={
                        <RoleGuard allowedRoles={["ADMIN", "CONTABILIDAD", "AUDITOR"]}>
                          <CompliancePage />
                        </RoleGuard>
                      }
                    />

                    {/* Usuarios */}
                    <Route
                      path="/users/*"
                      element={
                        <RoleGuard allowedRoles={["ADMIN"]} requireMfa>
                          <UsersPage />
                        </RoleGuard>
                      }
                    />

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

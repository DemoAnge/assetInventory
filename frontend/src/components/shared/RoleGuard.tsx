import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/@types/auth.types";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
  redirectTo?: string;
}

export function RoleGuard({
  allowedRoles,
  children,
  redirectTo = "/unauthorized",
}: RoleGuardProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

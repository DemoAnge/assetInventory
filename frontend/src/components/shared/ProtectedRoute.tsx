import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { usersApi } from "@/api/usersApi";

interface Props { children: ReactNode }

/**
 * Protege rutas privadas.
 * Al montar, refresca el usuario desde el servidor para que el rol
 * siempre refleje el valor actual de users_customuser.
 */
export function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, setUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;
    usersApi.me()
      .then(r => setUser(r.data))
      .catch(() => { /* token inválido → el interceptor redirige a login */ });
  }, [isAuthenticated, setUser]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

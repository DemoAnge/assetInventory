"""Permisos por rol para DRF.

Replica frontend/src/routes/appRoutes.ts → MODULE_POLICY.
view = allowed_roles (GET/HEAD/OPTIONS).
write = write_roles si está definido; si no, igual que view.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission


class RolePermission(BasePermission):
    allowed_roles: frozenset[str] = frozenset()
    write_roles: frozenset[str] | None = None

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        role = getattr(user, "role", None)
        if request.method in SAFE_METHODS:
            return role in self.allowed_roles
        writers = self.write_roles if self.write_roles is not None else self.allowed_roles
        return role in writers


class IsAdmin(RolePermission):
    allowed_roles = frozenset({"ADMIN"})


class IsTI(RolePermission):
    """ADMIN + TI. Módulos: TI, mantenimiento, catálogos (página)."""
    allowed_roles = frozenset({"ADMIN", "TI"})


class IsAdminTIContabilidad(RolePermission):
    allowed_roles = frozenset({"ADMIN", "TI", "CONTABILIDAD"})


class IsContabilidad(RolePermission):
    allowed_roles = frozenset({"ADMIN", "CONTABILIDAD"})


class IsAuditor(RolePermission):
    allowed_roles = frozenset({"ADMIN", "AUDITOR"})


class IsAnyStaff(RolePermission):
    """Dashboard, activos, reportes."""
    allowed_roles = frozenset({"ADMIN", "TI", "CONTABILIDAD", "AUDITOR"})


class IsAdminOrReadOnly(BasePermission):
    """Lectura para cualquier autenticado (dropdowns); escritura solo ADMIN."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == "ADMIN"


class CanAccessMovements(RolePermission):
    """Contabilidad consulta; ADMIN/TI registran."""
    allowed_roles = frozenset({"ADMIN", "TI", "CONTABILIDAD"})
    write_roles = frozenset({"ADMIN", "TI"})


class CanManageDocuments(RolePermission):
    """Lectura staff (detalle de activo); escritura sin AUDITOR."""
    allowed_roles = frozenset({"ADMIN", "TI", "CONTABILIDAD", "AUDITOR"})
    write_roles = frozenset({"ADMIN", "TI", "CONTABILIDAD"})


class CanManageCustodians(RolePermission):
    """Lectura staff (formularios); escritura ADMIN/TI."""
    allowed_roles = frozenset({"ADMIN", "TI", "CONTABILIDAD", "AUDITOR"})
    write_roles = frozenset({"ADMIN", "TI"})

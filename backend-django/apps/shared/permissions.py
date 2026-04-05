"""Permisos personalizados por rol para DRF."""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "ADMIN")


class IsTI(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ("ADMIN", "TI"))


class IsContabilidad(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ("ADMIN", "CONTABILIDAD")
        )


class IsAuditor(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ("ADMIN", "AUDITOR")
        )


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.role == "ADMIN"


class IsAnyStaff(BasePermission):
    """Cualquier usuario autenticado con rol del sistema."""
    VALID_ROLES = {"ADMIN", "TI", "CONTABILIDAD", "AUDITOR"}

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in self.VALID_ROLES
        )

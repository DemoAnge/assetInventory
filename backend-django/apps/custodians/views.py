from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.shared.permissions import IsAdmin, IsAnyStaff
from .models import Custodian
from .serializers import CustodianReadSerializer, CustodianWriteSerializer


class CustodianViewSet(viewsets.ModelViewSet):
    """
    CRUD para custodios de activos.

    GET    /api/v1/custodians/
    POST   /api/v1/custodians/
    GET    /api/v1/custodians/{id}/
    PATCH  /api/v1/custodians/{id}/
    DELETE /api/v1/custodians/{id}/   → 405 bloqueado por política de trazabilidad

    Acciones extra:
    POST /api/v1/custodians/{id}/deactivate/  → desactivación lógica
    POST /api/v1/custodians/{id}/activate/    → reactivar (solo ADMIN)
    """
    permission_classes = [IsAuthenticated, IsAnyStaff]
    filterset_fields   = ["is_active", "agency"]
    search_fields      = ["first_name", "last_name", "id_number", "position", "agency__name"]
    ordering_fields    = ["last_name", "first_name", "position", "agency__name", "created_at"]
    ordering           = ["last_name", "first_name"]

    def get_queryset(self):
        return (
            Custodian.objects
            .select_related("agency")
            .annotate(
                assets_count=Count(
                    "assets",
                    filter=Q(assets__is_active=True),
                )
            )
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return CustodianWriteSerializer
        return CustodianReadSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Eliminación física bloqueada por política de trazabilidad histórica."""
        return Response(
            {
                "detail": (
                    "No se permite eliminar custodios. "
                    "Use POST /{id}/deactivate/ para la desactivación lógica."
                )
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        """Desactivación lógica: marca el custodio como inactivo sin eliminar el registro."""
        custodian = self.get_object()
        if not custodian.is_active:
            return Response(
                {"detail": f"{custodian.full_name} ya está inactivo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        custodian.is_active = False
        custodian.updated_by = request.user
        custodian.save(update_fields=["is_active", "updated_by", "updated_at"])
        return Response({"detail": f"{custodian.full_name} desactivado exitosamente."})

    @action(detail=True, methods=["post"], url_path="activate",
            permission_classes=[IsAuthenticated, IsAdmin])
    def activate(self, request, pk=None):
        """Reactiva un custodio previamente desactivado."""
        custodian = self.get_object()
        if custodian.is_active:
            return Response(
                {"detail": f"{custodian.full_name} ya está activo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        custodian.is_active = True
        custodian.updated_by = request.user
        custodian.save(update_fields=["is_active", "updated_by", "updated_at"])
        return Response({"detail": f"{custodian.full_name} reactivado exitosamente."})

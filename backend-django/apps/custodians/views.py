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
    CRUD for asset custodians.

    GET    /api/v1/custodians/
    POST   /api/v1/custodians/
    GET    /api/v1/custodians/{id}/
    PATCH  /api/v1/custodians/{id}/
    DELETE /api/v1/custodians/{id}/   → 405 blocked by traceability policy

    Extra actions:
    POST /api/v1/custodians/{id}/deactivate/  → logical deactivation
    POST /api/v1/custodians/{id}/activate/    → reactivate
    """
    permission_classes = [IsAuthenticated, IsAnyStaff]
    filterset_fields   = ["is_active"]
    search_fields      = ["first_name", "last_name", "id_number", "position"]
    ordering_fields    = ["last_name", "first_name", "position", "created_at"]
    ordering           = ["last_name", "first_name"]

    def get_queryset(self):
        return Custodian.objects.annotate(
            assets_count=Count(
                "assets",
                filter=Q(assets__is_active=True),
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
        """Physical deletion blocked by historical traceability policy."""
        return Response(
            {
                "detail": (
                    "Deleting custodians is not allowed. "
                    "Use POST /{id}/deactivate/ for logical deactivation."
                )
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        """Logical deactivation: marks the custodian as inactive without deleting the record."""
        custodian = self.get_object()
        if not custodian.is_active:
            return Response(
                {"detail": f"{custodian.full_name} is already inactive."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        custodian.is_active = False
        custodian.updated_by = request.user
        custodian.save(update_fields=["is_active", "updated_by", "updated_at"])
        return Response({"detail": f"{custodian.full_name} deactivated successfully."})

    @action(detail=True, methods=["post"], url_path="activate",
            permission_classes=[IsAuthenticated, IsAdmin])
    def activate(self, request, pk=None):
        """Reactivates a previously deactivated custodian."""
        custodian = self.get_object()
        if custodian.is_active:
            return Response(
                {"detail": f"{custodian.full_name} is already active."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        custodian.is_active = True
        custodian.updated_by = request.user
        custodian.save(update_fields=["is_active", "updated_by", "updated_at"])
        return Response({"detail": f"{custodian.full_name} reactivated successfully."})

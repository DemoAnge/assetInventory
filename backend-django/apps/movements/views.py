"""
ViewSet de Movimientos. Regla crítica:
al trasladar un activo padre, sus componentes activos son arrastrados automáticamente.
"""
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.assets.models import Asset
from apps.audit.models import AuditLog, AuditAction
from apps.shared.permissions import IsTI
from apps.shared.utils import get_client_ip
from .models import AssetMovement
from .serializers import MovementReadSerializer, MovementWriteSerializer


class AssetMovementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTI]
    filterset_fields   = ["asset", "movement_type", "dest_agency", "origin_agency", "is_cascade"]
    search_fields      = ["asset__asset_code", "asset__name", "document_ref", "reason"]
    ordering           = ["-movement_date"]

    def get_queryset(self):
        return (
            AssetMovement.objects
            .select_related(
                "asset", "origin_agency", "dest_agency",
                "origin_custodian", "dest_custodian", "authorized_by",
            )
            .prefetch_related("component_movements__asset")
            .filter(is_cascade=False)  # Solo movimientos principales en el listado
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return MovementWriteSerializer
        return MovementReadSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        movement = serializer.save(created_by=self.request.user)
        asset = movement.asset
        self._apply_location_change(asset, movement)
        self._cascade_to_components(asset, movement)
        AuditLog.objects.create(
            user=self.request.user, action=AuditAction.ASSET_TRANSFER,
            model="AssetMovement", object_id=movement.pk,
            object_code=asset.asset_code, object_name=asset.name,
            module="movements", ip_address=get_client_ip(self.request),
            extra_data={
                "movement_type": movement.movement_type,
                "dest_agency": str(movement.dest_agency),
            },
        )

    def _apply_location_change(self, asset: Asset, movement: AssetMovement):
        """Actualiza la ubicación y custodio del activo según el movimiento."""
        update_fields = []
        if movement.dest_agency:
            asset.agency = movement.dest_agency
            update_fields.append("agency")
        if movement.dest_department:
            asset.department = movement.dest_department
            update_fields.append("department")
        if movement.dest_area:
            asset.area = movement.dest_area
            update_fields.append("area")
        if movement.dest_custodian:
            asset.custodian = movement.dest_custodian
            update_fields.append("custodian")
        if update_fields:
            asset.save(update_fields=update_fields)

    def _cascade_to_components(self, parent: Asset, parent_movement: AssetMovement):
        """
        Regla: el movimiento del padre arrastra a todos los componentes activos.
        Crea un movimiento hijo por cada componente.
        """
        components = parent.components.filter(is_active=True)
        for component in components:
            child_movement = AssetMovement.objects.create(
                asset=component,
                movement_type=parent_movement.movement_type,
                movement_date=parent_movement.movement_date,
                origin_agency=parent_movement.origin_agency,
                origin_department=parent_movement.origin_department,
                origin_area=parent_movement.origin_area,
                origin_custodian=parent_movement.origin_custodian,
                dest_agency=parent_movement.dest_agency,
                dest_department=parent_movement.dest_department,
                dest_area=parent_movement.dest_area,
                dest_custodian=parent_movement.dest_custodian,
                reason=f"[ARRASTRE] {parent_movement.reason}",
                authorized_by=parent_movement.authorized_by,
                document_ref=parent_movement.document_ref,
                parent_movement=parent_movement,
                is_cascade=True,
                created_by=parent_movement.created_by,
            )
            self._apply_location_change(component, child_movement)

    @action(detail=False, methods=["get"], url_path="asset-history")
    def asset_history(self, request):
        """GET /movements/asset-history/?asset_id=<id> — historial completo de un activo."""
        asset_id = request.query_params.get("asset_id")
        if not asset_id:
            return Response({"detail": "asset_id requerido."}, status=status.HTTP_400_BAD_REQUEST)
        movements = AssetMovement.objects.filter(asset_id=asset_id).order_by("-movement_date")
        return Response(MovementReadSerializer(movements, many=True).data)

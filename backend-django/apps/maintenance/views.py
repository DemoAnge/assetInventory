from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.assets.models import Asset
from apps.audit.models import AuditLog, AuditAction
from apps.shared.permissions import IsTI
from apps.shared.utils import get_client_ip
from .models import MaintenanceRecord, MaintenanceStatus
from .serializers import MaintenanceReadSerializer, MaintenanceWriteSerializer


class MaintenanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTI]
    filterset_fields   = ["asset", "maintenance_type", "status"]
    search_fields      = ["asset__asset_code", "asset__name", "technician", "work_order"]
    ordering           = ["-scheduled_date"]

    def get_queryset(self):
        return MaintenanceRecord.objects.select_related("asset").all()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return MaintenanceWriteSerializer
        return MaintenanceReadSerializer

    def perform_create(self, serializer):
        record = serializer.save(created_by=self.request.user)
        # Marcar activo como en mantenimiento si aplica
        if record.status == "EN_PROCESO":
            Asset.objects.filter(pk=record.asset_id).update(requires_maintenance=True)
        AuditLog.objects.create(
            user=self.request.user, action=AuditAction.MAINTENANCE,
            model="MaintenanceRecord", object_id=record.pk,
            object_code=record.asset.asset_code, object_name=record.asset.name,
            module="maintenance", ip_address=get_client_ip(self.request),
        )

    def perform_update(self, serializer):
        record = serializer.save(updated_by=self.request.user)
        # Quitar flag si completado
        if record.status == "COMPLETADO":
            Asset.objects.filter(pk=record.asset_id).update(requires_maintenance=False)

    @action(detail=False, methods=["get"], url_path="upcoming")
    def upcoming(self, request):
        """Mantenimientos programados en los próximos 30 días."""
        today = timezone.now().date()
        from datetime import timedelta
        qs = MaintenanceRecord.objects.filter(
            scheduled_date__gte=today,
            scheduled_date__lte=today + timedelta(days=30),
            status=MaintenanceStatus.PROGRAMADO,
        ).select_related("asset").order_by("scheduled_date")
        return Response(MaintenanceReadSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="overdue")
    def overdue(self, request):
        """Mantenimientos vencidos (fecha pasada y no completados)."""
        today = timezone.now().date()
        qs = MaintenanceRecord.objects.filter(
            scheduled_date__lt=today,
            status__in=[MaintenanceStatus.PROGRAMADO, MaintenanceStatus.EN_PROCESO],
        ).select_related("asset").order_by("scheduled_date")
        return Response(MaintenanceReadSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="asset-history")
    def asset_history(self, request):
        asset_id = request.query_params.get("asset_id")
        if not asset_id:
            return Response({"detail": "asset_id requerido."}, status=400)
        qs = MaintenanceRecord.objects.filter(asset_id=asset_id).order_by("-scheduled_date")
        return Response(MaintenanceReadSerializer(qs, many=True).data)

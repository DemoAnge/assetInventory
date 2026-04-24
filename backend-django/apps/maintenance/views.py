import re
from datetime import timedelta, datetime
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.assets.models import Asset
from apps.audit.models import AuditLog, AuditAction
from apps.shared.permissions import IsTI, IsAnyStaff
from apps.shared.utils import get_client_ip
from .models import MaintenanceRecord, MaintenanceStatus, MaintenanceStatusLog, Technician
from .serializers import (
    MaintenanceReadSerializer, MaintenanceWriteSerializer,
    MaintenanceStatusLogSerializer, TechnicianSerializer,
)


def _generate_work_order() -> str:
    """
    Genera número de OT secuencial: OT-YYYY-NNN.
    Garantiza unicidad por año y evita huecos.
    """
    year = datetime.now().year
    prefix = f"OT-{year}-"
    existing = (
        MaintenanceRecord.objects
        .filter(work_order__startswith=prefix)
        .values_list("work_order", flat=True)
    )
    used = set()
    for wo in existing:
        m = re.match(rf"^OT-{year}-(\d+)$", wo)
        if m:
            used.add(int(m.group(1)))
    n = 1
    while n in used:
        n += 1
    return f"{prefix}{str(n).zfill(3)}"


class TechnicianViewSet(viewsets.ModelViewSet):
    """
    CRUD de técnicos (internos y externos).
    GET  /maintenance/technicians/
    POST /maintenance/technicians/
    """
    permission_classes = [IsAuthenticated, IsAnyStaff]
    serializer_class   = TechnicianSerializer
    search_fields      = ["name", "company", "specialty", "email"]
    filterset_fields   = ["is_external", "is_active"]
    ordering           = ["name"]

    def get_queryset(self):
        return Technician.objects.select_related("user").filter(is_active=True)


class MaintenanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAnyStaff]
    filterset_fields   = ["asset", "maintenance_type", "status"]
    search_fields      = ["asset__asset_code", "asset__name", "technician", "work_order"]
    ordering           = ["-scheduled_date"]

    def get_queryset(self):
        return MaintenanceRecord.objects.select_related("asset", "technician_ref").prefetch_related("status_logs__changed_by").all()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return MaintenanceWriteSerializer
        return MaintenanceReadSerializer

    def perform_create(self, serializer):
        # Auto-generar OT si no se proveyó
        work_order = serializer.validated_data.get("work_order", "").strip()
        if not work_order:
            work_order = _generate_work_order()

        record = serializer.save(
            created_by=self.request.user,
            work_order=work_order,
        )

        # Sincronizar nombre del técnico si viene de catálogo
        if record.technician_ref and not record.technician:
            MaintenanceRecord.objects.filter(pk=record.pk).update(technician=record.technician_ref.name)
            record.refresh_from_db()

        # Primer log de estado automático
        MaintenanceStatusLog.objects.create(
            record=record,
            status=record.status,
            notes="Registro creado.",
            changed_by=self.request.user,
        )

        if record.status == MaintenanceStatus.EN_PROCESO:
            Asset.objects.filter(pk=record.asset_id).update(requires_maintenance=True)

        AuditLog.objects.create(
            user=self.request.user, action=AuditAction.MAINTENANCE,
            model="MaintenanceRecord", object_id=record.pk,
            object_code=record.asset.asset_code, object_name=record.asset.name,
            module="maintenance", ip_address=get_client_ip(self.request),
        )

    def perform_update(self, serializer):
        old = self.get_object()
        old_status = old.status
        record = serializer.save(updated_by=self.request.user)

        # Sincronizar nombre del técnico si viene de catálogo
        if record.technician_ref and not record.technician:
            MaintenanceRecord.objects.filter(pk=record.pk).update(technician=record.technician_ref.name)

        # Log automático si cambió el estado
        if record.status != old_status:
            MaintenanceStatusLog.objects.create(
                record=record,
                status=record.status,
                notes=f"Estado cambiado de {old_status} a {record.status}.",
                changed_by=self.request.user,
            )

        if record.status == MaintenanceStatus.COMPLETADO:
            Asset.objects.filter(pk=record.asset_id).update(requires_maintenance=False)
        elif record.status == MaintenanceStatus.EN_PROCESO:
            Asset.objects.filter(pk=record.asset_id).update(requires_maintenance=True)

    # ── GET /maintenance/next-ot/ ─────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="next-ot")
    def next_ot(self, request):
        """Devuelve el siguiente número de OT disponible."""
        return Response({"work_order": _generate_work_order()})

    # ── POST /maintenance/{id}/add-status-log/ ────────────────────────────────
    @action(detail=True, methods=["post"], url_path="add-status-log")
    def add_status_log(self, request, pk=None):
        """
        Agrega un log de cambio de estado manual.
        Body: { status: str, notes: str }
        """
        record = self.get_object()
        new_status = request.data.get("status")
        notes = request.data.get("notes", "")

        if not new_status or new_status not in [s.value for s in MaintenanceStatus]:
            return Response({"detail": "Estado inválido."}, status=status.HTTP_400_BAD_REQUEST)

        old_status = record.status
        record.status = new_status
        if new_status == MaintenanceStatus.COMPLETADO and not record.completed_date:
            record.completed_date = timezone.now().date()
        record.save(update_fields=["status", "completed_date"])

        log = MaintenanceStatusLog.objects.create(
            record=record,
            status=new_status,
            notes=notes or f"Estado actualizado de {old_status} a {new_status}.",
            changed_by=request.user,
        )

        if new_status == MaintenanceStatus.COMPLETADO:
            Asset.objects.filter(pk=record.asset_id).update(requires_maintenance=False)
        elif new_status == MaintenanceStatus.EN_PROCESO:
            Asset.objects.filter(pk=record.asset_id).update(requires_maintenance=True)

        return Response(MaintenanceStatusLogSerializer(log).data)

    # ── GET /maintenance/upcoming/ ────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="upcoming")
    def upcoming(self, request):
        today = timezone.now().date()
        qs = MaintenanceRecord.objects.filter(
            scheduled_date__gte=today,
            scheduled_date__lte=today + timedelta(days=30),
            status=MaintenanceStatus.PROGRAMADO,
        ).select_related("asset", "technician_ref").prefetch_related("status_logs").order_by("scheduled_date")
        return Response(MaintenanceReadSerializer(qs, many=True).data)

    # ── GET /maintenance/overdue/ ─────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="overdue")
    def overdue(self, request):
        today = timezone.now().date()
        qs = MaintenanceRecord.objects.filter(
            scheduled_date__lt=today,
            status__in=[MaintenanceStatus.PROGRAMADO, MaintenanceStatus.EN_PROCESO],
        ).select_related("asset", "technician_ref").prefetch_related("status_logs").order_by("scheduled_date")
        return Response(MaintenanceReadSerializer(qs, many=True).data)

    # ── GET /maintenance/asset-history/ ──────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="asset-history")
    def asset_history(self, request):
        asset_id = request.query_params.get("asset_id")
        if not asset_id:
            return Response({"detail": "asset_id requerido."}, status=400)
        qs = MaintenanceRecord.objects.filter(asset_id=asset_id).select_related("asset", "technician_ref").prefetch_related("status_logs").order_by("-scheduled_date")
        return Response(MaintenanceReadSerializer(qs, many=True).data)

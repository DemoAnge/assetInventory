"""
Endpoints de auditoría con filtros por fecha.
GET /api/v1/audit/ingresos/?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD
GET /api/v1/audit/bajas/
GET /api/v1/audit/modificaciones/
GET /api/v1/audit/resumen/
GET /api/v1/audit/timeline/{id}/
"""
from django.db.models import Count, Q
from django.utils.dateparse import parse_date
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.shared.permissions import IsAnyStaff
from .models import AuditLog, AuditAction
from .serializers import AuditLogSerializer

# Módulos visibles por rol (ADMIN y AUDITOR ven todo — sin filtro)
MODULES_BY_ROLE = {
    "TI":           ["assets", "it_module", "maintenance", "movements"],
    "CONTABILIDAD": ["assets", "accounting", "movements", "documents"],
}


def parse_date_range(request):
    """Parsea fecha_desde y fecha_hasta del querystring."""
    fecha_desde = request.query_params.get("fecha_desde")
    fecha_hasta = request.query_params.get("fecha_hasta")
    errors = {}
    if fecha_desde:
        fecha_desde = parse_date(fecha_desde)
        if not fecha_desde:
            errors["fecha_desde"] = "Formato inválido. Use YYYY-MM-DD."
    if fecha_hasta:
        fecha_hasta = parse_date(fecha_hasta)
        if not fecha_hasta:
            errors["fecha_hasta"] = "Formato inválido. Use YYYY-MM-DD."
    return fecha_desde, fecha_hasta, errors


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Logs de auditoría — solo lectura.
    Visibilidad por rol:
      TI           → assets, it_module, maintenance, movements
      CONTABILIDAD → assets, accounting, movements, documents
      AUDITOR      → todo
      ADMIN        → todo
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]
    filterset_fields = ["action", "model", "module", "user", "success"]
    search_fields = ["object_code", "object_name", "user_email"]
    ordering_fields = ["action_date"]
    ordering = ["-action_date"]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("user").all()
        role = getattr(self.request.user, "role", None)
        allowed_modules = MODULES_BY_ROLE.get(role)
        if allowed_modules:
            qs = qs.filter(module__in=allowed_modules)
        fecha_desde, fecha_hasta, _ = parse_date_range(self.request)
        if fecha_desde:
            qs = qs.filter(action_date__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(action_date__date__lte=fecha_hasta)
        return qs

    @action(detail=False, methods=["get"], url_path="ingresos")
    def ingresos(self, request):
        """Historial de altas/ingresos de activos."""
        fecha_desde, fecha_hasta, errors = parse_date_range(request)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        qs = AuditLog.objects.filter(action=AuditAction.ASSET_ACTIVATION)
        if fecha_desde:
            qs = qs.filter(action_date__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(action_date__date__lte=fecha_hasta)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(AuditLogSerializer(page, many=True).data)

    @action(detail=False, methods=["get"], url_path="bajas")
    def bajas(self, request):
        """Historial de bajas de activos."""
        fecha_desde, fecha_hasta, errors = parse_date_range(request)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        qs = AuditLog.objects.filter(action=AuditAction.ASSET_DEACTIVATION)
        if fecha_desde:
            qs = qs.filter(action_date__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(action_date__date__lte=fecha_hasta)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(AuditLogSerializer(page, many=True).data)

    @action(detail=False, methods=["get"], url_path="modificaciones")
    def modificaciones(self, request):
        """Historial de modificaciones."""
        fecha_desde, fecha_hasta, errors = parse_date_range(request)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        qs = AuditLog.objects.filter(action=AuditAction.UPDATE)
        if fecha_desde:
            qs = qs.filter(action_date__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(action_date__date__lte=fecha_hasta)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(AuditLogSerializer(page, many=True).data)

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        """KPIs de actividad: conteos por tipo de acción."""
        fecha_desde, fecha_hasta, errors = parse_date_range(request)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        qs = AuditLog.objects.all()
        if fecha_desde:
            qs = qs.filter(action_date__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(action_date__date__lte=fecha_hasta)

        resumen = qs.values("action").annotate(total=Count("id")).order_by("-total")
        return Response({
            "periodo": {"desde": str(fecha_desde or ""), "hasta": str(fecha_hasta or "")},
            "total_eventos": qs.count(),
            "por_accion": list(resumen),
            "ingresos": qs.filter(action=AuditAction.ASSET_ACTIVATION).count(),
            "bajas": qs.filter(action=AuditAction.ASSET_DEACTIVATION).count(),
            "modificaciones": qs.filter(action=AuditAction.UPDATE).count(),
            "ventas": qs.filter(action=AuditAction.ASSET_SALE).count(),
            "traslados": qs.filter(action=AuditAction.ASSET_TRANSFER).count(),
        })

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        """Línea de tiempo completa de un activo específico."""
        qs = AuditLog.objects.filter(
            model="Asset", object_id=pk
        ).order_by("action_date")
        return Response(AuditLogSerializer(qs, many=True).data)

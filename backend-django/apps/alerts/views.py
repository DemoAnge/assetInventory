from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.shared.permissions import IsAnyStaff
from apps.shared.utils import get_client_ip
from .models import Alert
from .serializers import AlertSerializer, AlertResolveSerializer
from .engine import run_alert_engine


class AlertViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAnyStaff]
    filterset_fields   = ["alert_type", "severity", "is_read", "is_resolved"]
    search_fields      = ["title", "message", "asset__asset_code"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Alert.objects.select_related("asset", "resolved_by").all()
        # Filtrar por roles del usuario
        qs = qs.filter(
            models.Q(target_roles__contains=user.role) |
            models.Q(target_user=user) |
            models.Q(target_roles=[])
        )
        return qs

    def get_serializer_class(self):
        return AlertSerializer

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        alert = self.get_object()
        serializer = AlertResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        alert.is_resolved = True
        alert.resolved_by = request.user
        alert.resolved_at = timezone.now()
        alert.resolution_note = serializer.validated_data.get("resolution_note", "")
        alert.save(update_fields=["is_resolved", "resolved_by", "resolved_at", "resolution_note"])
        return Response({"detail": "Alerta resuelta."})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        alert = self.get_object()
        alert.is_read = True
        alert.save(update_fields=["is_read"])
        return Response({"detail": "Marcada como leída."})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"detail": "Todas marcadas como leídas."})

    @action(detail=False, methods=["post"], url_path="run-engine")
    def run_engine(self, request):
        """Ejecuta el engine de alertas manualmente (normalmente por cron)."""
        if request.user.role not in ("ADMIN", "TI"):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        results = run_alert_engine()
        return Response({"message": "Engine ejecutado.", "results": results})

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        qs = self.get_queryset().filter(is_resolved=False)
        return Response({
            "total_unresolved": qs.count(),
            "critica": qs.filter(severity="CRITICA").count(),
            "alta":    qs.filter(severity="ALTA").count(),
            "media":   qs.filter(severity="MEDIA").count(),
            "baja":    qs.filter(severity="BAJA").count(),
            "unread":  qs.filter(is_read=False).count(),
        })


from django.db import models

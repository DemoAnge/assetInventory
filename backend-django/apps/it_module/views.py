from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.shared.permissions import IsTI
from .models import ITAssetProfile, SoftwareLicense
from .serializers import (
    ITAssetProfileReadSerializer, ITAssetProfileWriteSerializer,
    SoftwareLicenseReadSerializer, SoftwareLicenseWriteSerializer,
)


class ITAssetProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTI]
    filterset_fields   = ["risk_level", "is_server", "is_network_device", "asset"]
    search_fields      = ["hostname", "ip_address", "os_name", "asset__asset_code"]
    ordering           = ["risk_level", "asset__asset_code"]

    def get_queryset(self):
        return ITAssetProfile.objects.select_related("asset").all()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ITAssetProfileWriteSerializer
        return ITAssetProfileReadSerializer

    @action(detail=False, methods=["get"], url_path="critical")
    def critical(self, request):
        """Activos TI de nivel CRITICO o ALTO — para Superintendencia de Bancos."""
        qs = self.get_queryset().filter(risk_level__in=["CRITICO", "ALTO"])
        return Response(ITAssetProfileReadSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="pending-scan")
    def pending_scan(self, request):
        """Activos sin escaneo de seguridad en los últimos 30 días."""
        from datetime import timedelta
        threshold = timezone.now().date() - timedelta(days=30)
        qs = self.get_queryset().filter(
            models.Q(last_scan_date__lt=threshold) | models.Q(last_scan_date__isnull=True)
        )
        return Response(ITAssetProfileReadSerializer(qs, many=True).data)


class SoftwareLicenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTI]
    filterset_fields   = ["license_type"]
    search_fields      = ["software_name", "vendor", "version"]
    ordering           = ["software_name"]

    def get_queryset(self):
        return SoftwareLicense.objects.prefetch_related("assets").all()

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return SoftwareLicenseWriteSerializer
        return SoftwareLicenseReadSerializer

    @action(detail=False, methods=["get"], url_path="expiring")
    def expiring(self, request):
        """Licencias que vencen en los próximos 60 días."""
        from datetime import timedelta
        today = timezone.now().date()
        qs = self.get_queryset().filter(
            expiry_date__gte=today,
            expiry_date__lte=today + timedelta(days=60),
        )
        return Response(SoftwareLicenseReadSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="expired")
    def expired(self, request):
        qs = self.get_queryset().filter(expiry_date__lt=timezone.now().date())
        return Response(SoftwareLicenseReadSerializer(qs, many=True).data)


# Import corregido (models.Q debe usarse desde django)
from django.db import models

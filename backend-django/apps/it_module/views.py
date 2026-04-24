from django.db import models as db_models
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
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
            Q(last_scan_date__lt=threshold) | Q(last_scan_date__isnull=True)
        )
        return Response(ITAssetProfileReadSerializer(qs, many=True).data)


class SoftwareLicenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTI]
    filterset_fields   = ["license_type"]
    search_fields      = ["software_name", "vendor", "version"]
    ordering           = ["software_name"]

    def get_queryset(self):
        qs = SoftwareLicense.objects.prefetch_related("assets").all()
        asset_id = self.request.query_params.get("asset_id")
        if asset_id:
            qs = qs.filter(assets__id=asset_id)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return SoftwareLicenseWriteSerializer
        return SoftwareLicenseReadSerializer

    @action(detail=False, methods=["get"], url_path="expiring")
    def expiring(self, request):
        """Licencias que vencen en los próximos 60 días."""
        from datetime import timedelta
        today = timezone.now().date()
        qs = SoftwareLicense.objects.prefetch_related("assets").filter(
            expiry_date__gte=today,
            expiry_date__lte=today + timedelta(days=60),
        )
        return Response(SoftwareLicenseReadSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="expired")
    def expired(self, request):
        qs = SoftwareLicense.objects.prefetch_related("assets").filter(
            expiry_date__lt=timezone.now().date()
        )
        return Response(SoftwareLicenseReadSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        """
        Asigna esta licencia a un activo.
        Body: { asset_id: int }
        """
        from apps.assets.models import Asset
        license_obj = self.get_object()
        asset_id = request.data.get("asset_id")
        if not asset_id:
            return Response({"detail": "asset_id es requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            asset = Asset.objects.get(pk=asset_id, is_active=True)
        except Asset.DoesNotExist:
            return Response({"detail": "Activo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if license_obj.assets.filter(pk=asset_id).exists():
            return Response({"detail": "El activo ya tiene esta licencia asignada."}, status=status.HTTP_400_BAD_REQUEST)

        if license_obj.available_seats <= 0:
            return Response(
                {"detail": f"Sin licencias disponibles. Total: {license_obj.seats}, En uso: {license_obj.used_seats}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        license_obj.assets.add(asset)
        SoftwareLicense.objects.filter(pk=license_obj.pk).update(
            used_seats=db_models.F("used_seats") + 1
        )
        license_obj.refresh_from_db()
        return Response(SoftwareLicenseReadSerializer(license_obj).data)

    @action(detail=True, methods=["post"], url_path="unassign")
    def unassign(self, request, pk=None):
        """
        Quita esta licencia de un activo.
        Body: { asset_id: int }
        """
        from apps.assets.models import Asset
        license_obj = self.get_object()
        asset_id = request.data.get("asset_id")
        if not asset_id:
            return Response({"detail": "asset_id es requerido."}, status=status.HTTP_400_BAD_REQUEST)

        if not license_obj.assets.filter(pk=asset_id).exists():
            return Response({"detail": "El activo no tiene esta licencia asignada."}, status=status.HTTP_400_BAD_REQUEST)

        license_obj.assets.remove(asset_id)
        SoftwareLicense.objects.filter(pk=license_obj.pk).update(
            used_seats=db_models.F("used_seats") - 1
        )
        license_obj.refresh_from_db()
        return Response(SoftwareLicenseReadSerializer(license_obj).data)

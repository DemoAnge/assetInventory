"""
ViewSets del módulo de Activos.
Implementa todos los endpoints incluyendo componentes 1:N y validación de baja.
"""
import io
import qrcode
import base64
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditLog, AuditAction
from apps.shared.permissions import IsAdmin, IsTI, IsAnyStaff
from apps.shared.utils import get_client_ip
from .models import Asset, AssetStatus, Brand, AssetType, AssetModel
from .serializers import (
    AssetReadSerializer, AssetWriteSerializer,
    ComponentReadSerializer, AssetDeactivateSerializer,
    BrandSerializer, AssetTypeSerializer, AssetModelSerializer,
)


class AssetViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de activos.
    GET    /api/v1/assets/
    POST   /api/v1/assets/
    GET    /api/v1/assets/{id}/
    PATCH  /api/v1/assets/{id}/
    DELETE /api/v1/assets/{id}/  (baja lógica)

    Endpoints adicionales:
    GET  /api/v1/assets/{id}/components/
    POST /api/v1/assets/{id}/components/
    DELETE /api/v1/assets/{id}/components/{comp_id}/
    GET  /api/v1/assets/{id}/validate-deactivation/
    POST /api/v1/assets/{id}/deactivate/
    GET  /api/v1/assets/{id}/qr/
    GET  /api/v1/assets/by-qr/?uuid=<uuid>
    """
    permission_classes  = [IsAuthenticated, IsAnyStaff]
    filterset_fields    = ["category", "status", "agency", "department", "area",
                           "is_active", "is_critical_it", "is_fully_depreciated",
                           "parent_asset", "custodian"]
    search_fields       = ["asset_code", "name", "serial_number", "brand",
                           "invoice_number", "supplier"]
    ordering_fields     = ["asset_code", "name", "purchase_date", "purchase_value", "created_at"]
    ordering            = ["-created_at"]

    # Categorías que competen al módulo TI
    IT_CATEGORIES = ("COMPUTO", "TELECOMUNICACION")

    def get_queryset(self):
        qs = (
            Asset.objects
            .select_related("agency", "department", "area", "custodian", "parent_asset")
            .prefetch_related("components")
            .filter(is_active=True)
        )
        # TI solo ve activos de cómputo y telecomunicaciones
        if getattr(self.request.user, "role", None) == "TI":
            qs = qs.filter(category__in=self.IT_CATEGORIES)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AssetWriteSerializer
        return AssetReadSerializer

    # ── Create ────────────────────────────────────────────────────────────────
    def perform_create(self, serializer):
        asset = serializer.save(created_by=self.request.user)
        AuditLog.objects.create(
            user=self.request.user, action=AuditAction.ASSET_ACTIVATION,
            model="Asset", object_id=asset.pk,
            object_code=asset.asset_code, object_name=asset.name,
            module="assets", ip_address=get_client_ip(self.request),
        )

    # ── Update ────────────────────────────────────────────────────────────────
    def perform_update(self, serializer):
        asset = serializer.save(updated_by=self.request.user)
        AuditLog.objects.create(
            user=self.request.user, action=AuditAction.UPDATE,
            model="Asset", object_id=asset.pk,
            object_code=asset.asset_code, object_name=asset.name,
            module="assets", ip_address=get_client_ip(self.request),
        )

    # ── Baja lógica (DELETE) ──────────────────────────────────────────────────
    def destroy(self, request, *args, **kwargs):
        """El DELETE hace baja lógica, no elimina el registro físicamente."""
        asset = self.get_object()
        if asset.components.filter(is_active=True).exists():
            return Response(
                {"detail": "No se puede dar de baja un activo con componentes activos."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        asset.is_active = False
        asset.status = AssetStatus.INACTIVO
        asset.deactivation_date = timezone.now().date()
        asset.save(update_fields=["is_active", "status", "deactivation_date"])
        AuditLog.objects.create(
            user=request.user, action=AuditAction.ASSET_DEACTIVATION,
            model="Asset", object_id=asset.pk,
            object_code=asset.asset_code, object_name=asset.name,
            module="assets", ip_address=get_client_ip(request),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── GET /assets/{id}/components/ ─────────────────────────────────────────
    @action(detail=True, methods=["get"], url_path="components")
    def list_components(self, request, pk=None):
        asset = self.get_object()
        components = asset.components.filter(is_active=True)
        return Response(ComponentReadSerializer(components, many=True).data)

    # ── POST /assets/{id}/components/ ────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="components", url_name="add-component")
    def add_component(self, request, pk=None):
        parent = self.get_object()
        data = request.data.copy()
        data["parent_asset"] = parent.pk
        serializer = AssetWriteSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        component = serializer.save(
            created_by=request.user,
            agency=parent.agency,
            department=parent.department,
            area=parent.area,
        )
        AuditLog.objects.create(
            user=request.user, action=AuditAction.ASSET_ACTIVATION,
            model="Asset", object_id=component.pk,
            object_code=component.asset_code, object_name=component.name,
            module="assets",
            extra_data={"parent_asset_id": parent.pk, "parent_code": parent.asset_code},
            ip_address=get_client_ip(request),
        )
        return Response(AssetReadSerializer(component).data, status=status.HTTP_201_CREATED)

    # ── DELETE /assets/{id}/components/{comp_id}/ ────────────────────────────
    @action(detail=True, methods=["delete"], url_path=r"components/(?P<comp_id>\d+)")
    def remove_component(self, request, pk=None, comp_id=None):
        parent = self.get_object()
        try:
            component = Asset.objects.get(pk=comp_id, parent_asset=parent, is_active=True)
        except Asset.DoesNotExist:
            return Response({"detail": "Componente no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        component.parent_asset = None
        component.component_type = None
        component.save(update_fields=["parent_asset", "component_type", "updated_by"])
        AuditLog.objects.create(
            user=request.user, action=AuditAction.UPDATE,
            model="Asset", object_id=component.pk,
            object_code=component.asset_code, object_name=component.name,
            module="assets",
            changed_fields={"parent_asset": {"before": str(parent.pk), "after": None}},
            ip_address=get_client_ip(request),
        )
        return Response({"detail": "Componente desasociado del activo padre."})

    # ── GET /assets/{id}/validate-deactivation/ ──────────────────────────────
    @action(detail=True, methods=["get"], url_path="validate-deactivation")
    def validate_deactivation(self, request, pk=None):
        asset = self.get_object()
        active_components = asset.components.filter(is_active=True)
        can_deactivate = not active_components.exists()
        return Response({
            "can_deactivate": can_deactivate,
            "active_components_count": active_components.count(),
            "active_components": ComponentReadSerializer(active_components, many=True).data,
            "message": (
                "El activo puede darse de baja." if can_deactivate
                else f"Tiene {active_components.count()} componente(s) activo(s). Debe disolverlos primero."
            ),
        })

    # ── POST /assets/{id}/deactivate/ ────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        asset = self.get_object()
        serializer = AssetDeactivateSerializer(data=request.data, context={"asset": asset})
        serializer.is_valid(raise_exception=True)
        asset.is_active = False
        asset.status = AssetStatus.INACTIVO
        asset.deactivation_date = serializer.validated_data["deactivation_date"]
        asset.save(update_fields=["is_active", "status", "deactivation_date"])
        AuditLog.objects.create(
            user=request.user, action=AuditAction.ASSET_DEACTIVATION,
            model="Asset", object_id=asset.pk,
            object_code=asset.asset_code, object_name=asset.name,
            module="assets",
            extra_data={"reason": serializer.validated_data["reason"]},
            ip_address=get_client_ip(request),
        )
        return Response({"detail": f"Activo {asset.asset_code} dado de baja correctamente."})

    # ── GET /assets/{id}/qr/ ─────────────────────────────────────────────────
    @action(detail=True, methods=["get"], url_path="qr")
    def get_qr(self, request, pk=None):
        asset = self.get_object()
        qr_data = f"ACTIVO:{asset.asset_code}|UUID:{asset.qr_uuid}|NOMBRE:{asset.name}"
        img = qrcode.make(qr_data)
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        qr_b64 = base64.b64encode(buffer.getvalue()).decode()
        return Response({
            "asset_code": asset.asset_code,
            "qr_uuid": str(asset.qr_uuid),
            "qr_base64": qr_b64,
            "qr_data": qr_data,
        })

    # ── GET /assets/by-qr/?uuid=<uuid> ───────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="by-qr")
    def by_qr(self, request):
        uuid_val = request.query_params.get("uuid")
        if not uuid_val:
            return Response({"detail": "Parámetro uuid requerido."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            asset = Asset.objects.get(qr_uuid=uuid_val)
            return Response(AssetReadSerializer(asset).data)
        except Asset.DoesNotExist:
            return Response({"detail": "Activo no encontrado."}, status=status.HTTP_404_NOT_FOUND)


# ── ViewSets de catálogos normalizados ────────────────────────────────────────

class BrandViewSet(viewsets.ModelViewSet):
    """
    CRUD de marcas.
    GET    /api/v1/assets/brands/
    POST   /api/v1/assets/brands/
    PATCH  /api/v1/assets/brands/{id}/
    DELETE /api/v1/assets/brands/{id}/
    """
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]
    search_fields = ["name", "country"]
    ordering_fields = ["name"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()


class AssetTypeViewSet(viewsets.ModelViewSet):
    """
    CRUD de tipos de activo (Laptop, Servidor, Switch...).
    GET  /api/v1/assets/asset-types/
    POST /api/v1/assets/asset-types/
    """
    queryset = AssetType.objects.all()
    serializer_class = AssetTypeSerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]
    filterset_fields = ["category"]
    search_fields = ["name"]
    ordering_fields = ["category", "name"]
    ordering = ["category", "name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()


class AssetModelViewSet(viewsets.ModelViewSet):
    """
    CRUD de modelos de activo (Dell Latitude 5540, HP ProLiant DL380...).
    GET  /api/v1/assets/asset-models/?brand=1&asset_type=2
    POST /api/v1/assets/asset-models/
    """
    queryset = AssetModel.objects.select_related("brand", "asset_type").all()
    serializer_class = AssetModelSerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]
    filterset_fields = ["brand", "asset_type", "asset_type__category"]
    search_fields = ["name", "brand__name", "asset_type__name"]
    ordering_fields = ["brand__name", "name"]
    ordering = ["brand__name", "name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

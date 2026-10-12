"""
ViewSets del módulo de Activos.
Implementa todos los endpoints incluyendo componentes 1:N y validación de baja.
"""
import io
import qrcode
import base64
from django.db.models import Count, Prefetch, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditLog, AuditAction
from apps.shared.permissions import IsAnyStaff
from apps.shared.utils import get_client_ip
from .models import Asset
from .serializers import (
    AssetReadSerializer, AssetWriteSerializer,
    ComponentReadSerializer, AssetDeactivateSerializer,
)
from .services import AssetDomainError, deactivate_asset, reactivate_asset


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
    search_fields       = ["asset_code", "name", "serial_number",
                           "asset_model__brand__name", "asset_model__name",
                           "invoice_number", "supplier"]
    ordering_fields     = ["asset_code", "name", "purchase_date", "created_at"]
    ordering            = ["-created_at"]

    # Categorías que competen al módulo TI
    IT_CATEGORIES = ("COMPUTO", "TELECOMUNICACION")

    def get_queryset(self):
        params = self.request.query_params
        any_status   = params.get("any_status") == "true"   # ignora filtro is_active
        is_active_param = params.get("is_active")

        qs = (
            Asset.objects
            .select_related(
                "agency", "department", "area", "custodian", "parent_asset",
                "it_profile", "account_code",
                "asset_model__brand", "asset_model__asset_type",
            )
            .prefetch_related(
                Prefetch(
                    "components",
                    queryset=Asset.objects.select_related("asset_model__brand"),
                )
            )
            .annotate(
                components_count=Count(
                    "components",
                    filter=Q(components__is_active=True),
                    distinct=True,
                )
            )
        )
        if not any_status:
            if is_active_param is None:
                qs = qs.filter(is_active=True)
            elif is_active_param.lower() in ("false", "0"):
                qs = qs.filter(is_active=False)
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
        try:
            deactivate_asset(
                asset, request.user,
                reason="Baja administrativa del activo.",
                ip_address=get_client_ip(request),
            )
        except AssetDomainError as exc:
            return Response({"detail": exc.message}, status=exc.status_code)
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

    # ── POST /assets/{id}/attach-component/ ─────────────────────────────────
    @action(detail=True, methods=["post"], url_path="attach-component")
    def attach_component(self, request, pk=None):
        """
        Asocia un activo EXISTENTE como componente de este activo padre.
        Body: { component_id: int, component_type: str }
        """
        parent = self.get_object()
        component_id   = request.data.get("component_id")
        component_type = request.data.get("component_type", "OTRO")

        if not component_id:
            return Response({"detail": "component_id es requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            component = Asset.objects.get(pk=component_id, is_active=True)
        except Asset.DoesNotExist:
            return Response({"detail": "Activo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if component.pk == parent.pk:
            return Response({"detail": "Un activo no puede ser componente de sí mismo."}, status=status.HTTP_400_BAD_REQUEST)
        if component.parent_asset_id:
            return Response({"detail": "Este activo ya es componente de otro activo."}, status=status.HTTP_400_BAD_REQUEST)
        if component.components.filter(is_active=True).exists():
            return Response({"detail": "No se puede asociar un activo que ya tiene componentes propios."}, status=status.HTTP_400_BAD_REQUEST)

        component.parent_asset   = parent
        component.component_type = component_type
        component.save(update_fields=["parent_asset", "component_type"])

        AuditLog.objects.create(
            user=request.user, action=AuditAction.UPDATE,
            model="Asset", object_id=component.pk,
            object_code=component.asset_code, object_name=component.name,
            module="assets",
            changed_fields={"parent_asset": {"before": None, "after": str(parent.pk)}},
            ip_address=get_client_ip(request),
        )
        return Response(AssetReadSerializer(component).data)

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
        try:
            deactivate_asset(
                asset, request.user,
                reason=serializer.validated_data["reason"],
                deactivation_date=serializer.validated_data["deactivation_date"],
                ip_address=get_client_ip(request),
                extra_data={"reason": serializer.validated_data["reason"]},
            )
        except AssetDomainError as exc:
            return Response({"detail": exc.message}, status=exc.status_code)
        return Response({"detail": f"Activo {asset.asset_code} dado de baja correctamente."})

    # ── POST /assets/{id}/reactivate/ ────────────────────────────────────────
    @action(detail=False, methods=["post"], url_path=r"(?P<pk>[^/.]+)/reactivate")
    def reactivate(self, request, pk=None):
        """
        Reactiva un activo inactivo.
        Body: { status: str, reason: str (min 10 chars) }
        El motivo es obligatorio y queda registrado en AuditLog y Movimiento.
        """
        try:
            asset = (
                Asset.objects
                .select_related("agency", "department", "area", "custodian")
                .get(pk=pk, is_active=False)
            )
        except Asset.DoesNotExist:
            if Asset.objects.filter(pk=pk, is_active=True).exists():
                return Response({"detail": "El activo ya se encuentra activo."}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"detail": "Activo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        new_status = (request.data.get("status") or "ACTIVO").strip()
        reason = (request.data.get("reason") or "").strip()
        try:
            reactivate_asset(
                asset, request.user,
                new_status=new_status,
                reason=reason,
                ip_address=get_client_ip(request),
            )
        except AssetDomainError as exc:
            return Response({"detail": exc.message}, status=exc.status_code)
        return Response({"detail": f"Activo {asset.asset_code} reactivado con estado '{new_status}'."})

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

    # ── GET /assets/choices/ ─────────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="choices",
            permission_classes=[IsAuthenticated])
    def choices(self, request):
        """
        Devuelve los choices del modelo Asset como listas {value, label}.
        Evita quemado de constantes en el frontend.
        GET /api/v1/assets/choices/
        """
        from .models import ComponentType, AssetCategory, AssetStatus
        return Response({
            "component_types": [
                {"value": v, "label": l} for v, l in ComponentType.choices
            ],
            "asset_categories": [
                {"value": v, "label": l} for v, l in AssetCategory.choices
            ],
            "asset_statuses": [
                {"value": v, "label": l} for v, l in AssetStatus.choices
            ],
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

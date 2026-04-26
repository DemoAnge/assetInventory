"""
ViewSets del módulo de Activos.
Implementa todos los endpoints incluyendo componentes 1:N y validación de baja.
"""
import io
import qrcode
import base64
from django.utils import timezone
from django.db import transaction
import re
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditLog, AuditAction
from apps.movements.models import AssetMovement, MovementType
from apps.shared.notifier import notify_role
from apps.shared.permissions import IsAdmin, IsTI, IsAnyStaff
from apps.shared.utils import get_client_ip
from .models import Asset, AssetStatus, Brand, AssetType, AssetModel, AccountCode
from .serializers import (
    AssetReadSerializer, AssetWriteSerializer,
    ComponentReadSerializer, AssetDeactivateSerializer,
    BrandSerializer, AssetTypeSerializer, AssetModelSerializer,
    AccountCodeSerializer,
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
    search_fields       = ["asset_code", "name", "serial_number",
                           "asset_model__brand__name", "asset_model__name",
                           "invoice_number", "supplier"]
    ordering_fields     = ["asset_code", "name", "purchase_date", "purchase_value", "created_at"]
    ordering            = ["-created_at"]

    # Categorías que competen al módulo TI
    IT_CATEGORIES = ("COMPUTO", "TELECOMUNICACION")

    def get_queryset(self):
        params = self.request.query_params
        any_status   = params.get("any_status") == "true"   # ignora filtro is_active
        is_active_param = params.get("is_active")

        qs = (
            Asset.objects
            .select_related("agency", "department", "area", "custodian", "parent_asset", "it_profile")
            .prefetch_related("components")
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
    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """El DELETE hace baja lógica, no elimina el registro físicamente."""
        asset = self.get_object()
        if asset.components.filter(is_active=True).exists():
            return Response(
                {"detail": "No se puede dar de baja un activo con componentes activos."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        baja_date = timezone.now().date()
        # Capturar ubicación/custodio antes de modificar el activo
        orig_agency = asset.agency
        orig_department = asset.department
        orig_area = asset.area
        orig_custodian = asset.custodian

        asset.is_active = False
        asset.status = AssetStatus.INACTIVO
        asset.deactivation_date = baja_date
        asset.save(update_fields=["is_active", "status", "deactivation_date"])

        AssetMovement.objects.create(
            asset=asset,
            movement_type=MovementType.BAJA,
            movement_date=baja_date,
            origin_agency=orig_agency,
            origin_department=orig_department,
            origin_area=orig_area,
            origin_custodian=orig_custodian,
            reason="Baja administrativa del activo.",
            created_by=request.user,
        )
        AuditLog.objects.create(
            user=request.user, action=AuditAction.ASSET_DEACTIVATION,
            model="Asset", object_id=asset.pk,
            object_code=asset.asset_code, object_name=asset.name,
            module="assets", ip_address=get_client_ip(request),
        )
        notify_role(
            "ADMIN",
            "Activo dado de baja",
            f"{asset.asset_code} — {asset.name} fue dado de baja por {request.user.get_full_name() or request.user.email}",
            type_="warning", module="assets",
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
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        asset = self.get_object()
        serializer = AssetDeactivateSerializer(data=request.data, context={"asset": asset})
        serializer.is_valid(raise_exception=True)
        baja_date = serializer.validated_data["deactivation_date"]
        baja_reason = serializer.validated_data["reason"]

        # Capturar ubicación/custodio antes de modificar el activo
        orig_agency = asset.agency
        orig_department = asset.department
        orig_area = asset.area
        orig_custodian = asset.custodian

        asset.is_active = False
        asset.status = AssetStatus.INACTIVO
        asset.deactivation_date = baja_date
        asset.save(update_fields=["is_active", "status", "deactivation_date"])

        AssetMovement.objects.create(
            asset=asset,
            movement_type=MovementType.BAJA,
            movement_date=baja_date,
            origin_agency=orig_agency,
            origin_department=orig_department,
            origin_area=orig_area,
            origin_custodian=orig_custodian,
            reason=baja_reason,
            created_by=request.user,
        )
        AuditLog.objects.create(
            user=request.user, action=AuditAction.ASSET_DEACTIVATION,
            model="Asset", object_id=asset.pk,
            object_code=asset.asset_code, object_name=asset.name,
            module="assets",
            extra_data={"reason": baja_reason},
            ip_address=get_client_ip(request),
        )
        notify_role(
            "ADMIN",
            "Activo dado de baja",
            f"{asset.asset_code} — {asset.name}: {baja_reason[:80]}",
            type_="warning", module="assets",
        )
        return Response({"detail": f"Activo {asset.asset_code} dado de baja correctamente."})

    # ── POST /assets/{id}/reactivate/ ────────────────────────────────────────
    @transaction.atomic
    @action(detail=False, methods=["post"], url_path=r"(?P<pk>[^/.]+)/reactivate")
    def reactivate(self, request, pk=None):
        """
        Reactiva un activo inactivo.
        Body: { status: str, reason: str (min 10 chars) }
        El motivo es obligatorio y queda registrado en AuditLog y Movimiento.
        """
        from apps.assets.models import AssetStatus

        try:
            asset = (
                Asset.objects
                .select_related("agency", "department", "area", "custodian")
                .get(pk=pk, is_active=False)
            )
        except Asset.DoesNotExist:
            # Puede que ya esté activo
            if Asset.objects.filter(pk=pk, is_active=True).exists():
                return Response({"detail": "El activo ya se encuentra activo."}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"detail": "Activo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status", "ACTIVO").strip()
        reason     = request.data.get("reason", "").strip()

        valid_statuses = [s.value for s in AssetStatus if s != AssetStatus.INACTIVO]
        if new_status not in valid_statuses:
            return Response({"detail": f"Estado inválido. Opciones: {', '.join(valid_statuses)}"}, status=status.HTTP_400_BAD_REQUEST)
        if len(reason) < 10:
            return Response({"detail": "El motivo debe tener al menos 10 caracteres."}, status=status.HTTP_400_BAD_REQUEST)

        asset.is_active        = True
        asset.status           = new_status
        asset.deactivation_date = None
        asset.save(update_fields=["is_active", "status", "deactivation_date"])

        AssetMovement.objects.create(
            asset=asset,
            movement_type=MovementType.REACTIVACION,
            movement_date=timezone.now().date(),
            origin_agency=asset.agency,
            origin_department=asset.department,
            origin_area=asset.area,
            origin_custodian=asset.custodian,
            dest_agency=asset.agency,
            dest_custodian=asset.custodian,
            reason=reason,
            created_by=request.user,
        )
        AuditLog.objects.create(
            user=request.user, action=AuditAction.ASSET_ACTIVATION,
            model="Asset", object_id=asset.pk,
            object_code=asset.asset_code, object_name=asset.name,
            module="assets",
            extra_data={"reason": reason, "new_status": new_status},
            ip_address=get_client_ip(request),
        )
        notify_role(
            "ADMIN",
            "Activo reactivado",
            f"{asset.asset_code} — {asset.name} volvió al estado '{new_status}'",
            type_="success", module="assets",
        )
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
    filterset_fields = ["category", "component_type_link"]
    search_fields = ["name"]
    ordering_fields = ["category", "name"]
    ordering = ["category", "name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    # ── GET /asset-types/{id}/next-code/ ─────────────────────────────────────
    @action(detail=True, methods=["get"], url_path="next-code")
    def next_code(self, request, pk=None):
        """
        Devuelve el siguiente código libre para el tipo de activo dado.
        Ejemplo: tipo con prefix "PC" → busca PC001, PC002… y devuelve el primero libre.
        """
        asset_type = self.get_object()
        prefix = asset_type.code_prefix.upper() if asset_type.code_prefix else asset_type.name[:3].upper()

        # Obtener todos los códigos que empiecen con ese prefijo
        existing = (
            Asset.objects
            .filter(asset_code__istartswith=prefix)
            .values_list("asset_code", flat=True)
        )

        # Extraer los números usados
        used_numbers = set()
        for code in existing:
            m = re.match(rf"^{re.escape(prefix)}(\d+)$", code, re.IGNORECASE)
            if m:
                used_numbers.add(int(m.group(1)))

        # Encontrar el siguiente libre
        n = 1
        while n in used_numbers:
            n += 1

        next_code = f"{prefix}{str(n).zfill(3)}"
        return Response({
            "prefix": prefix,
            "next_code": next_code,
            "asset_type": asset_type.name,
            "last_number": n,
        })


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


class AccountCodeViewSet(viewsets.ModelViewSet):
    """
    CRUD de cuentas contables.
    GET    /api/v1/assets/account-codes/
    POST   /api/v1/assets/account-codes/
    PATCH  /api/v1/assets/account-codes/{id}/
    DELETE /api/v1/assets/account-codes/{id}/
    """
    queryset = AccountCode.objects.all()
    serializer_class = AccountCodeSerializer
    permission_classes = [IsAuthenticated, IsAnyStaff]
    filterset_fields = ["is_active", "category"]
    search_fields = ["code", "name", "description"]
    ordering_fields = ["code", "name"]
    ordering = ["code"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

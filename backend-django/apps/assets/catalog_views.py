"""ViewSets de catálogos de activos (marcas, tipos, modelos, cuentas)."""
import re

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.shared.permissions import IsAdmin, IsAnyStaff
from .models import AccountCode, Asset, AssetModel, AssetType, Brand
from .serializers import (
    AccountCodeSerializer,
    AssetModelSerializer,
    AssetTypeSerializer,
    BrandSerializer,
)


class BrandViewSet(viewsets.ModelViewSet):
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

    @action(detail=True, methods=["get"], url_path="next-code")
    def next_code(self, request, pk=None):
        asset_type = self.get_object()
        prefix = asset_type.code_prefix.upper() if asset_type.code_prefix else asset_type.name[:3].upper()
        existing = (
            Asset.objects
            .filter(asset_code__istartswith=prefix)
            .values_list("asset_code", flat=True)
        )
        used_numbers = set()
        for code in existing:
            m = re.match(rf"^{re.escape(prefix)}(\d+)$", code, re.IGNORECASE)
            if m:
                used_numbers.add(int(m.group(1)))
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

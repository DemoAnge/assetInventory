"""
Serializers del módulo de Activos.
Separados en lectura / escritura según convención del proyecto.
"""
from rest_framework import serializers
from .models import Asset, Brand, AssetType, AssetModel


# ── Catálogos ─────────────────────────────────────────────────────────────────

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "country", "website"]


class AssetTypeSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = AssetType
        fields = ["id", "name", "category", "category_display", "description",
                  "code_prefix", "is_it_managed"]


class AssetModelSerializer(serializers.ModelSerializer):
    brand_name      = serializers.CharField(source="brand.name", read_only=True)
    asset_type_name = serializers.CharField(source="asset_type.name", read_only=True)
    category        = serializers.CharField(source="asset_type.category", read_only=True)
    category_display = serializers.CharField(source="asset_type.get_category_display", read_only=True)

    class Meta:
        model = AssetModel
        fields = ["id", "name", "brand", "brand_name", "asset_type", "asset_type_name",
                  "category", "category_display", "specs"]


# ── Activos ───────────────────────────────────────────────────────────────────

class ComponentReadSerializer(serializers.ModelSerializer):
    """Serializer ligero para listar componentes hijos."""
    component_type_display = serializers.CharField(source="get_component_type_display", read_only=True)
    status_display         = serializers.CharField(source="get_status_display", read_only=True)
    brand_name             = serializers.CharField(source="asset_model.brand.name", read_only=True, default=None)
    model_name             = serializers.CharField(source="asset_model.name", read_only=True, default=None)

    class Meta:
        model = Asset
        fields = [
            "id", "asset_code", "name", "brand_name", "model_name",
            "serial_number", "component_type", "component_type_display",
            "status", "status_display", "is_active",
        ]


class AssetReadSerializer(serializers.ModelSerializer):
    """Serializer completo de lectura con datos de catálogo anidados."""
    # Catálogo normalizado (lectura)
    asset_model_detail = AssetModelSerializer(source="asset_model", read_only=True)
    brand_name         = serializers.CharField(source="asset_model.brand.name", read_only=True, default=None)
    model_name         = serializers.CharField(source="asset_model.name", read_only=True, default=None)
    asset_type_name    = serializers.CharField(source="asset_model.asset_type.name", read_only=True, default=None)

    # Clasificación
    category_display  = serializers.CharField(source="get_category_display", read_only=True)
    status_display    = serializers.CharField(source="get_status_display", read_only=True)

    # Ubicación
    agency_name     = serializers.CharField(source="agency.name", read_only=True, default=None)
    department_name = serializers.CharField(source="department.name", read_only=True, default=None)
    area_name       = serializers.CharField(source="area.name", read_only=True, default=None)
    custodian_name  = serializers.CharField(source="custodian.full_name", read_only=True, default=None)

    # Árbol padre-hijo
    parent_code      = serializers.CharField(source="parent_asset.asset_code", read_only=True, default=None)
    components       = ComponentReadSerializer(many=True, read_only=True)
    components_count = serializers.IntegerField(read_only=True)
    is_component     = serializers.BooleanField(read_only=True)

    # Perfil TI (si existe)
    it_profile_id    = serializers.SerializerMethodField()
    it_risk_level    = serializers.SerializerMethodField()
    it_hostname      = serializers.SerializerMethodField()
    it_ip_address    = serializers.SerializerMethodField()

    # Depreciación
    monthly_depreciation = serializers.SerializerMethodField()
    depreciation_info    = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            "id", "asset_code", "serial_number", "name", "color", "observations",
            # catálogo normalizado
            "asset_model", "asset_model_detail",
            "brand_name", "model_name", "asset_type_name",
            # clasificación
            "category", "category_display", "status", "status_display",
            # árbol
            "parent_asset", "parent_code", "component_type",
            "is_component", "components", "components_count",
            # ubicación
            "agency", "agency_name", "department", "department_name",
            "area", "area_name", "custodian", "custodian_name",
            # finanzas
            "purchase_value", "residual_value", "current_value",
            "accumulated_depreciation", "monthly_depreciation",
            # fechas
            "purchase_date", "activation_date", "deactivation_date", "warranty_expiry",
            # depreciación
            "useful_life_years", "depreciation_rate", "depreciation_info",
            "is_fully_depreciated",
            # factura
            "invoice_number", "supplier",
            # SEPS / QR
            "seps_account_code", "qr_uuid",
            # flags
            "is_active", "is_critical_it", "requires_maintenance",
            # perfil TI inline
            "it_profile_id", "it_risk_level", "it_hostname", "it_ip_address",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_monthly_depreciation(self, obj):
        return obj.get_monthly_depreciation()

    def get_depreciation_info(self, obj):
        return obj.depreciation_info

    def _get_it_profile(self, obj):
        try:
            return obj.it_profile
        except Exception:
            return None

    def get_it_profile_id(self, obj):
        p = self._get_it_profile(obj)
        return p.id if p else None

    def get_it_risk_level(self, obj):
        p = self._get_it_profile(obj)
        return p.risk_level if p else None

    def get_it_hostname(self, obj):
        p = self._get_it_profile(obj)
        return p.hostname if p else None

    def get_it_ip_address(self, obj):
        p = self._get_it_profile(obj)
        return p.ip_address if p else None


class AssetWriteSerializer(serializers.ModelSerializer):
    """Serializer de creación / actualización de activos."""

    class Meta:
        model = Asset
        fields = [
            "asset_code", "serial_number", "name", "color", "observations",
            # catálogo normalizado — se envía el ID del modelo
            "asset_model",
            # category se auto-deriva del asset_model; puede enviarse si no hay modelo
            "category",
            "status",
            "parent_asset", "component_type",
            "agency", "department", "area", "custodian",
            "purchase_value", "residual_value",
            "purchase_date", "activation_date", "warranty_expiry",
            "useful_life_years",
            "invoice_number", "supplier", "invoice_image",
            "seps_account_code",
            "is_critical_it",
        ]

    def validate(self, attrs):
        # Debe tener asset_model O category (no puede quedar sin clasificación)
        if not attrs.get("asset_model") and not attrs.get("category"):
            raise serializers.ValidationError({
                "asset_model": "Debe especificar el modelo del activo o al menos la categoría."
            })
        # Si tiene padre, debe tener component_type
        if attrs.get("parent_asset") and not attrs.get("component_type"):
            raise serializers.ValidationError({
                "component_type": "Debe especificar el tipo de componente al asociar un activo padre."
            })
        # Valor residual no puede superar valor de compra
        pv = attrs.get("purchase_value", 0)
        rv = attrs.get("residual_value", 0)
        if pv and rv and float(rv) > float(pv):
            raise serializers.ValidationError({
                "residual_value": "El valor residual no puede superar el valor de compra."
            })
        return attrs


class AssetDeactivateSerializer(serializers.Serializer):
    """Valida la solicitud de dar de baja un activo."""
    reason            = serializers.CharField(min_length=10, help_text="Motivo de la baja.")
    deactivation_date = serializers.DateField()

    def validate(self, attrs):
        asset = self.context.get("asset")
        if asset and asset.components.filter(is_active=True).exists():
            raise serializers.ValidationError(
                "No se puede dar de baja este activo porque tiene componentes activos. "
                "Primero dé de baja los componentes o disocie el padre."
            )
        return attrs

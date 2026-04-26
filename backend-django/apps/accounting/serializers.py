from decimal import Decimal
from rest_framework import serializers
from apps.assets.serializers import AssetReadSerializer
from .models import DepreciationSchedule, AssetSale, AccountingEntry


class DepreciationScheduleSerializer(serializers.ModelSerializer):
    asset_code = serializers.CharField(source="asset.asset_code", read_only=True)
    asset_name = serializers.CharField(source="asset.name", read_only=True)

    class Meta:
        model = DepreciationSchedule
        fields = [
            "id", "asset", "asset_code", "asset_name",
            "period_year", "period_month", "period_date",
            "opening_value", "monthly_depreciation", "accumulated", "closing_value",
            "is_processed", "journal_entry_ref",
        ]
        read_only_fields = ["id", "is_processed"]


class AssetSaleReadSerializer(serializers.ModelSerializer):
    asset_detail  = AssetReadSerializer(source="asset", read_only=True)
    result_type_display = serializers.CharField(source="get_result_type_display", read_only=True)

    class Meta:
        model = AssetSale
        fields = [
            "id", "asset", "asset_detail",
            "sale_date", "buyer_name", "buyer_id", "invoice_number",
            "sale_price", "book_value_at_sale", "accumulated_dep",
            "sale_result", "result_type", "result_type_display",
            "seps_account", "journal_entry_generated", "journal_entry_data",
            "observations", "created_at",
        ]
        read_only_fields = fields


class AssetSaleWriteSerializer(serializers.Serializer):
    """Registra la venta de un activo y calcula resultado automáticamente."""
    asset_id       = serializers.IntegerField()
    sale_date      = serializers.DateField()
    buyer_name     = serializers.CharField(max_length=200)
    buyer_id       = serializers.CharField(max_length=13)
    invoice_number = serializers.CharField(max_length=50)
    sale_price     = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    observations   = serializers.CharField(required=False, allow_blank=True)

    def validate_asset_id(self, value):
        from apps.assets.models import Asset, AssetStatus
        try:
            asset = Asset.objects.get(pk=value, is_active=True)
            if hasattr(asset, "sale"):
                raise serializers.ValidationError("Este activo ya tiene una venta registrada.")
            if asset.status == AssetStatus.VENDIDO:
                raise serializers.ValidationError("El activo ya fue marcado como vendido.")
        except Asset.DoesNotExist:
            raise serializers.ValidationError("Activo no encontrado o inactivo.")
        return value


class DepreciationSimulatorSerializer(serializers.Serializer):
    """Simula el cronograma de depreciación sin persistir."""
    purchase_value  = serializers.DecimalField(max_digits=14, decimal_places=2)
    residual_value  = serializers.DecimalField(max_digits=14, decimal_places=2, default=0)
    useful_life_years = serializers.IntegerField(min_value=1, max_value=50)
    purchase_date   = serializers.DateField()


class AccountingEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountingEntry
        fields = "__all__"
        read_only_fields = ["id", "created_at"]

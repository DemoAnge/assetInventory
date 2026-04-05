from rest_framework import serializers
from .models import MaintenanceRecord


class MaintenanceReadSerializer(serializers.ModelSerializer):
    asset_code             = serializers.CharField(source="asset.asset_code", read_only=True)
    asset_name             = serializers.CharField(source="asset.name", read_only=True)
    maintenance_type_display = serializers.CharField(source="get_maintenance_type_display", read_only=True)
    status_display         = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = MaintenanceRecord
        fields = [
            "id", "asset", "asset_code", "asset_name",
            "maintenance_type", "maintenance_type_display",
            "status", "status_display",
            "scheduled_date", "completed_date", "next_maintenance",
            "technician", "supplier", "work_order",
            "description", "findings", "parts_replaced",
            "cost", "downtime_hours", "created_at",
        ]
        read_only_fields = fields


class MaintenanceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = [
            "asset", "maintenance_type", "status",
            "scheduled_date", "completed_date", "next_maintenance",
            "technician", "supplier", "work_order",
            "description", "findings", "parts_replaced",
            "cost", "downtime_hours",
        ]

    def validate(self, attrs):
        if attrs.get("status") == "COMPLETADO" and not attrs.get("completed_date"):
            raise serializers.ValidationError({"completed_date": "Debe ingresar la fecha de realización al completar."})
        return attrs

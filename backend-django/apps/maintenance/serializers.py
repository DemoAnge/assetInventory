from rest_framework import serializers
from .models import MaintenanceRecord, MaintenanceStatusLog, Technician


class TechnicianSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Technician
        fields = [
            "id", "name", "is_external", "user", "user_name",
            "company", "phone", "email", "specialty", "is_active",
        ]

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.email
        return None


class MaintenanceStatusLogSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    changed_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MaintenanceStatusLog
        fields = ["id", "record", "status", "status_display", "notes", "changed_by", "changed_by_name", "changed_at"]
        read_only_fields = ["id", "changed_at", "changed_by"]

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.email
        return None


class MaintenanceReadSerializer(serializers.ModelSerializer):
    asset_code               = serializers.CharField(source="asset.asset_code", read_only=True)
    asset_name               = serializers.CharField(source="asset.name", read_only=True)
    asset_serial_number      = serializers.CharField(source="asset.serial_number", read_only=True, default=None)
    maintenance_type_display = serializers.CharField(source="get_maintenance_type_display", read_only=True)
    status_display           = serializers.CharField(source="get_status_display", read_only=True)
    technician_name          = serializers.SerializerMethodField(read_only=True)
    status_logs              = MaintenanceStatusLogSerializer(many=True, read_only=True)

    class Meta:
        model = MaintenanceRecord
        fields = [
            "id", "asset", "asset_code", "asset_name", "asset_serial_number",
            "maintenance_type", "maintenance_type_display",
            "status", "status_display",
            "scheduled_date", "completed_date", "next_maintenance",
            "technician", "technician_ref", "technician_name",
            "supplier", "work_order",
            "description", "findings", "parts_replaced",
            "cost", "downtime_hours", "created_at",
            "status_logs",
        ]

    def get_technician_name(self, obj):
        if obj.technician_ref:
            return obj.technician_ref.name
        return obj.technician or None


class MaintenanceWriteSerializer(serializers.ModelSerializer):
    # Permitir envío de strings vacíos o null; se convierten a 0
    cost           = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True, default=0)
    downtime_hours = serializers.DecimalField(max_digits=6,  decimal_places=1, required=False, allow_null=True, default=0)
    # Fechas opcionales aceptan null
    completed_date   = serializers.DateField(required=False, allow_null=True)
    next_maintenance = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = MaintenanceRecord
        fields = [
            "asset", "maintenance_type", "status",
            "scheduled_date", "completed_date", "next_maintenance",
            "technician", "technician_ref", "supplier", "work_order",
            "description", "findings", "parts_replaced",
            "cost", "downtime_hours",
        ]

    def validate_cost(self, value):
        return value if value is not None else 0

    def validate_downtime_hours(self, value):
        return value if value is not None else 0

    def validate(self, attrs):
        if attrs.get("status") == "COMPLETADO" and not attrs.get("completed_date"):
            raise serializers.ValidationError({"completed_date": "Debe ingresar la fecha de realización al completar."})
        return attrs

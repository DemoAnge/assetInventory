from rest_framework import serializers
from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source="get_alert_type_display", read_only=True)
    severity_display   = serializers.CharField(source="get_severity_display", read_only=True)
    asset_code         = serializers.CharField(source="asset.asset_code", read_only=True, default=None)
    resolved_by_name   = serializers.CharField(source="resolved_by.get_full_name", read_only=True, default=None)

    class Meta:
        model = Alert
        fields = [
            "id", "alert_type", "alert_type_display", "severity", "severity_display",
            "title", "message", "asset", "asset_code", "extra_data",
            "target_roles", "target_user",
            "is_read", "is_resolved", "resolved_by", "resolved_by_name",
            "resolved_at", "resolution_note", "is_auto_generated",
            "created_at",
        ]
        read_only_fields = ["id", "is_auto_generated", "created_at", "resolved_at"]


class AlertResolveSerializer(serializers.Serializer):
    resolution_note = serializers.CharField(required=False, allow_blank=True)

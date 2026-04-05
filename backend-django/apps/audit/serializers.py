from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "user_email", "user_role", "user_display",
            "action", "model", "module", "object_id", "object_code", "object_name",
            "changed_fields", "action_date", "ip_address", "success",
            "error_message", "extra_data",
        ]
        read_only_fields = fields

    def get_user_display(self, obj):
        if obj.user:
            return obj.user.get_full_name()
        return obj.user_email

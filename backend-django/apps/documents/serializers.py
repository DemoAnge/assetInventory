from rest_framework import serializers
from .models import AssetDocument


class AssetDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source="get_document_type_display", read_only=True)
    asset_code            = serializers.CharField(source="asset.asset_code",           read_only=True)
    asset_name            = serializers.CharField(source="asset.name",                 read_only=True)
    asset_serial_number   = serializers.CharField(source="asset.serial_number",        read_only=True, default="")
    uploaded_by_name      = serializers.SerializerMethodField()
    updated_by_name       = serializers.SerializerMethodField()
    file_url              = serializers.SerializerMethodField()
    file_size_kb          = serializers.SerializerMethodField()

    class Meta:
        model  = AssetDocument
        fields = [
            "id", "asset", "asset_code", "asset_name", "asset_serial_number",
            "title", "document_type", "document_type_display",
            "file", "file_url", "file_size", "file_size_kb",
            "notes",
            "uploaded_by", "uploaded_by_name",
            "updated_by_name", "updated_at",
            "created_at",
        ]
        read_only_fields = ["id", "file_size", "uploaded_by", "created_at", "updated_at"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_file_size_kb(self, obj):
        return round(obj.file_size / 1024, 1) if obj.file_size else 0

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by:
            return None
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.email

    def get_updated_by_name(self, obj):
        ub = getattr(obj, "updated_by", None)
        if not ub:
            return None
        return ub.get_full_name() or ub.email

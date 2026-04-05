from rest_framework import serializers
from .models import AssetDocument


class AssetDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source="get_document_type_display", read_only=True)
    asset_code            = serializers.CharField(source="asset.asset_code", read_only=True)
    uploaded_by_name      = serializers.CharField(source="uploaded_by.get_full_name", read_only=True, default=None)
    file_url              = serializers.SerializerMethodField()
    file_size_kb          = serializers.SerializerMethodField()

    class Meta:
        model = AssetDocument
        fields = [
            "id", "asset", "asset_code", "title",
            "document_type", "document_type_display",
            "file", "file_url", "file_size", "file_size_kb",
            "notes", "uploaded_by", "uploaded_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "file_size", "uploaded_by", "created_at"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_file_size_kb(self, obj):
        if obj.file_size:
            return round(obj.file_size / 1024, 1)
        return 0

from rest_framework import serializers
from .models import Agency, Department, Area


class AreaReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ["id", "code", "name", "floor", "description", "is_active", "department"]


class AreaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ["department", "code", "name", "floor", "description", "is_active"]


class DepartmentReadSerializer(serializers.ModelSerializer):
    areas = AreaReadSerializer(many=True, read_only=True)
    agency_name = serializers.CharField(source="agency.name", read_only=True)

    class Meta:
        model = Department
        fields = ["id", "agency", "agency_name", "code", "name", "description", "is_active", "areas"]


class DepartmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["agency", "code", "name", "description", "is_active"]


class AgencyReadSerializer(serializers.ModelSerializer):
    departments = DepartmentReadSerializer(many=True, read_only=True)
    total_assets = serializers.SerializerMethodField()

    class Meta:
        model = Agency
        fields = [
            "id", "code", "name", "address", "city", "province",
            "phone", "is_main", "is_active", "departments", "total_assets",
            "created_at", "updated_at",
        ]

    def get_total_assets(self, obj):
        return obj.assets.filter(is_active=True).count() if hasattr(obj, "assets") else 0


class AgencyWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = ["code", "name", "address", "city", "province", "phone", "is_main", "is_active"]

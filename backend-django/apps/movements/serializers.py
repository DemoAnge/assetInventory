from rest_framework import serializers
from .models import AssetMovement


class MovementReadSerializer(serializers.ModelSerializer):
    asset_code            = serializers.CharField(source="asset.asset_code", read_only=True)
    asset_name            = serializers.CharField(source="asset.name", read_only=True)
    movement_type_display = serializers.CharField(source="get_movement_type_display", read_only=True)
    origin_agency_name    = serializers.CharField(source="origin_agency.name", read_only=True, default=None)
    dest_agency_name      = serializers.CharField(source="dest_agency.name", read_only=True, default=None)
    origin_custodian_name = serializers.CharField(source="origin_custodian.full_name", read_only=True, default=None)
    dest_custodian_name   = serializers.CharField(source="dest_custodian.full_name", read_only=True, default=None)
    authorized_by_name    = serializers.CharField(source="authorized_by.get_full_name", read_only=True, default=None)
    component_movements   = serializers.SerializerMethodField()

    class Meta:
        model = AssetMovement
        fields = [
            "id", "asset", "asset_code", "asset_name",
            "movement_type", "movement_type_display", "movement_date",
            "origin_agency", "origin_agency_name",
            "origin_department", "origin_area",
            "origin_custodian", "origin_custodian_name",
            "dest_agency", "dest_agency_name",
            "dest_department", "dest_area",
            "dest_custodian", "dest_custodian_name",
            "reason", "authorized_by", "authorized_by_name",
            "observations", "document_ref",
            "parent_movement", "is_cascade",
            "component_movements", "created_at",
        ]
        read_only_fields = fields

    def get_component_movements(self, obj):
        children = obj.component_movements.all()
        return [{"id": c.id, "asset_code": c.asset.asset_code, "asset_name": c.asset.name} for c in children]


class MovementWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetMovement
        fields = [
            "asset", "movement_type", "movement_date",
            "origin_agency", "origin_department", "origin_area", "origin_custodian",
            "dest_agency", "dest_department", "dest_area", "dest_custodian",
            "reason", "authorized_by", "observations", "document_ref",
        ]

    def validate(self, attrs):
        mv_type = attrs.get("movement_type")
        if mv_type == "TRASLADO":
            if not attrs.get("dest_agency"):
                raise serializers.ValidationError({"dest_agency": "El traslado requiere agencia destino."})
        if mv_type == "REASIGNACION":
            if not attrs.get("dest_custodian"):
                raise serializers.ValidationError({"dest_custodian": "La reasignación requiere custodio destino."})
        return attrs

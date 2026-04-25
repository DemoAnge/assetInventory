from rest_framework import serializers
from apps.locations.models import Agency
from .models import Custodian


class CustodianReadSerializer(serializers.ModelSerializer):
    full_name    = serializers.CharField(read_only=True)
    agency_name  = serializers.CharField(source="agency.name", read_only=True, default=None)
    agency_code  = serializers.CharField(source="agency.code", read_only=True, default=None)
    assets_count = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Custodian
        fields = [
            "id",
            "first_name", "last_name", "full_name",
            "id_number", "phone",
            "position",
            "agency", "agency_name", "agency_code",
            "is_active",
            "assets_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CustodianWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Custodian
        fields = ["first_name", "last_name", "id_number", "phone", "position", "agency", "is_active"]
        extra_kwargs = {
            "id_number": {"required": False, "allow_null": True, "allow_blank": True},
            "phone":     {"required": False, "allow_null": True, "allow_blank": True},
            "agency":    {"required": False, "allow_null": True},
            "is_active": {"required": False},
        }

    def validate_id_number(self, value):
        if not value:
            return value
        qs = Custodian.objects.filter(id_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un custodio con este número de identificación.")
        return value

    def validate_agency(self, value):
        if value and not Agency.objects.filter(pk=value.pk, is_active=True).exists():
            raise serializers.ValidationError("La agencia seleccionada no está activa.")
        return value

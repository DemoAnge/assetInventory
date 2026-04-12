from rest_framework import serializers
from .models import Custodian


def _validate_ecuador_cedula(value: str) -> str:
    """
    Valida cédula ecuatoriana:
      - Exactamente 10 dígitos numéricos
      - Primeros 2 dígitos = código de provincia (01–24)
      - Tercer dígito < 6 (persona natural)
      - Dígito verificador (módulo 10)
    """
    if not value.isdigit() or len(value) != 10:
        raise serializers.ValidationError("La cédula debe tener exactamente 10 dígitos numéricos.")

    province = int(value[:2])
    if province < 1 or province > 24:
        raise serializers.ValidationError(
            "Los dos primeros dígitos no corresponden a una provincia válida de Ecuador (01–24)."
        )

    if int(value[2]) >= 6:
        raise serializers.ValidationError("El tercer dígito de la cédula no es válido para persona natural.")

    coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    total = sum(
        (d - 9 if d >= 10 else d)
        for d in (int(value[i]) * coefficients[i] for i in range(9))
    )
    check = (10 - (total % 10)) % 10
    if check != int(value[9]):
        raise serializers.ValidationError("La cédula ecuatoriana no es válida (dígito verificador incorrecto).")

    return value


class CustodianReadSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    # Viene de anotación en el ViewSet — sin N+1
    assets_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Custodian
        fields = [
            "id",
            "first_name", "last_name", "full_name",
            "id_number", "position",
            "is_active",
            "assets_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CustodianWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Custodian
        fields = ["first_name", "last_name", "id_number", "position"]

    def validate_id_number(self, value):
        value = _validate_ecuador_cedula(value)
        qs = Custodian.objects.filter(id_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un custodio con esta cédula.")
        return value

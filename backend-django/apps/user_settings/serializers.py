from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.conf import settings as django_settings
from rest_framework import serializers

from .models import UserProfile

User = get_user_model()

MAX_FILE_SIZE_MB = 5


def _validate_image_size(image):
    if image and image.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise serializers.ValidationError(f"La imagen no puede superar {MAX_FILE_SIZE_MB} MB.")
    return image


class UserProfileSerializer(serializers.ModelSerializer):
    """Lectura/escritura del perfil completo (usuario + ajustes)."""

    # Campos del CustomUser
    first_name  = serializers.CharField(source="user.first_name")
    last_name   = serializers.CharField(source="user.last_name")
    email       = serializers.EmailField(source="user.email")
    cedula      = serializers.CharField(source="user.cedula", required=False, allow_null=True)
    phone       = serializers.CharField(source="user.phone",  required=False, allow_null=True)

    # URLs absolutas de imágenes
    avatar_url     = serializers.SerializerMethodField()
    background_url = serializers.SerializerMethodField()

    class Meta:
        model  = UserProfile
        fields = [
            "first_name", "last_name", "email", "cedula", "phone",
            "bio", "theme",
            "avatar_url", "background_url",
            "updated_at",
        ]
        read_only_fields = ["avatar_url", "background_url", "updated_at"]

    def _abs_url(self, image_field):
        if not image_field:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(image_field.url)
        return image_field.url

    def get_avatar_url(self, obj):
        return self._abs_url(obj.avatar)

    def get_background_url(self, obj):
        return self._abs_url(obj.background)

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        # Actualizar campos del usuario
        user = instance.user
        for attr, val in user_data.items():
            setattr(user, attr, val)
        user.save(update_fields=list(user_data.keys()) or None)

        # Actualizar campos del perfil
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class AvatarUploadSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(validators=[_validate_image_size])

    class Meta:
        model  = UserProfile
        fields = ["avatar"]


class BackgroundUploadSerializer(serializers.ModelSerializer):
    background = serializers.ImageField(validators=[_validate_image_size])

    class Meta:
        model  = UserProfile
        fields = ["background"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password         = serializers.CharField(required=True)
    new_password         = serializers.CharField(required=True)
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError({"confirm_new_password": "Las contraseñas no coinciden."})
        validate_password(attrs["new_password"])
        return attrs


class SystemInfoSerializer(serializers.Serializer):
    name        = serializers.CharField()
    version     = serializers.CharField()
    description = serializers.CharField()
    license     = serializers.CharField()
    author      = serializers.CharField()
    year        = serializers.CharField()
    repository  = serializers.CharField()
    stack       = serializers.DictField(child=serializers.CharField())

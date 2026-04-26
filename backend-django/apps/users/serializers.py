"""
Serializers del módulo de usuarios.
Separados en lectura / escritura según convención del proyecto.
"""
import qrcode
import qrcode.image.svg
import io
import base64
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# ── JWT personalizado ─────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Agrega role, mfa_enabled y mfa_required al payload del token."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"]         = user.role
        token["full_name"]    = user.get_full_name()
        token["mfa_enabled"]  = user.mfa_enabled
        token["mfa_required"] = user.mfa_required
        return token


# ── Usuario — Lectura ─────────────────────────────────────────────────────────

class UserReadSerializer(serializers.ModelSerializer):
    full_name   = serializers.CharField(read_only=True)
    agency_name = serializers.CharField(source="agency.name", read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "cedula", "phone", "role", "is_active",
            "mfa_enabled", "mfa_required",
            "agency", "agency_name",
            "date_joined", "last_login", "last_login_ip",
        ]
        read_only_fields = fields


# ── Usuario — Escritura ───────────────────────────────────────────────────────

class UserWriteSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "email", "first_name", "last_name", "cedula", "phone",
            "role", "agency", "password", "confirm_password",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Las contraseñas no coinciden."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "cedula", "phone", "agency", "role", "is_active"]


# ── Cambio de contraseña ──────────────────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    old_password         = serializers.CharField(required=True)
    new_password         = serializers.CharField(required=True)
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError({"confirm_new_password": "Las contraseñas no coinciden."})
        validate_password(attrs["new_password"])
        return attrs


# ── MFA ───────────────────────────────────────────────────────────────────────

class MfaSetupSerializer(serializers.Serializer):
    secret           = serializers.CharField(read_only=True)
    qr_code_base64   = serializers.CharField(read_only=True)
    provisioning_uri = serializers.CharField(read_only=True)

    @staticmethod
    def generate_qr_base64(uri: str) -> str:
        img = qrcode.make(uri)
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")


class MfaVerifySerializer(serializers.Serializer):
    token = serializers.CharField(min_length=6, max_length=6)


class MfaDisableSerializer(serializers.Serializer):
    token    = serializers.CharField(min_length=6, max_length=6)
    password = serializers.CharField()


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField()


class MfaLoginSerializer(serializers.Serializer):
    temp_token = serializers.CharField()
    totp_code  = serializers.CharField(min_length=6, max_length=6)

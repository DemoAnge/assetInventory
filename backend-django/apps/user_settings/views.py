import os
from django.conf import settings as django_settings
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile
from .serializers import (
    UserProfileSerializer,
    AvatarUploadSerializer,
    BackgroundUploadSerializer,
    ChangePasswordSerializer,
    SystemInfoSerializer,
)

# ─── Acerca del sistema ───────────────────────────────────────────────────────
SYSTEM_INFO = {
    "name":        getattr(django_settings, "SYSTEM_NAME",       "SGA-Coop"),
    "version":     getattr(django_settings, "SYSTEM_VERSION",    "1.0.0"),
    "description": getattr(django_settings, "SYSTEM_DESCRIPTION",
        "Sistema de Gestión de Activos para cooperativas. "
        "Open source, autoinstalable y adaptable a cualquier institución."
    ),
    "license":     getattr(django_settings, "SYSTEM_LICENSE",    "MIT"),
    "author":      getattr(django_settings, "SYSTEM_AUTHOR",     "Angel Pilamunga"),
    "year":        getattr(django_settings, "SYSTEM_YEAR",        "2026"),
    "repository":  getattr(django_settings, "SYSTEM_REPOSITORY", "https://github.com/tu-usuario/sga-coop"),
    "stack": {
        "Backend":    "Django + Django REST Framework",
        "Frontend":   "React + TypeScript + Tailwind CSS",
        "Base de datos": "MySQL",
        "Autenticación": "JWT + MFA (TOTP)",
    },
}


def _get_or_create_profile(user) -> UserProfile:
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/v1/settings/profile/  → datos del perfil
    PATCH /api/v1/settings/profile/ → actualizar perfil (nombre, email, bio, tema)
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = UserProfileSerializer
    http_method_names  = ["get", "patch", "head", "options"]

    def get_object(self):
        return _get_or_create_profile(self.request.user)


class AvatarUploadView(APIView):
    """POST /api/v1/settings/avatar/ — reemplaza el avatar."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = _get_or_create_profile(request.user)
        serializer = AvatarUploadSerializer(profile, data=request.data)
        if serializer.is_valid():
            # Eliminar archivo anterior
            if profile.avatar:
                try:
                    os.remove(profile.avatar.path)
                except FileNotFoundError:
                    pass
            serializer.save()
            avatar_url = request.build_absolute_uri(profile.avatar.url)
            return Response({"avatar_url": avatar_url})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """Eliminar avatar (volver al predeterminado)."""
        profile = _get_or_create_profile(request.user)
        if profile.avatar:
            try:
                os.remove(profile.avatar.path)
            except FileNotFoundError:
                pass
            profile.avatar = None
            profile.save(update_fields=["avatar"])
        return Response({"detail": "Avatar eliminado."})


class BackgroundUploadView(APIView):
    """POST /api/v1/settings/background/ — reemplaza el fondo."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = _get_or_create_profile(request.user)
        serializer = BackgroundUploadSerializer(profile, data=request.data)
        if serializer.is_valid():
            if profile.background:
                try:
                    os.remove(profile.background.path)
                except FileNotFoundError:
                    pass
            serializer.save()
            bg_url = request.build_absolute_uri(profile.background.url)
            return Response({"background_url": bg_url})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        profile = _get_or_create_profile(request.user)
        if profile.background:
            try:
                os.remove(profile.background.path)
            except FileNotFoundError:
                pass
            profile.background = None
            profile.save(update_fields=["background"])
        return Response({"detail": "Imagen de fondo eliminada."})


class ChangePasswordView(APIView):
    """POST /api/v1/settings/change-password/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"old_password": "Contraseña actual incorrecta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Contraseña actualizada correctamente."})


class SystemInfoView(APIView):
    """GET /api/v1/settings/system/ — información pública del sistema."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = SystemInfoSerializer(SYSTEM_INFO)
        return Response(serializer.data)

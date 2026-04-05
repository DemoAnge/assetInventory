"""
ViewSets y vistas del módulo de usuarios.
Flujo de login en dos fases: credenciales → (MFA si activo) → JWT completo.
"""
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit.models import AuditLog
from apps.shared.permissions import IsAdmin
from apps.shared.utils import get_client_ip
from .models import LoginAttempt
from .serializers import (
    UserReadSerializer, UserWriteSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, MfaSetupSerializer, MfaVerifySerializer,
    MfaDisableSerializer, LoginSerializer, MfaLoginSerializer,
)

User = get_user_model()


class LoginRateThrottle(AnonRateThrottle):
    rate = "100/minute"  # dev: sin restricción real
    scope = "login"


# ── Login en dos fases ────────────────────────────────────────────────────────

class LoginView(generics.GenericAPIView):
    """
    Fase 1: valida email + password.
    - Si MFA no está activo → retorna JWT completo.
    - Si MFA está activo → retorna temp_token para la fase 2.
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        ip = get_client_ip(request)

        user = authenticate(request, username=email, password=password)

        # Registrar intento
        LoginAttempt.objects.create(
            email=email,
            ip_address=ip,
            success=user is not None,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        if user is None:
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "Cuenta desactivada."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.last_login_ip = ip
        user.save(update_fields=["last_login_ip"])

        # Si MFA está habilitado → fase 2
        if user.mfa_enabled:
            temp_token = self._build_temp_token(user)
            return Response({
                "mfa_required": True,
                "temp_token": temp_token,
                "message": "Ingresa el código TOTP de tu aplicación autenticadora.",
            })

        # Sin MFA → JWT directo
        return self._issue_tokens(user)

    def _build_temp_token(self, user) -> str:
        payload = {
            "user_id": user.pk,
            "purpose": "mfa_verification",
            "exp": datetime.utcnow() + timedelta(minutes=5),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    def _issue_tokens(self, user):
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["full_name"] = user.get_full_name()
        refresh["mfa_enabled"] = user.mfa_enabled
        refresh["mfa_required"] = user.mfa_required
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserReadSerializer(user).data,
        })


class MfaLoginView(generics.GenericAPIView):
    """
    Fase 2: verifica el código TOTP y emite JWT completo.
    """
    permission_classes = [AllowAny]
    serializer_class = MfaLoginSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        temp_token = serializer.validated_data["temp_token"]
        totp_code = serializer.validated_data["totp_code"]

        try:
            payload = jwt.decode(temp_token, settings.SECRET_KEY, algorithms=["HS256"])
            if payload.get("purpose") != "mfa_verification":
                raise ValueError("Token inválido.")
        except Exception:
            return Response({"detail": "Token temporal inválido o expirado."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=payload["user_id"])
        except User.DoesNotExist:
            return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not user.verify_totp(totp_code):
            LoginAttempt.objects.create(
                email=user.email, ip_address=get_client_ip(request), success=False,
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )
            return Response({"detail": "Código TOTP inválido."}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["full_name"] = user.get_full_name()
        refresh["mfa_enabled"] = user.mfa_enabled
        refresh["mfa_required"] = user.mfa_required
        refresh["mfa_verified"] = True

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserReadSerializer(user).data,
        })


# ── CRUD de Usuarios ──────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("agency").all()
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action == "create":
            return UserWriteSerializer
        if self.action in ("update", "partial_update"):
            return UserUpdateSerializer
        return UserReadSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        AuditLog.objects.create(
            user=self.request.user, action="CREATE",
            model="CustomUser", object_id=user.pk,
            object_code=user.email, object_name=user.get_full_name(),
            ip_address=get_client_ip(self.request),
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        AuditLog.objects.create(
            user=self.request.user, action="UPDATE",
            model="CustomUser", object_id=instance.pk,
            object_code=instance.email, object_name=instance.get_full_name(),
            ip_address=get_client_ip(self.request),
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Retorna el perfil del usuario autenticado."""
        return Response(UserReadSerializer(request.user).data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"old_password": "Contraseña actual incorrecta."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save()

        AuditLog.objects.create(
            user=user, action="PASSWORD_CHANGE",
            model="CustomUser", object_id=user.pk,
            object_code=user.email, object_name=user.get_full_name(),
            ip_address=get_client_ip(request),
        )
        return Response({"detail": "Contraseña actualizada correctamente."})


# ── MFA ViewSet ───────────────────────────────────────────────────────────────

class MfaViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def setup(self, request):
        """Genera secreto TOTP y QR para configurar MFA."""
        user = request.user
        if user.mfa_enabled:
            return Response({"detail": "MFA ya está habilitado."}, status=status.HTTP_400_BAD_REQUEST)

        secret = user.generate_mfa_secret()
        uri = user.get_totp_uri()
        qr_b64 = MfaSetupSerializer.generate_qr_base64(uri)

        return Response({
            "secret": secret,
            "provisioning_uri": uri,
            "qr_code_base64": qr_b64,
            "message": "Escanea el QR con tu app autenticadora (Google Authenticator, Authy, etc.) y confirma con /mfa/confirm/",
        })

    @action(detail=False, methods=["post"])
    def confirm(self, request):
        """Confirma el primer código TOTP y activa MFA."""
        user = request.user
        serializer = MfaVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not user.verify_totp(serializer.validated_data["token"]):
            return Response({"detail": "Código inválido."}, status=status.HTTP_400_BAD_REQUEST)

        user.mfa_enabled = True
        user.save(update_fields=["mfa_enabled"])

        AuditLog.objects.create(
            user=user, action="MFA_ENABLED",
            model="CustomUser", object_id=user.pk,
            object_code=user.email, object_name=user.get_full_name(),
            ip_address=get_client_ip(request),
        )
        return Response({"detail": "MFA activado correctamente."})

    @action(detail=False, methods=["post"])
    def disable(self, request):
        """Desactiva MFA (requiere contraseña + token TOTP)."""
        user = request.user
        if not user.mfa_enabled:
            return Response({"detail": "MFA no está habilitado."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = MfaDisableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not user.check_password(serializer.validated_data["password"]):
            return Response({"detail": "Contraseña incorrecta."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.verify_totp(serializer.validated_data["token"]):
            return Response({"detail": "Código TOTP inválido."}, status=status.HTTP_400_BAD_REQUEST)

        if user.mfa_required:
            return Response(
                {"detail": "Tu rol requiere MFA obligatorio. Contacta al administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.mfa_enabled = False
        user.mfa_secret = None
        user.save(update_fields=["mfa_enabled", "mfa_secret"])

        AuditLog.objects.create(
            user=user, action="MFA_DISABLED",
            model="CustomUser", object_id=user.pk,
            object_code=user.email, object_name=user.get_full_name(),
            ip_address=get_client_ip(request),
        )
        return Response({"detail": "MFA desactivado."})

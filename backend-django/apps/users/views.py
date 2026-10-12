"""
ViewSets y vistas del módulo de usuarios.
"""
from django.contrib.auth import get_user_model, authenticate
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
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
    ChangePasswordSerializer, LoginSerializer, MfaLoginSerializer,
    MfaSetupSerializer, MfaVerifySerializer, MfaDisableSerializer,
)

User = get_user_model()

MFA_TEMP_SALT = "mfa-login"
MFA_TEMP_MAX_AGE = 300


class LoginRateThrottle(AnonRateThrottle):
    """5 intentos cada 15 minutos por IP. DRF no parsea '5/15min'."""
    scope = "login"

    def parse_rate(self, rate):
        return (5, 900)


def _mfa_temp_token(user) -> str:
    return TimestampSigner(salt=MFA_TEMP_SALT).sign(str(user.pk))


def _user_from_mfa_temp(token: str):
    raw = TimestampSigner(salt=MFA_TEMP_SALT).unsign(token, max_age=MFA_TEMP_MAX_AGE)
    return User.objects.get(pk=int(raw))


def _token_payload(user) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["full_name"] = user.get_full_name()
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserReadSerializer(user).data,
        "mfa_setup_required": bool(user.mfa_required and not user.mfa_enabled),
    }


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class   = LoginSerializer
    throttle_classes   = [LoginRateThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email    = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        ip       = get_client_ip(request)

        user = authenticate(request, username=email, password=password)

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

        if user.mfa_enabled:
            return Response({
                "mfa_required": True,
                "temp_token": _mfa_temp_token(user),
            })

        return Response(_token_payload(user))


class MfaLoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = MfaLoginSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        try:
            user = _user_from_mfa_temp(serializer.validated_data["temp_token"])
        except (BadSignature, SignatureExpired, User.DoesNotExist, ValueError):
            return Response(
                {"detail": "Sesión MFA expirada. Inicia sesión de nuevo."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active or not user.mfa_enabled:
            return Response({"detail": "MFA no disponible."}, status=status.HTTP_403_FORBIDDEN)

        ok = user.verify_totp(serializer.validated_data["totp_code"])
        LoginAttempt.objects.create(
            email=user.email,
            ip_address=ip,
            success=ok,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
        if not ok:
            return Response(
                {"detail": "Código MFA inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user.last_login_ip = ip
        user.save(update_fields=["last_login_ip"])
        return Response(_token_payload(user))


# ── CRUD de Usuarios ──────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset           = User.objects.select_related("agency").all()
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

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def mfa_setup(self, request):
        user = request.user
        if user.mfa_enabled:
            return Response(
                {"detail": "MFA ya está habilitado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.generate_mfa_secret()
        uri = user.get_totp_uri()
        return Response({
            "secret": user.mfa_secret,
            "provisioning_uri": uri,
            "qr_code_base64": MfaSetupSerializer.generate_qr_base64(uri),
        })

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def mfa_confirm(self, request):
        serializer = MfaVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.verify_totp(serializer.validated_data["token"]):
            return Response({"detail": "Código inválido."}, status=status.HTTP_400_BAD_REQUEST)
        user.mfa_enabled = True
        user.save(update_fields=["mfa_enabled"])
        return Response({"detail": "MFA habilitado.", "mfa_enabled": True})

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def mfa_disable(self, request):
        serializer = MfaDisableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["password"]):
            return Response({"password": "Contraseña incorrecta."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.verify_totp(serializer.validated_data["token"]):
            return Response({"detail": "Código inválido."}, status=status.HTTP_400_BAD_REQUEST)
        user.mfa_enabled = False
        user.mfa_secret = None
        user.save(update_fields=["mfa_enabled", "mfa_secret"])
        return Response({"detail": "MFA deshabilitado.", "mfa_enabled": False})

"""
ViewSets y vistas del módulo de usuarios.
"""
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
    ChangePasswordSerializer, LoginSerializer,
)

User = get_user_model()


class LoginRateThrottle(AnonRateThrottle):
    rate  = "100/minute"
    scope = "login"


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

        refresh = RefreshToken.for_user(user)
        refresh["role"]      = user.role
        refresh["full_name"] = user.get_full_name()
        return Response({
            "access":  str(refresh.access_token),
            "refresh": str(refresh),
            "user":    UserReadSerializer(user).data,
        })


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

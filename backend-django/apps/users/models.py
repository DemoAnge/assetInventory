"""
Modelo de usuario personalizado con roles, MFA TOTP y auditoría.
"""
import pyotp
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class Role(models.TextChoices):
    ADMIN = "ADMIN", "Administrador"
    TI = "TI", "Tecnología de Información"
    CONTABILIDAD = "CONTABILIDAD", "Contabilidad"
    AUDITOR = "AUDITOR", "Auditor"


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El email es obligatorio.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    # ── Campos de identidad ───────────────────────────────────────────────────
    email = models.EmailField(unique=True, verbose_name="Correo electrónico")
    first_name = models.CharField(max_length=100, verbose_name="Nombres")
    last_name = models.CharField(max_length=100, verbose_name="Apellidos")
    cedula = models.CharField(max_length=13, unique=True, blank=True, null=True, verbose_name="Cédula / RUC")
    phone = models.CharField(max_length=15, blank=True, null=True, verbose_name="Teléfono")

    # ── Rol y permisos ────────────────────────────────────────────────────────
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.TI,
        verbose_name="Rol",
    )

    # ── Estado ────────────────────────────────────────────────────────────────
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    is_staff = models.BooleanField(default=False, verbose_name="Staff")
    date_joined = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de registro")
    last_login_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="Última IP")

    # ── MFA ───────────────────────────────────────────────────────────────────
    mfa_secret = models.CharField(max_length=64, blank=True, null=True, verbose_name="Secreto MFA")
    mfa_enabled = models.BooleanField(default=False, verbose_name="MFA habilitado")

    # ── Relación con agencia ──────────────────────────────────────────────────
    agency = models.ForeignKey(
        "locations.Agency",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        verbose_name="Agencia",
    )

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    # ── MFA helpers ───────────────────────────────────────────────────────────
    def generate_mfa_secret(self) -> str:
        """Genera y guarda un nuevo secreto TOTP."""
        self.mfa_secret = pyotp.random_base32()
        self.save(update_fields=["mfa_secret"])
        return self.mfa_secret

    def get_totp_uri(self) -> str:
        """Retorna el URI para generar el QR de configuración."""
        from django.conf import settings
        return pyotp.totp.TOTP(self.mfa_secret).provisioning_uri(
            name=self.email,
            issuer_name=settings.MFA_ISSUER_NAME,
        )

    def verify_totp(self, token: str) -> bool:
        """Verifica un token TOTP con ventana de ±1 intervalo."""
        if not self.mfa_secret:
            return False
        totp = pyotp.TOTP(self.mfa_secret)
        return totp.verify(token, valid_window=1)

    @property
    def mfa_required(self) -> bool:
        """MFA es obligatorio para ADMIN y CONTABILIDAD."""
        return self.role in (Role.ADMIN, Role.CONTABILIDAD)

    @property
    def full_name(self):
        return self.get_full_name()


class LoginAttempt(models.Model):
    """Registro de intentos de login para detección de fuerza bruta."""
    email = models.EmailField(verbose_name="Email intentado")
    ip_address = models.GenericIPAddressField(verbose_name="IP")
    success = models.BooleanField(default=False, verbose_name="Exitoso")
    attempted_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha intento")
    user_agent = models.TextField(blank=True, verbose_name="User Agent")

    class Meta:
        verbose_name = "Intento de login"
        verbose_name_plural = "Intentos de login"
        ordering = ["-attempted_at"]
        indexes = [
            models.Index(fields=["email", "attempted_at"]),
            models.Index(fields=["ip_address", "attempted_at"]),
        ]

    def __str__(self):
        status = "OK" if self.success else "FAIL"
        return f"[{status}] {self.email} desde {self.ip_address}"

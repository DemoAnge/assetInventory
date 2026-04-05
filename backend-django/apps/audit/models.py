"""
Módulo de Auditoría y Trazabilidad.
Inmutable por diseño: no se permiten updates ni deletes en AuditLog.
"""
from django.db import models
from django.conf import settings


class AuditAction(models.TextChoices):
    CREATE = "CREATE", "Creación"
    UPDATE = "UPDATE", "Modificación"
    DELETE = "DELETE", "Eliminación"
    VIEW = "VIEW", "Consulta"
    LOGIN = "LOGIN", "Inicio de sesión"
    LOGOUT = "LOGOUT", "Cierre de sesión"
    PASSWORD_CHANGE = "PASSWORD_CHANGE", "Cambio de contraseña"
    MFA_ENABLED = "MFA_ENABLED", "MFA activado"
    MFA_DISABLED = "MFA_DISABLED", "MFA desactivado"
    DEPRECIATION = "DEPRECIATION", "Depreciación calculada"
    ASSET_SALE = "ASSET_SALE", "Venta de activo"
    ASSET_TRANSFER = "ASSET_TRANSFER", "Traslado de activo"
    ASSET_DEACTIVATION = "ASSET_DEACTIVATION", "Baja de activo"
    ASSET_ACTIVATION = "ASSET_ACTIVATION", "Ingreso de activo"
    MAINTENANCE = "MAINTENANCE", "Mantenimiento registrado"
    REPORT_GENERATED = "REPORT_GENERATED", "Reporte generado"
    DOCUMENT_GENERATED = "DOCUMENT_GENERATED", "Documento generado"
    INVOICE_SCANNED = "INVOICE_SCANNED", "Factura escaneada"
    COMPLIANCE_CHECK = "COMPLIANCE_CHECK", "Verificación de cumplimiento"


class AuditLog(models.Model):
    """
    Registro inmutable de todas las acciones críticas del sistema.
    No se puede modificar ni eliminar una vez creado.
    """
    # ── Quién ──────────────────────────────────────────────────────────────────
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
        verbose_name="Usuario",
    )
    user_email = models.EmailField(blank=True, verbose_name="Email del usuario")
    user_role = models.CharField(max_length=20, blank=True, verbose_name="Rol del usuario")

    # ── Qué ────────────────────────────────────────────────────────────────────
    action = models.CharField(
        max_length=30,
        choices=AuditAction.choices,
        verbose_name="Acción",
    )
    model = models.CharField(max_length=100, verbose_name="Modelo afectado")
    module = models.CharField(max_length=50, blank=True, verbose_name="Módulo")
    object_id = models.BigIntegerField(null=True, blank=True, verbose_name="ID del objeto")
    object_code = models.CharField(max_length=100, blank=True, verbose_name="Código del objeto")
    object_name = models.CharField(max_length=255, blank=True, verbose_name="Nombre del objeto")
    changed_fields = models.JSONField(null=True, blank=True, verbose_name="Campos modificados")

    # ── Cuándo / Dónde ─────────────────────────────────────────────────────────
    action_date = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de acción")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP")
    user_agent = models.TextField(blank=True, verbose_name="User Agent")

    # ── Resultado ──────────────────────────────────────────────────────────────
    success = models.BooleanField(default=True, verbose_name="Exitoso")
    error_message = models.TextField(blank=True, verbose_name="Mensaje de error")
    extra_data = models.JSONField(null=True, blank=True, verbose_name="Datos adicionales")

    class Meta:
        verbose_name = "Log de auditoría"
        verbose_name_plural = "Logs de auditoría"
        ordering = ["-action_date"]
        indexes = [
            models.Index(fields=["action", "action_date"], name="idx_audit_action_date"),
            models.Index(fields=["model", "object_id"], name="idx_audit_model_obj"),
            models.Index(fields=["user", "action_date"], name="idx_audit_user_date"),
            models.Index(fields=["module", "action_date"], name="idx_audit_module_date"),
            models.Index(fields=["action_date"], name="idx_audit_date"),
        ]

    def __str__(self):
        return f"[{self.action}] {self.model}#{self.object_id} por {self.user_email} — {self.action_date}"

    def save(self, *args, **kwargs):
        # Inmutable: solo permite INSERT, no UPDATE
        if self.pk:
            raise PermissionError("Los registros de auditoría son inmutables.")
        # Copia el email y rol al momento de la creación
        if self.user and not self.user_email:
            self.user_email = self.user.email
            self.user_role = self.user.role
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Los registros de auditoría no pueden eliminarse.")

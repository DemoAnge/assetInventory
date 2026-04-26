"""
Módulo de Alertas y Notificaciones.
El engine de reglas detecta condiciones automáticamente y genera alertas.
"""
from django.db import models
from django.conf import settings
from apps.shared.models import BaseModel


class AlertType(models.TextChoices):
    GARANTIA_VENCE      = "GARANTIA_VENCE",      "Garantía próxima a vencer"
    GARANTIA_VENCIDA    = "GARANTIA_VENCIDA",    "Garantía vencida"
    MANTENIMIENTO_DUE   = "MANTENIMIENTO_DUE",   "Mantenimiento programado próximo"
    MANTENIMIENTO_VENC  = "MANTENIMIENTO_VENC",  "Mantenimiento vencido"
    DEPRECIACION_TOTAL  = "DEPRECIACION_TOTAL",  "Activo totalmente depreciado"
    LICENCIA_VENCE      = "LICENCIA_VENCE",      "Licencia de software próxima a vencer"
    LICENCIA_VENCIDA    = "LICENCIA_VENCIDA",    "Licencia de software vencida"
    ACTIVO_CRITICO      = "ACTIVO_CRITICO",      "Alerta de activo crítico TI"
    SEGURIDAD           = "SEGURIDAD",           "Alerta de seguridad"
    BAJA_PENDIENTE      = "BAJA_PENDIENTE",      "Baja pendiente de autorización"
    TRASLADO            = "TRASLADO",            "Notificación de traslado"
    CUSTOM              = "CUSTOM",              "Alerta personalizada"


class AlertSeverity(models.TextChoices):
    CRITICA   = "CRITICA",   "Crítica"
    ALTA      = "ALTA",      "Alta"
    MEDIA     = "MEDIA",     "Media"
    BAJA      = "BAJA",      "Baja"
    INFO      = "INFO",      "Informativa"


class Alert(BaseModel):
    """Alerta generada por el sistema o manualmente."""
    alert_type  = models.CharField(max_length=25, choices=AlertType.choices, verbose_name="Tipo")
    severity    = models.CharField(max_length=10, choices=AlertSeverity.choices, default=AlertSeverity.MEDIA, verbose_name="Severidad")
    title       = models.CharField(max_length=200, verbose_name="Título")
    message     = models.TextField(verbose_name="Mensaje")

    # Objeto relacionado (puede ser un activo, licencia, etc.)
    asset       = models.ForeignKey("assets.Asset", on_delete=models.SET_NULL, null=True, blank=True, related_name="alerts", verbose_name="Activo relacionado")
    extra_data  = models.JSONField(null=True, blank=True, verbose_name="Datos adicionales")

    # Destinatarios
    target_roles = models.JSONField(default=list, verbose_name="Roles destinatarios")
    target_user  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="targeted_alerts", verbose_name="Usuario específico")

    # Estado
    is_read         = models.BooleanField(default=False, verbose_name="Leída")
    is_resolved     = models.BooleanField(default=False, verbose_name="Resuelta")
    resolved_by     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="resolved_alerts", verbose_name="Resuelta por")
    resolved_at     = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de resolución")
    resolution_note = models.TextField(blank=True, verbose_name="Nota de resolución")

    # Auto-generada por el engine
    is_auto_generated = models.BooleanField(default=False, verbose_name="Auto-generada")
    notified_ws       = models.BooleanField(default=False, verbose_name="Notificada por WebSocket")

    class Meta:
        verbose_name = "Alerta"
        verbose_name_plural = "Alertas"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["alert_type", "is_resolved"], name="idx_alert_type_res"),
            models.Index(fields=["severity", "is_resolved"], name="idx_alert_sev_res"),
            models.Index(fields=["asset"], name="idx_alert_asset"),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.title}"

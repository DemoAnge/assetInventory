"""
Módulo de Mantenimiento de Activos.
Registra mantenimientos preventivos y correctivos con programación de próximas fechas.
Incluye gestión de técnicos (internos y externos) y log de cambios de estado.
"""
from django.db import models
from apps.shared.models import BaseModel


class Technician(BaseModel):
    """
    Técnico responsable de mantenimientos.
    Puede ser un usuario interno (relación con CustomUser) o un técnico externo.
    """
    name        = models.CharField(max_length=200, verbose_name="Nombre completo")
    is_external = models.BooleanField(default=False, verbose_name="Es técnico externo")
    user        = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="technician_profile",
        verbose_name="Usuario del sistema (si es interno)",
    )
    company     = models.CharField(max_length=200, blank=True, verbose_name="Empresa / Proveedor")
    phone       = models.CharField(max_length=20, blank=True, verbose_name="Teléfono")
    email       = models.EmailField(blank=True, verbose_name="Correo electrónico")
    specialty   = models.CharField(max_length=150, blank=True, verbose_name="Especialidad")
    is_active   = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        verbose_name = "Técnico"
        verbose_name_plural = "Técnicos"
        ordering = ["name"]

    def __str__(self):
        tag = "EXT" if self.is_external else "INT"
        return f"[{tag}] {self.name}"


class MaintenanceType(models.TextChoices):
    PREVENTIVO  = "PREVENTIVO",  "Preventivo"
    CORRECTIVO  = "CORRECTIVO",  "Correctivo"
    PREDICTIVO  = "PREDICTIVO",  "Predictivo"
    GARANTIA    = "GARANTIA",    "Por garantía"
    EMERGENCIA  = "EMERGENCIA",  "Emergencia"


class MaintenanceStatus(models.TextChoices):
    PROGRAMADO        = "PROGRAMADO",        "Programado"
    EN_PROCESO        = "EN_PROCESO",        "En proceso"
    ESPERA_REPUESTOS  = "ESPERA_REPUESTOS",  "En espera de repuestos"
    COMPLETADO        = "COMPLETADO",        "Completado"
    CANCELADO         = "CANCELADO",         "Cancelado"
    VENCIDO           = "VENCIDO",           "Vencido (sin realizar)"


class MaintenanceRecord(BaseModel):
    """Registro de mantenimiento realizado o programado para un activo."""
    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.CASCADE,
        related_name="maintenance_records",
        verbose_name="Activo",
    )
    maintenance_type   = models.CharField(max_length=15, choices=MaintenanceType.choices, verbose_name="Tipo")
    status             = models.CharField(max_length=20, choices=MaintenanceStatus.choices, default=MaintenanceStatus.PROGRAMADO, verbose_name="Estado")

    scheduled_date     = models.DateField(verbose_name="Fecha programada")
    completed_date     = models.DateField(null=True, blank=True, verbose_name="Fecha de realización")
    next_maintenance   = models.DateField(null=True, blank=True, verbose_name="Próximo mantenimiento")

    technician         = models.CharField(max_length=150, blank=True, verbose_name="Técnico responsable (nombre)")
    technician_ref     = models.ForeignKey(
        Technician,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="maintenance_records",
        verbose_name="Técnico (catálogo)",
    )
    supplier           = models.CharField(max_length=200, blank=True, verbose_name="Empresa / Proveedor")
    work_order         = models.CharField(max_length=50, blank=True, verbose_name="N° Orden de trabajo")

    description        = models.TextField(verbose_name="Descripción del trabajo realizado")
    findings           = models.TextField(blank=True, verbose_name="Hallazgos")
    parts_replaced     = models.JSONField(null=True, blank=True, verbose_name="Partes/piezas reemplazadas")

    cost               = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Costo ($)")
    downtime_hours     = models.DecimalField(max_digits=6, decimal_places=1, default=0, verbose_name="Horas fuera de servicio")

    class Meta:
        verbose_name = "Registro de mantenimiento"
        verbose_name_plural = "Registros de mantenimiento"
        ordering = ["-scheduled_date"]
        indexes = [
            models.Index(fields=["asset", "status"], name="idx_maint_asset_status"),
            models.Index(fields=["scheduled_date", "status"], name="idx_maint_date_status"),
            models.Index(fields=["next_maintenance"], name="idx_maint_next"),
        ]

    def __str__(self):
        return f"[{self.maintenance_type}] {self.asset.asset_code} — {self.scheduled_date}"


class MaintenanceStatusLog(models.Model):
    """
    Log de cambios de estado para un mantenimiento.
    Cada transición queda registrada con usuario, fecha y observaciones.
    """
    record      = models.ForeignKey(
        MaintenanceRecord,
        on_delete=models.CASCADE,
        related_name="status_logs",
        verbose_name="Registro de mantenimiento",
    )
    status      = models.CharField(max_length=20, choices=MaintenanceStatus.choices, verbose_name="Estado")
    notes       = models.TextField(blank=True, verbose_name="Observaciones del cambio")
    changed_by  = models.ForeignKey(
        "users.CustomUser",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="Cambiado por",
    )
    changed_at  = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y hora del cambio")

    class Meta:
        verbose_name = "Log de estado de mantenimiento"
        verbose_name_plural = "Logs de estado de mantenimiento"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"[{self.record.id}] → {self.status} ({self.changed_at:%Y-%m-%d %H:%M})"

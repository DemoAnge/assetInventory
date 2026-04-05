"""
Módulo de Mantenimiento de Activos.
Registra mantenimientos preventivos y correctivos con programación de próximas fechas.
"""
from django.db import models
from apps.shared.models import BaseModel


class MaintenanceType(models.TextChoices):
    PREVENTIVO  = "PREVENTIVO",  "Preventivo"
    CORRECTIVO  = "CORRECTIVO",  "Correctivo"
    PREDICTIVO  = "PREDICTIVO",  "Predictivo"
    GARANTIA    = "GARANTIA",    "Por garantía"
    EMERGENCIA  = "EMERGENCIA",  "Emergencia"


class MaintenanceStatus(models.TextChoices):
    PROGRAMADO  = "PROGRAMADO",  "Programado"
    EN_PROCESO  = "EN_PROCESO",  "En proceso"
    COMPLETADO  = "COMPLETADO",  "Completado"
    CANCELADO   = "CANCELADO",   "Cancelado"
    VENCIDO     = "VENCIDO",     "Vencido (sin realizar)"


class MaintenanceRecord(BaseModel):
    """Registro de mantenimiento realizado o programado para un activo."""
    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.CASCADE,
        related_name="maintenance_records",
        verbose_name="Activo",
    )
    maintenance_type   = models.CharField(max_length=15, choices=MaintenanceType.choices, verbose_name="Tipo")
    status             = models.CharField(max_length=15, choices=MaintenanceStatus.choices, default=MaintenanceStatus.PROGRAMADO, verbose_name="Estado")

    scheduled_date     = models.DateField(verbose_name="Fecha programada")
    completed_date     = models.DateField(null=True, blank=True, verbose_name="Fecha de realización")
    next_maintenance   = models.DateField(null=True, blank=True, verbose_name="Próximo mantenimiento")

    technician         = models.CharField(max_length=150, blank=True, verbose_name="Técnico responsable")
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

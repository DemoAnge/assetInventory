"""
Módulo TI — Inventario tecnológico, licencias de software, dispositivos de red.
Gestión de activos críticos y niveles de riesgo operativo.
"""
from django.db import models
from apps.shared.models import BaseModel


class ITRiskLevel(models.TextChoices):
    CRITICO = "CRITICO", "Crítico"
    ALTO    = "ALTO",    "Alto"
    MEDIO   = "MEDIO",   "Medio"
    BAJO    = "BAJO",    "Bajo"


class ITAssetProfile(BaseModel):
    """
    Perfil extendido TI de un activo.
    Relación 1:1 con Asset, agrega información técnica y de riesgo operativo.
    """
    asset           = models.OneToOneField("assets.Asset", on_delete=models.CASCADE, related_name="it_profile", verbose_name="Activo")
    hostname        = models.CharField(max_length=100, blank=True, verbose_name="Hostname / Nombre de equipo")
    ip_address      = models.GenericIPAddressField(null=True, blank=True, verbose_name="Dirección IP")
    mac_address     = models.CharField(max_length=17, blank=True, verbose_name="Dirección MAC")
    os_name         = models.CharField(max_length=100, blank=True, verbose_name="Sistema operativo")
    os_version      = models.CharField(max_length=50, blank=True, verbose_name="Versión SO")
    processor       = models.CharField(max_length=150, blank=True, verbose_name="Procesador")
    ram_gb          = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name="RAM (GB)")
    storage_gb      = models.PositiveIntegerField(null=True, blank=True, verbose_name="Almacenamiento (GB)")
    risk_level      = models.CharField(max_length=10, choices=ITRiskLevel.choices, default=ITRiskLevel.BAJO, verbose_name="Nivel de riesgo operativo")
    is_server       = models.BooleanField(default=False, verbose_name="Es servidor")
    is_network_device = models.BooleanField(default=False, verbose_name="Es dispositivo de red")
    last_scan_date  = models.DateField(null=True, blank=True, verbose_name="Último escaneo de seguridad")
    antivirus       = models.CharField(max_length=100, blank=True, verbose_name="Antivirus instalado")
    notes           = models.TextField(blank=True, verbose_name="Notas TI")

    class Meta:
        verbose_name = "Perfil TI del activo"
        verbose_name_plural = "Perfiles TI de activos"

    def __str__(self):
        return f"TI: {self.asset.asset_code} ({self.hostname or 'sin hostname'})"


class LicenseType(models.TextChoices):
    PERPETUA    = "PERPETUA",    "Licencia perpetua"
    SUSCRIPCION = "SUSCRIPCION", "Suscripción anual"
    OEM         = "OEM",         "OEM"
    OPEN_SOURCE = "OPEN_SOURCE", "Código abierto"
    VOLUMEN     = "VOLUMEN",     "Licencia por volumen"


class SoftwareLicense(BaseModel):
    """Licencia de software asignada a uno o más activos TI."""
    software_name   = models.CharField(max_length=150, verbose_name="Nombre del software")
    version         = models.CharField(max_length=50, blank=True, verbose_name="Versión")
    license_key     = models.CharField(max_length=255, blank=True, verbose_name="Clave de licencia")
    license_type    = models.CharField(max_length=15, choices=LicenseType.choices, verbose_name="Tipo de licencia")
    seats           = models.PositiveIntegerField(default=1, verbose_name="Número de licencias")
    used_seats      = models.PositiveIntegerField(default=0, verbose_name="Licencias en uso")
    vendor          = models.CharField(max_length=150, blank=True, verbose_name="Proveedor")
    purchase_date   = models.DateField(null=True, blank=True, verbose_name="Fecha de compra")
    expiry_date     = models.DateField(null=True, blank=True, verbose_name="Fecha de vencimiento")
    cost            = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Costo ($)")
    assets          = models.ManyToManyField("assets.Asset", blank=True, related_name="licenses", verbose_name="Activos asignados")
    notes           = models.TextField(blank=True, verbose_name="Notas")

    class Meta:
        verbose_name = "Licencia de software"
        verbose_name_plural = "Licencias de software"
        ordering = ["software_name"]

    def __str__(self):
        return f"{self.software_name} v{self.version} ({self.seats} licencias)"

    @property
    def available_seats(self) -> int:
        return max(0, self.seats - self.used_seats)

    @property
    def is_expired(self) -> bool:
        if not self.expiry_date:
            return False
        from django.utils import timezone
        return self.expiry_date < timezone.now().date()

"""
Módulo de Inventario de Activos.
Modelo central del sistema con relación auto-referencial 1:N para componentes.

Normalización 2FN/3FN:
  Brand      → catálogo de marcas
  AssetType  → tipos de activo (Laptop, Servidor, Switch...) con su categoría
  AssetModel → modelo específico: Brand + AssetType (e.g. Dell Latitude 5540 Laptop)
  Asset      → referencia AssetModel en lugar de repetir marca/modelo como texto
"""
import uuid
from django.db import models
EncryptedDecimalField = models.DecimalField  # dev fallback: producción usa AES-256
from apps.shared.models import BaseModel


class AssetCategory(models.TextChoices):
    COMPUTO          = "COMPUTO",          "Equipo de cómputo"
    VEHICULO         = "VEHICULO",         "Vehículo"
    MAQUINARIA       = "MAQUINARIA",       "Maquinaria y equipo"
    MUEBLE           = "MUEBLE",           "Mueble y ensere"
    INMUEBLE         = "INMUEBLE",         "Inmueble / Edificio"
    TELECOMUNICACION = "TELECOMUNICACION", "Telecomunicaciones"
    OTRO             = "OTRO",             "Otro"


class ComponentType(models.TextChoices):
    MONITOR     = "MONITOR",     "Monitor"
    TECLADO     = "TECLADO",     "Teclado"
    MOUSE       = "MOUSE",       "Mouse"
    PARLANTE    = "PARLANTE",    "Parlante / Bocina"
    ANTENA_WIFI = "ANTENA_WIFI", "Antena WiFi"
    UPS         = "UPS",         "UPS / Regulador"
    DOCKING     = "DOCKING",     "Docking Station"
    PATCH_PANEL = "PATCH_PANEL", "Patch Panel"
    KVM         = "KVM",         "Switch KVM"
    RACK        = "RACK",        "Rack / Gabinete"
    SWITCH      = "SWITCH",      "Switch de red"
    DISCO       = "DISCO",       "Disco duro adicional"
    MEMORIA     = "MEMORIA",     "Módulo de memoria"
    IMPRESORA   = "IMPRESORA",   "Impresora"
    CAMARA      = "CAMARA",      "Cámara / Escáner"
    OTRO        = "OTRO",        "Otro componente"


# ── Catálogos normalizados ─────────────────────────────────────────────────────

class Brand(BaseModel):
    """Catálogo de marcas (Dell, HP, Cisco, Toyota…)."""
    name    = models.CharField(max_length=100, unique=True, verbose_name="Marca")
    country = models.CharField(max_length=100, blank=True, verbose_name="País de origen")
    website = models.URLField(blank=True, verbose_name="Sitio web")

    class Meta:
        verbose_name = "Marca"
        verbose_name_plural = "Marcas"
        ordering = ["name"]

    def __str__(self):
        return self.name


class AssetType(BaseModel):
    """
    Tipo de activo dentro de una categoría.
    Ejemplos: Laptop (COMPUTO), Servidor (COMPUTO), Switch (TELECOMUNICACION),
              Camioneta (VEHICULO), Escritorio (MUEBLE).
    """
    name     = models.CharField(max_length=100, unique=True, verbose_name="Tipo de activo")
    category = models.CharField(
        max_length=20, choices=AssetCategory.choices,
        verbose_name="Categoría LORTI",
    )
    description   = models.TextField(blank=True, verbose_name="Descripción")
    code_prefix   = models.CharField(max_length=10, blank=True, verbose_name="Prefijo de código", help_text="Prefijo para generación automática de código (ej. PC, LAP, IMP)")
    is_it_managed = models.BooleanField(default=False, verbose_name="Gestionado por TI", help_text="Aparece en el módulo TI (hostname, IP, SO, etc.)")
    component_type_link = models.CharField(
        max_length=20, choices=ComponentType.choices,
        null=True, blank=True,
        verbose_name="Tipo de componente vinculado",
        help_text="Vincula este AssetType con un ComponentType para generación automática de código al crear componentes",
    )

    class Meta:
        verbose_name = "Tipo de activo"
        verbose_name_plural = "Tipos de activo"
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class AssetModel(BaseModel):
    """
    Modelo comercial específico de un activo.
    Clave compuesta lógica: Brand + name (únicos juntos).
    Ejemplo: Dell / Latitude 5540 / Laptop
    """
    brand      = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name="models", verbose_name="Marca")
    asset_type = models.ForeignKey(AssetType, on_delete=models.SET_NULL, null=True, blank=True, related_name="models", verbose_name="Tipo")
    name       = models.CharField(max_length=150, verbose_name="Nombre del modelo")

    class Meta:
        verbose_name = "Modelo de activo"
        verbose_name_plural = "Modelos de activo"
        ordering = ["brand__name", "name"]
        unique_together = [("brand", "name")]

    def __str__(self):
        tipo = self.asset_type.name if self.asset_type_id else "Sin tipo"
        return f"{self.brand.name} {self.name} — {tipo}"

    @property
    def category(self) -> str:
        """Categoría LORTI derivada del tipo."""
        return self.asset_type.category if self.asset_type_id else ""


class AssetStatus(models.TextChoices):
    ACTIVO        = "ACTIVO",        "Activo"
    INACTIVO      = "INACTIVO",      "Inactivo / Baja"
    MANTENIMIENTO = "MANTENIMIENTO", "En mantenimiento"
    VENDIDO       = "VENDIDO",       "Vendido"
    PRESTADO      = "PRESTADO",      "En préstamo"
    ROBADO        = "ROBADO",        "Robado / Siniestro"


# Tasas de depreciación LORTI Art. 28
DEPRECIATION_RATES = {
    "COMPUTO":          {"years": 3,  "rate": 33.33},
    "VEHICULO":         {"years": 5,  "rate": 20.00},
    "MAQUINARIA":       {"years": 10, "rate": 10.00},
    "MUEBLE":           {"years": 10, "rate": 10.00},
    "INMUEBLE":         {"years": 20, "rate": 5.00},
    "TELECOMUNICACION": {"years": 5,  "rate": 20.00},
    "OTRO":             {"years": 10, "rate": 10.00},
}

SEPS_ACCOUNTS = {
    "COMPUTO":          "1805",
    "VEHICULO":         "1806",
    "MAQUINARIA":       "1803",
    "MUEBLE":           "1804",
    "INMUEBLE":         "1801",
    "TELECOMUNICACION": "1807",
    "OTRO":             "1899",
}


class Asset(BaseModel):
    """
    Activo fijo de la cooperativa.
    Relación auto-referencial 1:N: un PC (padre) puede tener monitor, teclado, mouse, etc. (hijos).
    Reglas:
      - Movimiento del padre arrastra todos los hijos.
      - No se puede dar de baja un padre con hijos activos (validar antes de DELETE).
    """
    # ── Identificación ────────────────────────────────────────────────────────
    asset_code    = models.CharField(max_length=30, unique=True, verbose_name="Código de activo")
    serial_number = models.CharField(max_length=100, blank=True, null=True, verbose_name="N° de serie")
    name          = models.CharField(max_length=255, verbose_name="Nombre / Descripción")
    color         = models.CharField(max_length=50, blank=True, verbose_name="Color")
    observations  = models.TextField(blank=True, verbose_name="Observaciones")

    # ── Catálogo normalizado (2FN) ─────────────────────────────────────────────
    # brand + model_name ya no son texto libre; se referencian desde AssetModel
    asset_model = models.ForeignKey(
        AssetModel, on_delete=models.PROTECT,
        null=True, blank=True,
        related_name="assets",
        verbose_name="Modelo del activo",
    )

    # ── Clasificación ─────────────────────────────────────────────────────────
    # category se auto-sincroniza desde asset_model.asset_type.category al guardar
    category = models.CharField(max_length=20, choices=AssetCategory.choices, verbose_name="Categoría")
    status   = models.CharField(
        max_length=20, choices=AssetStatus.choices,
        default=AssetStatus.ACTIVO, verbose_name="Estado",
    )

    # ── Relación padre-hijo (componentes 1:N auto-referencial) ───────────────
    parent_asset = models.ForeignKey(
        "self", on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="components",
        verbose_name="Activo padre",
    )
    component_type = models.CharField(
        max_length=20, choices=ComponentType.choices,
        null=True, blank=True, verbose_name="Tipo de componente",
    )

    # ── Ubicación ─────────────────────────────────────────────────────────────
    agency     = models.ForeignKey("locations.Agency", on_delete=models.SET_NULL, null=True, blank=True, related_name="assets", verbose_name="Agencia")
    department = models.ForeignKey("locations.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="assets", verbose_name="Departamento")
    area       = models.ForeignKey("locations.Area", on_delete=models.SET_NULL, null=True, blank=True, related_name="assets", verbose_name="Área")
    custodian  = models.ForeignKey("custodians.Custodian", on_delete=models.SET_NULL, null=True, blank=True, related_name="assets", verbose_name="Custodio")

    # ── Datos financieros (cifrados AES-256) ──────────────────────────────────
    purchase_value           = EncryptedDecimalField(max_digits=14, decimal_places=2, verbose_name="Valor de compra")
    residual_value           = EncryptedDecimalField(max_digits=14, decimal_places=2, default=0, verbose_name="Valor residual")
    current_value            = EncryptedDecimalField(max_digits=14, decimal_places=2, null=True, blank=True, verbose_name="Valor en libros")
    accumulated_depreciation = EncryptedDecimalField(max_digits=14, decimal_places=2, default=0, verbose_name="Depreciación acumulada")

    # ── Fechas ────────────────────────────────────────────────────────────────
    purchase_date     = models.DateField(verbose_name="Fecha de compra")
    activation_date   = models.DateField(null=True, blank=True, verbose_name="Fecha de activación")
    deactivation_date = models.DateField(null=True, blank=True, verbose_name="Fecha de baja")
    warranty_expiry   = models.DateField(null=True, blank=True, verbose_name="Vencimiento garantía")

    # ── Depreciación LORTI ────────────────────────────────────────────────────
    useful_life_years    = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name="Vida útil (años)")
    depreciation_rate    = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name="Tasa depreciación %")
    is_fully_depreciated = models.BooleanField(default=False, verbose_name="Totalmente depreciado")

    # ── Factura / Proveedor ───────────────────────────────────────────────────
    invoice_number = models.CharField(max_length=50, blank=True, verbose_name="N° de factura")
    supplier       = models.CharField(max_length=200, blank=True, verbose_name="Proveedor")
    invoice_image  = models.ImageField(upload_to="invoices/", null=True, blank=True, verbose_name="Imagen factura")

    # ── SEPS / Cuenta contable ────────────────────────────────────────────────
    seps_account_code = models.CharField(max_length=20, blank=True, verbose_name="Cuenta SEPS (18xx)")

    # ── QR ───────────────────────────────────────────────────────────────────
    qr_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, verbose_name="UUID QR")

    # ── Flags ─────────────────────────────────────────────────────────────────
    is_active            = models.BooleanField(default=True, verbose_name="Activo en inventario")
    is_critical_it       = models.BooleanField(default=False, verbose_name="Activo crítico TI")
    requires_maintenance = models.BooleanField(default=False, verbose_name="Requiere mantenimiento")

    class Meta:
        verbose_name = "Activo"
        verbose_name_plural = "Activos"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["asset_code"], name="idx_asset_code"),
            models.Index(fields=["category", "status"], name="idx_asset_cat_status"),
            models.Index(fields=["agency", "is_active"], name="idx_asset_agency"),
            models.Index(fields=["parent_asset"], name="idx_asset_parent"),
            models.Index(fields=["qr_uuid"], name="idx_asset_qr"),
        ]

    def __str__(self):
        return f"[{self.asset_code}] {self.name}"

    @property
    def is_component(self) -> bool:
        return self.parent_asset_id is not None

    @property
    def components_count(self) -> int:
        return self.components.filter(is_active=True).count()

    @property
    def depreciation_info(self) -> dict:
        return DEPRECIATION_RATES.get(self.category, {"years": 10, "rate": 10.0})

    def get_monthly_depreciation(self) -> float:
        try:
            pv = float(self.purchase_value)
            rv = float(self.residual_value or 0)
            years = self.useful_life_years or self.depreciation_info["years"]
            return round((pv - rv) / (years * 12), 2)
        except (TypeError, ZeroDivisionError):
            return 0.0

    def save(self, *args, **kwargs):
        # Sincronizar category desde el modelo normalizado
        if self.asset_model_id and not self.category:
            self.category = self.asset_model.asset_type.category
        if not self.useful_life_years and self.category:
            info = self.depreciation_info
            self.useful_life_years = info["years"]
            self.depreciation_rate = info["rate"]
        if not self.seps_account_code and self.category:
            self.seps_account_code = SEPS_ACCOUNTS.get(self.category, "1899")
        super().save(*args, **kwargs)

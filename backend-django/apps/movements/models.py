"""
Módulo de Movimientos de Activos.
Regla clave: el traslado del padre arrastra a todos sus hijos activos.
"""
from django.db import models
from apps.shared.models import BaseModel


class MovementType(models.TextChoices):
    TRASLADO     = "TRASLADO",     "Traslado entre agencias/áreas"
    PRESTAMO     = "PRESTAMO",     "Préstamo temporal"
    DEVOLUCION   = "DEVOLUCION",   "Devolución de préstamo"
    REASIGNACION = "REASIGNACION", "Reasignación de custodio"
    INGRESO      = "INGRESO",      "Ingreso inicial"
    BAJA         = "BAJA",         "Baja / Retiro"


class AssetMovement(BaseModel):
    """
    Registro de un movimiento de activo.
    Si el activo tiene componentes (hijos), se generan registros individuales
    para cada hijo automáticamente, vinculados a este movimiento padre.
    """
    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.CASCADE,
        related_name="movements",
        verbose_name="Activo",
    )
    movement_type = models.CharField(
        max_length=15,
        choices=MovementType.choices,
        verbose_name="Tipo de movimiento",
    )
    movement_date = models.DateField(verbose_name="Fecha del movimiento")

    # Origen
    origin_agency     = models.ForeignKey("locations.Agency",     on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_out",  verbose_name="Agencia origen")
    origin_department = models.ForeignKey("locations.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_out",  verbose_name="Depto. origen")
    origin_area       = models.ForeignKey("locations.Area",       on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_out",  verbose_name="Área origen")
    origin_custodian  = models.ForeignKey("custodians.Custodian", on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_out",  verbose_name="Custodio origen")

    # Destino
    dest_agency     = models.ForeignKey("locations.Agency",     on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_in", verbose_name="Agencia destino")
    dest_department = models.ForeignKey("locations.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_in", verbose_name="Depto. destino")
    dest_area       = models.ForeignKey("locations.Area",       on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_in", verbose_name="Área destino")
    dest_custodian  = models.ForeignKey("custodians.Custodian", on_delete=models.SET_NULL, null=True, blank=True, related_name="movements_in", verbose_name="Custodio destino")

    # Metadatos
    reason          = models.TextField(verbose_name="Motivo del movimiento")
    authorized_by   = models.ForeignKey("users.CustomUser", on_delete=models.SET_NULL, null=True, blank=True, related_name="authorized_movements", verbose_name="Autorizado por")
    observations    = models.TextField(blank=True, verbose_name="Observaciones")
    document_ref    = models.CharField(max_length=50, blank=True, verbose_name="N° documento / acta")

    # Si es hijo arrastrado por el padre
    parent_movement = models.ForeignKey(
        "self", on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="component_movements",
        verbose_name="Movimiento padre (arrastre)",
    )
    is_cascade = models.BooleanField(default=False, verbose_name="Generado por arrastre")

    class Meta:
        verbose_name = "Movimiento de activo"
        verbose_name_plural = "Movimientos de activos"
        ordering = ["-movement_date", "-created_at"]
        indexes = [
            models.Index(fields=["asset", "movement_date"], name="idx_mov_asset_date"),
            models.Index(fields=["movement_type", "movement_date"], name="idx_mov_type_date"),
            models.Index(fields=["dest_agency"], name="idx_mov_dest_agency"),
        ]

    def __str__(self):
        return f"[{self.movement_type}] {self.asset.asset_code} — {self.movement_date}"

"""
Custodians module.
Asset custodians — separated from CustomUser (system access users).

Business rule: records are NEVER deleted. Logical deactivation (is_active=False)
preserves full historical traceability of all assets ever held by a custodian.
"""
from django.db import models
from apps.shared.models import BaseModel


class Custodian(BaseModel):
    """
    Person responsible for / custodian of fixed assets.

    Not necessarily a system user. An employee can have assets assigned
    without needing platform access.

    `assets_count` is NOT stored here — it is computed as a queryset
    annotation in the ViewSet to avoid N+1 queries.
    """
    first_name = models.CharField(max_length=100, verbose_name="Nombre")
    last_name  = models.CharField(max_length=100, verbose_name="Apellido")
    id_number  = models.CharField(
        max_length=13,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Cédula",
        help_text="Cédula de identidad ecuatoriana (opcional).",
    )
    position   = models.CharField(max_length=150, verbose_name="Cargo")
    phone      = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        verbose_name="Teléfono",
    )
    agency     = models.ForeignKey(
        "locations.Agency",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="custodians",
        verbose_name="Agencia",
    )
    is_active  = models.BooleanField(
        default=True,
        verbose_name="Activo",
        help_text="Desactivación lógica. El registro nunca se elimina para preservar la trazabilidad histórica.",
    )

    class Meta:
        verbose_name = "Custodio"
        verbose_name_plural = "Custodios"
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["id_number"],               name="idx_custodian_id_number"),
            models.Index(fields=["last_name", "first_name"],  name="idx_custodian_name"),
            models.Index(fields=["is_active"],               name="idx_custodian_active"),
            models.Index(fields=["agency"],                  name="idx_custodian_agency"),
        ]

    def __str__(self):
        return f"{self.full_name} — {self.position}"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

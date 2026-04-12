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
    first_name = models.CharField(max_length=100, verbose_name="First name")
    last_name  = models.CharField(max_length=100, verbose_name="Last name")
    id_number  = models.CharField(max_length=13, unique=True, verbose_name="ID / Tax number")
    position   = models.CharField(max_length=150, verbose_name="Job position")
    is_active  = models.BooleanField(
        default=True,
        verbose_name="Active",
        help_text="Logical deactivation. Record is never deleted to preserve historical traceability.",
    )

    class Meta:
        verbose_name = "Custodian"
        verbose_name_plural = "Custodians"
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["id_number"],              name="idx_custodian_id_number"),
            models.Index(fields=["last_name", "first_name"], name="idx_custodian_name"),
            models.Index(fields=["is_active"],              name="idx_custodian_active"),
        ]

    def __str__(self):
        return f"{self.full_name} — {self.position}"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

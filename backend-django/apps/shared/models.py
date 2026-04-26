"""Modelo base abstracto para todos los modelos del sistema."""
from django.db import models
from django.conf import settings


class BaseModel(models.Model):
    """
    Proporciona campos de auditoría automáticos a todos los modelos.
    Heredar de esta clase en lugar de models.Model.
    """
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha actualización")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_created",
        verbose_name="Creado por",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_updated",
        verbose_name="Actualizado por",
    )

    class Meta:
        abstract = True

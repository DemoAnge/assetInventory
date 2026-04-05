"""
Módulo de Ubicación y Organización.
Jerarquía: Agencia → Departamento → Área
"""
from django.db import models
from apps.shared.models import BaseModel


class Agency(BaseModel):
    """Agencia o sucursal de la cooperativa."""
    code = models.CharField(max_length=10, unique=True, verbose_name="Código")
    name = models.CharField(max_length=150, verbose_name="Nombre")
    address = models.TextField(blank=True, verbose_name="Dirección")
    city = models.CharField(max_length=100, verbose_name="Ciudad")
    province = models.CharField(max_length=100, verbose_name="Provincia")
    phone = models.CharField(max_length=15, blank=True, verbose_name="Teléfono")
    is_main = models.BooleanField(default=False, verbose_name="Es matriz")
    is_active = models.BooleanField(default=True, verbose_name="Activa")

    class Meta:
        verbose_name = "Agencia"
        verbose_name_plural = "Agencias"
        ordering = ["name"]

    def __str__(self):
        tag = " [MATRIZ]" if self.is_main else ""
        return f"{self.code} — {self.name}{tag}"


class Department(BaseModel):
    """Departamento dentro de una agencia."""
    agency = models.ForeignKey(
        Agency,
        on_delete=models.CASCADE,
        related_name="departments",
        verbose_name="Agencia",
    )
    code = models.CharField(max_length=10, verbose_name="Código")
    name = models.CharField(max_length=150, verbose_name="Nombre")
    description = models.TextField(blank=True, verbose_name="Descripción")
    is_active = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"
        ordering = ["agency", "name"]
        unique_together = [("agency", "code")]

    def __str__(self):
        return f"{self.agency.code} / {self.code} — {self.name}"


class Area(BaseModel):
    """Área o sección dentro de un departamento."""
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="areas",
        verbose_name="Departamento",
    )
    code = models.CharField(max_length=10, verbose_name="Código")
    name = models.CharField(max_length=150, verbose_name="Nombre")
    floor = models.CharField(max_length=20, blank=True, verbose_name="Piso / Planta")
    description = models.TextField(blank=True, verbose_name="Descripción")
    is_active = models.BooleanField(default=True, verbose_name="Activa")

    class Meta:
        verbose_name = "Área"
        verbose_name_plural = "Áreas"
        ordering = ["department", "name"]
        unique_together = [("department", "code")]

    def __str__(self):
        return f"{self.department.agency.code} / {self.department.code} / {self.code} — {self.name}"

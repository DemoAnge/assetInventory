"""
Módulo de Documentos — adjuntos de activos (facturas, contratos, manuales, fotos).
"""
from django.conf import settings
from django.db import models
from apps.shared.models import BaseModel


class DocumentType(models.TextChoices):
    FACTURA       = "FACTURA",       "Factura de compra"
    CONTRATO      = "CONTRATO",      "Contrato"
    MANUAL        = "MANUAL",        "Manual / Guía"
    GARANTIA      = "GARANTIA",      "Certificado de garantía"
    FOTO          = "FOTO",          "Fotografía"
    ACTA_ENTREGA  = "ACTA_ENTREGA",  "Acta de entrega"
    SEGURO        = "SEGURO",        "Póliza de seguro"
    OTRO          = "OTRO",          "Otro"


class AssetDocument(BaseModel):
    """Documento adjunto vinculado a un activo."""
    asset         = models.ForeignKey(
        "assets.Asset", on_delete=models.CASCADE,
        related_name="documents", verbose_name="Activo"
    )
    title         = models.CharField(max_length=200, verbose_name="Título")
    document_type = models.CharField(
        max_length=20, choices=DocumentType.choices,
        default=DocumentType.OTRO, verbose_name="Tipo de documento"
    )
    file          = models.FileField(upload_to="documents/%Y/%m/", verbose_name="Archivo")
    file_size     = models.PositiveIntegerField(default=0, verbose_name="Tamaño (bytes)")
    notes         = models.TextField(blank=True, verbose_name="Notas")
    uploaded_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="uploaded_documents"
    )

    class Meta:
        verbose_name = "Documento de activo"
        verbose_name_plural = "Documentos de activos"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} — {self.asset.asset_code}"

    def save(self, *args, **kwargs):
        if self.file and hasattr(self.file, "size"):
            self.file_size = self.file.size
        super().save(*args, **kwargs)

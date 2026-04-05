"""
Módulo Contable — depreciación LORTI, venta de activos, asientos SEPS, NIC 16.
"""
from decimal import Decimal
from django.db import models
EncryptedDecimalField = models.DecimalField  # dev fallback
from apps.shared.models import BaseModel


class DepreciationSchedule(BaseModel):
    """
    Cronograma de depreciación mensual de un activo (LORTI Art. 28).
    dep_anual  = (valor_compra - valor_residual) / vida_util_años
    dep_mensual = dep_anual / 12
    """
    asset = models.ForeignKey(
        "assets.Asset",
        on_delete=models.CASCADE,
        related_name="depreciation_schedules",
        verbose_name="Activo",
    )
    period_year    = models.PositiveSmallIntegerField(verbose_name="Año")
    period_month   = models.PositiveSmallIntegerField(verbose_name="Mes")
    period_date    = models.DateField(verbose_name="Fecha del período")

    # Valores del período
    opening_value        = EncryptedDecimalField(max_digits=14, decimal_places=2, verbose_name="Valor inicial período")
    monthly_depreciation = EncryptedDecimalField(max_digits=14, decimal_places=2, verbose_name="Depreciación mensual")
    accumulated          = EncryptedDecimalField(max_digits=14, decimal_places=2, verbose_name="Depreciación acumulada")
    closing_value        = EncryptedDecimalField(max_digits=14, decimal_places=2, verbose_name="Valor en libros al cierre")

    is_processed = models.BooleanField(default=False, verbose_name="Procesado")
    journal_entry_ref = models.CharField(max_length=50, blank=True, verbose_name="Ref. asiento contable")

    class Meta:
        verbose_name = "Cuota de depreciación"
        verbose_name_plural = "Cronograma de depreciación"
        ordering = ["asset", "period_year", "period_month"]
        unique_together = [("asset", "period_year", "period_month")]
        indexes = [
            models.Index(fields=["asset", "period_date"], name="idx_dep_asset_period"),
            models.Index(fields=["period_date", "is_processed"], name="idx_dep_date_proc"),
        ]

    def __str__(self):
        return f"{self.asset.asset_code} — {self.period_year}/{self.period_month:02d}"


class SaleResultType(models.TextChoices):
    GANANCIA = "GANANCIA", "Ganancia en venta"
    PERDIDA  = "PERDIDA",  "Pérdida en venta"


class AssetSale(BaseModel):
    """
    Registro de venta de activo con cálculo automático de resultado y asiento SEPS.
    resultado = precio_venta - (valor_compra - depreciacion_acumulada)
    cuenta_seps = 4103 (ganancia) | 5103 (pérdida)
    """
    asset = models.OneToOneField(
        "assets.Asset",
        on_delete=models.PROTECT,
        related_name="sale",
        verbose_name="Activo vendido",
    )
    sale_date     = models.DateField(verbose_name="Fecha de venta")
    buyer_name    = models.CharField(max_length=200, verbose_name="Nombre del comprador")
    buyer_id      = models.CharField(max_length=13, verbose_name="CI/RUC comprador")
    invoice_number = models.CharField(max_length=50, verbose_name="N° factura de venta")

    # Valores cifrados
    sale_price           = EncryptedDecimalField(max_digits=14, decimal_places=2, verbose_name="Precio de venta")
    book_value_at_sale   = EncryptedDecimalField(max_digits=14, decimal_places=2, verbose_name="Valor en libros al momento de venta")
    accumulated_dep      = EncryptedDecimalField(max_digits=14, decimal_places=2, verbose_name="Depreciación acumulada al vender")
    sale_result          = EncryptedDecimalField(max_digits=14, decimal_places=2, verbose_name="Resultado (ganancia/pérdida)")

    result_type   = models.CharField(max_length=10, choices=SaleResultType.choices, verbose_name="Tipo de resultado")
    seps_account  = models.CharField(max_length=10, verbose_name="Cuenta SEPS (4103/5103)")

    # Asiento contable generado
    journal_entry_generated = models.BooleanField(default=False, verbose_name="Asiento generado")
    journal_entry_data      = models.JSONField(null=True, blank=True, verbose_name="Datos del asiento")
    observations            = models.TextField(blank=True, verbose_name="Observaciones")

    class Meta:
        verbose_name = "Venta de activo"
        verbose_name_plural = "Ventas de activos"
        ordering = ["-sale_date"]

    def __str__(self):
        return f"Venta {self.asset.asset_code} — {self.result_type} ${self.sale_result}"

    @classmethod
    def calculate_result(cls, sale_price: Decimal, purchase_value: Decimal, accumulated_dep: Decimal) -> dict:
        """
        Calcula el resultado de la venta según NIC 16.
        resultado = precio_venta - (valor_compra - depreciacion_acumulada)
        """
        book_value = purchase_value - accumulated_dep
        resultado = sale_price - book_value
        tipo = SaleResultType.GANANCIA if resultado >= 0 else SaleResultType.PERDIDA
        cuenta_seps = "4103" if tipo == SaleResultType.GANANCIA else "5103"
        return {
            "book_value":    round(book_value, 2),
            "sale_result":   round(resultado, 2),
            "result_type":   tipo,
            "seps_account":  cuenta_seps,
        }

    @classmethod
    def build_journal_entry(cls, sale) -> dict:
        """
        Genera el asiento contable automático según NIC 16 y catálogo SEPS.
        Débito:  Efectivo/CxC (sale_price) + Depreciación Acumulada (dep)
        Crédito: Activo (purchase_value) + Ganancia/Pérdida (resultado)
        """
        pv  = float(sale.asset.purchase_value)
        dep = float(sale.accumulated_dep)
        sp  = float(sale.sale_price)
        res = float(sale.sale_result)

        if sale.result_type == SaleResultType.GANANCIA:
            return {
                "date": str(sale.sale_date),
                "description": f"Venta activo {sale.asset.asset_code} — Ganancia NIC 16",
                "debits": [
                    {"account": "1101", "description": "Efectivo / CxC comprador", "amount": sp},
                    {"account": f"18{sale.asset.seps_account_code}D", "description": "Dep. acumulada", "amount": dep},
                ],
                "credits": [
                    {"account": sale.asset.seps_account_code, "description": "Activo fijo", "amount": pv},
                    {"account": "4103", "description": "Ganancia en venta de bienes", "amount": res},
                ],
            }
        else:
            return {
                "date": str(sale.sale_date),
                "description": f"Venta activo {sale.asset.asset_code} — Pérdida NIC 16",
                "debits": [
                    {"account": "1101", "description": "Efectivo / CxC comprador", "amount": sp},
                    {"account": f"18{sale.asset.seps_account_code}D", "description": "Dep. acumulada", "amount": dep},
                    {"account": "5103", "description": "Pérdida en venta de bienes", "amount": abs(res)},
                ],
                "credits": [
                    {"account": sale.asset.seps_account_code, "description": "Activo fijo", "amount": pv},
                ],
            }


class AccountingEntry(BaseModel):
    """Registro de asientos contables generados por el sistema."""
    reference     = models.CharField(max_length=50, unique=True, verbose_name="Referencia")
    entry_date    = models.DateField(verbose_name="Fecha")
    description   = models.CharField(max_length=300, verbose_name="Descripción")
    entry_data    = models.JSONField(verbose_name="Datos del asiento")
    entry_type    = models.CharField(
        max_length=30,
        choices=[("DEPRECIATION", "Depreciación"), ("SALE", "Venta"), ("ADJUSTMENT", "Ajuste")],
        verbose_name="Tipo",
    )
    asset         = models.ForeignKey("assets.Asset", on_delete=models.SET_NULL, null=True, blank=True, related_name="accounting_entries")
    is_posted     = models.BooleanField(default=False, verbose_name="Contabilizado")

    class Meta:
        verbose_name = "Asiento contable"
        verbose_name_plural = "Asientos contables"
        ordering = ["-entry_date"]

    def __str__(self):
        return f"[{self.reference}] {self.description}"

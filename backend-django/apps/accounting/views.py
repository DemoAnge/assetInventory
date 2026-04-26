"""
ViewSets del módulo Contable.
Depreciación LORTI, cálculo de vida útil, venta de activos, asientos SEPS / NIC 16.
"""
from decimal import Decimal
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.assets.models import Asset, AssetStatus, DEPRECIATION_RATES
from apps.audit.models import AuditLog, AuditAction
from apps.shared.permissions import IsContabilidad
from apps.shared.utils import get_client_ip
from .models import DepreciationSchedule, AssetSale, SaleResultType, AccountingEntry
from .serializers import (
    DepreciationScheduleSerializer, AssetSaleReadSerializer,
    AssetSaleWriteSerializer, DepreciationSimulatorSerializer, AccountingEntrySerializer,
)


class DepreciationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/v1/accounting/depreciation/             → cronogramas existentes
    GET  /api/v1/accounting/depreciation/{id}/
    POST /api/v1/accounting/depreciation/generate/    → genera cronograma para un activo
    POST /api/v1/accounting/depreciation/simulate/    → simula sin persistir
    POST /api/v1/accounting/depreciation/process-month/ → procesa mes actual
    """
    serializer_class   = DepreciationScheduleSerializer
    permission_classes = [IsAuthenticated, IsContabilidad]
    filterset_fields   = ["asset", "period_year", "period_month", "is_processed"]
    ordering           = ["asset", "period_year", "period_month"]

    def get_queryset(self):
        return DepreciationSchedule.objects.select_related("asset").all()

    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request):
        """Genera el cronograma completo de depreciación para un activo."""
        asset_id = request.data.get("asset_id")
        try:
            asset = Asset.objects.get(pk=asset_id, is_active=True)
        except Asset.DoesNotExist:
            return Response({"detail": "Activo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if DepreciationSchedule.objects.filter(asset=asset).exists():
            return Response(
                {"detail": "Ya existe un cronograma para este activo. Use /recalculate/ para regenerarlo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        schedules = self._build_schedule(asset)
        DepreciationSchedule.objects.bulk_create(schedules)

        AuditLog.objects.create(
            user=request.user, action=AuditAction.DEPRECIATION,
            model="Asset", object_id=asset.pk,
            object_code=asset.asset_code, object_name=asset.name,
            module="accounting", ip_address=get_client_ip(request),
            extra_data={"periods_generated": len(schedules)},
        )
        return Response({
            "message": f"Cronograma generado: {len(schedules)} períodos.",
            "asset_code": asset.asset_code,
            "useful_life_years": asset.useful_life_years,
            "monthly_depreciation": asset.get_monthly_depreciation(),
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="simulate")
    def simulate(self, request):
        """Simula un cronograma de depreciación sin persistir (LORTI Art.28)."""
        serializer = DepreciationSimulatorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        pv    = float(d["purchase_value"])
        rv    = float(d["residual_value"])
        years = d["useful_life_years"]
        start = d["purchase_date"]
        monthly = round((pv - rv) / (years * 12), 2)

        periods = []
        accumulated = 0.0
        current = float(pv)
        period_date = start.replace(day=1)

        for i in range(years * 12):
            dep = min(monthly, current - rv)
            if dep <= 0:
                break
            accumulated = round(accumulated + dep, 2)
            current = round(current - dep, 2)
            periods.append({
                "period": f"{period_date.year}/{period_date.month:02d}",
                "monthly_depreciation": round(dep, 2),
                "accumulated": accumulated,
                "book_value":  current,
            })
            period_date = (period_date + timedelta(days=32)).replace(day=1)

        return Response({
            "purchase_value":   pv,
            "residual_value":   rv,
            "useful_life_years": years,
            "monthly_depreciation": monthly,
            "total_periods": len(periods),
            "schedule": periods,
        })

    @action(detail=False, methods=["post"], url_path="process-month")
    def process_month(self, request):
        """Procesa la depreciación del mes actual para todos los activos pendientes."""
        today = timezone.now().date()
        pending = DepreciationSchedule.objects.filter(
            period_year=today.year,
            period_month=today.month,
            is_processed=False,
            asset__is_active=True,
        ).select_related("asset")

        processed = 0
        for schedule in pending:
            schedule.is_processed = True
            asset = schedule.asset
            acc = Decimal(str(schedule.accumulated))
            asset.accumulated_depreciation = acc
            asset.current_value = Decimal(str(asset.purchase_value)) - acc
            if asset.current_value <= Decimal(str(asset.residual_value or 0)):
                asset.is_fully_depreciated = True
            asset.save(update_fields=["accumulated_depreciation", "current_value", "is_fully_depreciated"])
            schedule.save(update_fields=["is_processed"])
            processed += 1

        AuditLog.objects.create(
            user=request.user, action=AuditAction.DEPRECIATION,
            model="DepreciationSchedule", module="accounting",
            ip_address=get_client_ip(request),
            extra_data={"period": f"{today.year}/{today.month:02d}", "processed": processed},
        )
        return Response({"message": f"Procesados {processed} activos para {today.year}/{today.month:02d}."})

    def _build_schedule(self, asset) -> list:
        pv      = float(asset.purchase_value)
        rv      = float(asset.residual_value or 0)
        years   = asset.useful_life_years
        monthly = round((pv - rv) / (years * 12), 2)
        start   = (asset.activation_date or asset.purchase_date).replace(day=1)

        schedules = []
        accumulated = 0.0
        current = pv

        for i in range(years * 12):
            dep = min(monthly, round(current - rv, 2))
            if dep <= 0:
                break
            accumulated = round(accumulated + dep, 2)
            current = round(current - dep, 2)
            period = (start + relativedelta(months=i))
            schedules.append(DepreciationSchedule(
                asset=asset,
                period_year=period.year,
                period_month=period.month,
                period_date=period,
                opening_value=round(current + dep, 2),
                monthly_depreciation=dep,
                accumulated=accumulated,
                closing_value=current,
                created_by=None,
            ))
        return schedules


class AssetSaleViewSet(viewsets.ViewSet):
    """
    POST /api/v1/accounting/sales/        → registra venta
    GET  /api/v1/accounting/sales/        → lista ventas
    GET  /api/v1/accounting/sales/{id}/   → detalle
    GET  /api/v1/accounting/sales/preview/ → previsualiza resultado sin registrar
    """
    permission_classes = [IsAuthenticated, IsContabilidad]

    def list(self, request):
        qs = AssetSale.objects.select_related("asset").all().order_by("-sale_date")
        return Response(AssetSaleReadSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        try:
            sale = AssetSale.objects.select_related("asset").get(pk=pk)
        except AssetSale.DoesNotExist:
            return Response({"detail": "Venta no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AssetSaleReadSerializer(sale).data)

    def create(self, request):
        serializer = AssetSaleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        asset = Asset.objects.get(pk=d["asset_id"])
        sale_price = Decimal(str(d["sale_price"]))
        purchase_value = Decimal(str(asset.purchase_value))
        acc_dep = Decimal(str(asset.accumulated_depreciation or 0))

        result = AssetSale.calculate_result(sale_price, purchase_value, acc_dep)

        sale = AssetSale.objects.create(
            asset=asset,
            sale_date=d["sale_date"],
            buyer_name=d["buyer_name"],
            buyer_id=d["buyer_id"],
            invoice_number=d["invoice_number"],
            sale_price=sale_price,
            book_value_at_sale=result["book_value"],
            accumulated_dep=acc_dep,
            sale_result=result["sale_result"],
            result_type=result["result_type"],
            seps_account=result["seps_account"],
            observations=d.get("observations", ""),
            created_by=request.user,
        )

        # Generar asiento contable NIC 16
        journal = AssetSale.build_journal_entry(sale)
        sale.journal_entry_data = journal
        sale.journal_entry_generated = True
        sale.save(update_fields=["journal_entry_data", "journal_entry_generated"])

        # Marcar activo como vendido
        asset.status = AssetStatus.VENDIDO
        asset.is_active = False
        asset.deactivation_date = d["sale_date"]
        asset.save(update_fields=["status", "is_active", "deactivation_date"])

        AuditLog.objects.create(
            user=request.user, action=AuditAction.ASSET_SALE,
            model="AssetSale", object_id=sale.pk,
            object_code=asset.asset_code, object_name=asset.name,
            module="accounting", ip_address=get_client_ip(request),
            extra_data={
                "sale_price": str(sale_price),
                "result": str(result["sale_result"]),
                "result_type": result["result_type"],
                "seps_account": result["seps_account"],
            },
        )
        return Response(AssetSaleReadSerializer(sale).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="preview")
    def preview(self, request):
        """Previsualiza el resultado de la venta sin persistir."""
        asset_id   = request.data.get("asset_id")
        sale_price = request.data.get("sale_price")
        try:
            asset = Asset.objects.get(pk=asset_id, is_active=True)
        except Asset.DoesNotExist:
            return Response({"detail": "Activo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        result = AssetSale.calculate_result(
            Decimal(str(sale_price)),
            Decimal(str(asset.purchase_value)),
            Decimal(str(asset.accumulated_depreciation or 0)),
        )
        return Response({
            "asset_code":        asset.asset_code,
            "asset_name":        asset.name,
            "purchase_value":    float(asset.purchase_value),
            "accumulated_dep":   float(asset.accumulated_depreciation or 0),
            "book_value":        result["book_value"],
            "sale_price":        float(sale_price),
            "sale_result":       result["sale_result"],
            "result_type":       result["result_type"],
            "seps_account":      result["seps_account"],
            "description":       "Ganancia en venta de bienes" if result["result_type"] == SaleResultType.GANANCIA
                                 else "Pérdida en venta de bienes",
        })

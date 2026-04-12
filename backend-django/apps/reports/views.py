"""
Módulo de Reportería — endpoints de KPIs, estadísticas y exportación CSV.
"""
import csv
import io
from decimal import Decimal
from django.db.models import Count, Sum, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.assets.models import Asset, AssetStatus, AssetCategory
from apps.shared.permissions import IsAnyStaff, IsAdmin


class DashboardStatsView(APIView):
    """GET /api/v1/reports/dashboard/ — KPIs principales por rol."""
    permission_classes = [IsAuthenticated, IsAnyStaff]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        # Activos activos
        assets_qs = Asset.objects.filter(is_active=True)

        # KPIs base
        total_assets     = assets_qs.count()
        total_components = assets_qs.filter(parent_asset__isnull=False).count()
        critical_it      = assets_qs.filter(is_critical_it=True).count()
        fully_dep        = assets_qs.filter(is_fully_depreciated=True).count()
        needs_maint      = assets_qs.filter(requires_maintenance=True).count()

        # Por categoría
        by_category = list(
            assets_qs.values("category")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        # Por estado
        by_status = list(
            assets_qs.values("status")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        # Por agencia
        by_agency = list(
            assets_qs.filter(agency__isnull=False)
            .values("agency__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # Últimos 5 ingresos
        from apps.audit.models import AuditLog, AuditAction
        recent_ingresos = list(
            AuditLog.objects.filter(action=AuditAction.ASSET_ACTIVATION)
            .order_by("-action_date")[:5]
            .values("object_code", "object_name", "action_date", "user_email")
        )

        # Solo para contabilidad: valores financieros
        financial = {}
        if user.role in ("ADMIN", "CONTABILIDAD"):
            # Suma de purchase_value no es posible directamente con cifrado
            # Retornamos un conteo por ahora
            financial = {
                "total_assets_with_value": assets_qs.count(),
                "fully_depreciated_count": fully_dep,
                "sales_count": 0,  # TODO: cuando venta esté activa
            }

        return Response({
            "total_assets":      total_assets,
            "total_components":  total_components,
            "critical_it":       critical_it,
            "fully_deprecated":  fully_dep,
            "needs_maintenance": needs_maint,
            "alerts_unresolved": 0,
            "by_category":       by_category,
            "by_status":         by_status,
            "by_agency":         by_agency,
            "recent_activity":   recent_ingresos,
            "financial":         financial,
            "generated_at":      timezone.now().isoformat(),
        })


class AssetsByMonthView(APIView):
    """GET /api/v1/reports/assets-by-month/ — ingresos mensuales últimos 12 meses."""
    permission_classes = [IsAuthenticated, IsAnyStaff]

    def get(self, request):
        from django.db.models.functions import TruncMonth
        from datetime import timedelta
        cutoff = timezone.now().date() - timedelta(days=365)
        data = (
            Asset.objects
            .filter(created_at__date__gte=cutoff)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        return Response([
            {"month": str(row["month"])[:7], "count": row["count"]}
            for row in data
        ])


class ExportInventoryCSVView(APIView):
    """GET /api/v1/reports/export/inventory/ — CSV de inventario completo."""
    permission_classes = [IsAuthenticated, IsAnyStaff]

    def get(self, request):
        qs = Asset.objects.select_related(
            "agency", "department", "area", "parent_asset"
        ).filter(is_active=True).order_by("asset_code")

        # Filtros opcionales
        category = request.query_params.get("category")
        status   = request.query_params.get("status")
        agency   = request.query_params.get("agency")
        if category:
            qs = qs.filter(category=category)
        if status:
            qs = qs.filter(status=status)
        if agency:
            qs = qs.filter(agency_id=agency)

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="inventario_activos.csv"'
        response.write("\ufeff")  # BOM para Excel

        writer = csv.writer(response)
        writer.writerow([
            "Código", "Nombre", "Categoría", "Estado", "Marca", "Modelo", "Serie",
            "Agencia", "Departamento", "Área",
            "Fecha compra", "Proveedor", "Factura",
            "Vida útil (años)", "Tasa dep. (%)", "Cuenta SEPS",
            "F. garantía", "En mantenimiento", "TI crítico",
            "Activo principal", "Tipo componente",
            "QR UUID", "Creado en",
        ])

        for asset in qs:
            writer.writerow([
                asset.asset_code,
                asset.name,
                asset.get_category_display(),
                asset.get_status_display(),
                asset.brand or "",
                asset.model or "",
                asset.serial_number or "",
                asset.agency.name if asset.agency else "",
                asset.department.name if asset.department else "",
                asset.area.name if asset.area else "",
                str(asset.purchase_date or ""),
                asset.supplier or "",
                asset.invoice_number or "",
                asset.useful_life_years or "",
                asset.depreciation_rate or "",
                asset.seps_account_code or "",
                str(asset.warranty_expiry or ""),
                "Sí" if asset.requires_maintenance else "No",
                "Sí" if asset.is_critical_it else "No",
                asset.parent_asset.asset_code if asset.parent_asset else "",
                asset.get_component_type_display() if asset.component_type else "",
                str(asset.qr_uuid),
                str(asset.created_at.date()),
            ])

        return response


class ExportDepreciationCSVView(APIView):
    """GET /api/v1/reports/export/depreciation/ — CSV de depreciación (LORTI Art. 28)."""
    permission_classes = [IsAuthenticated, IsAnyStaff]

    def get(self, request):
        return Response({"detail": "Módulo de contabilidad desactivado."}, status=501)
        from apps.accounting.models import DepreciationSchedule
        qs = DepreciationSchedule.objects.select_related(
            "asset", "asset__agency"
        ).order_by("asset__asset_code", "period_year", "period_month")

        year = request.query_params.get("year")
        if year:
            qs = qs.filter(period_year=year)

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="depreciacion.csv"'
        response.write("\ufeff")

        writer = csv.writer(response)
        writer.writerow([
            "Código activo", "Nombre", "Categoría", "Cuenta SEPS",
            "Año", "Mes", "Fecha periodo",
            "Valor apertura", "Dep. mensual", "Dep. acumulada", "Valor cierre",
            "Procesado",
        ])

        for row in qs:
            writer.writerow([
                row.asset.asset_code,
                row.asset.name,
                row.asset.get_category_display(),
                row.asset.seps_account_code or "",
                row.period_year,
                row.period_month,
                str(row.period_date),
                row.opening_value,
                row.monthly_depreciation,
                row.accumulated,
                row.closing_value,
                "Sí" if row.is_processed else "No",
            ])

        return response


class ExportSEPSView(APIView):
    """GET /api/v1/reports/export/seps/ — Reporte SEPS de activos fijos por cuenta contable."""
    permission_classes = [IsAuthenticated, IsAnyStaff]

    def get(self, request):
        qs = Asset.objects.select_related("agency").filter(
            is_active=True, parent_asset__isnull=True  # Solo activos principales
        ).order_by("seps_account_code", "asset_code")

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="reporte_seps.csv"'
        response.write("\ufeff")

        writer = csv.writer(response)
        writer.writerow([
            "Cuenta SEPS", "Descripción cuenta",
            "Código activo", "Nombre", "Categoría",
            "Fecha compra", "Vida útil", "Tasa dep. (%)",
            "Agencia", "Estado",
            "Totalmente depreciado", "Requiere mantenimiento",
        ])

        SEPS_DESC = {
            "1801": "Terrenos",
            "1803": "Maquinaria y equipo",
            "1804": "Muebles y enseres",
            "1805": "Equipos de cómputo",
            "1806": "Vehículos",
            "1807": "Equipos de comunicación",
            "1899": "Otros activos fijos",
        }

        for asset in qs:
            writer.writerow([
                asset.seps_account_code or "1899",
                SEPS_DESC.get(asset.seps_account_code or "1899", "Otros"),
                asset.asset_code,
                asset.name,
                asset.get_category_display(),
                str(asset.purchase_date or ""),
                asset.useful_life_years or "",
                asset.depreciation_rate or "",
                asset.agency.name if asset.agency else "",
                asset.get_status_display(),
                "Sí" if asset.is_fully_depreciated else "No",
                "Sí" if asset.requires_maintenance else "No",
            ])

        return response

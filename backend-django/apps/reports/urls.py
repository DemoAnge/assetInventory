from django.urls import path
from .views import (
    DashboardStatsView, AssetsByMonthView,
    ExportInventoryCSVView, ExportInventoryExcelView,
    ExportSEPSCSVView, ExportSEPSExcelView,
    ExportBajasCSVView, ExportBajasExcelView,
    ExportMovementsCSVView, ExportMovementsExcelView,
    ExportDepreciationCSVView, ExportDepreciationExcelView,
)

urlpatterns = [
    path("dashboard/",                    DashboardStatsView.as_view(),         name="dashboard-stats"),
    path("assets-by-month/",              AssetsByMonthView.as_view(),          name="assets-by-month"),
    # Inventario
    path("export/inventory/",             ExportInventoryCSVView.as_view(),     name="export-inventory-csv"),
    path("export/inventory/excel/",       ExportInventoryExcelView.as_view(),   name="export-inventory-excel"),
    # SEPS
    path("export/seps/",                  ExportSEPSCSVView.as_view(),          name="export-seps-csv"),
    path("export/seps/excel/",            ExportSEPSExcelView.as_view(),        name="export-seps-excel"),
    # Bajas
    path("export/bajas/",                 ExportBajasCSVView.as_view(),         name="export-bajas-csv"),
    path("export/bajas/excel/",           ExportBajasExcelView.as_view(),       name="export-bajas-excel"),
    # Movimientos
    path("export/movements/",             ExportMovementsCSVView.as_view(),     name="export-movements-csv"),
    path("export/movements/excel/",       ExportMovementsExcelView.as_view(),   name="export-movements-excel"),
    # Depreciación
    path("export/depreciation/",          ExportDepreciationCSVView.as_view(),  name="export-depreciation-csv"),
    path("export/depreciation/excel/",    ExportDepreciationExcelView.as_view(),name="export-depreciation-excel"),
]

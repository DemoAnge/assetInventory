from django.urls import path
from .views import (
    DashboardStatsView, AssetsByMonthView,
    ExportInventoryCSVView, ExportDepreciationCSVView, ExportSEPSView,
)

urlpatterns = [
    path("dashboard/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("assets-by-month/", AssetsByMonthView.as_view(), name="assets-by-month"),
    path("export/inventory/", ExportInventoryCSVView.as_view(), name="export-inventory"),
    path("export/depreciation/", ExportDepreciationCSVView.as_view(), name="export-depreciation"),
    path("export/seps/", ExportSEPSView.as_view(), name="export-seps"),
]

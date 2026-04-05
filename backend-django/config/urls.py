from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/v1/auth/", include("apps.users.urls")),

    # Módulos
    path("api/v1/locations/", include("apps.locations.urls")),
    path("api/v1/assets/", include("apps.assets.urls")),
    path("api/v1/accounting/", include("apps.accounting.urls")),
    path("api/v1/it/", include("apps.it_module.urls")),
    path("api/v1/movements/", include("apps.movements.urls")),
    path("api/v1/maintenance/", include("apps.maintenance.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/documents/", include("apps.documents.urls")),
    path("api/v1/invoice-agent/", include("apps.invoice_agent.urls")),
    path("api/v1/audit/", include("apps.audit.urls")),
    path("api/v1/alerts/", include("apps.alerts.urls")),
    path("api/v1/compliance/", include("apps.compliance.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

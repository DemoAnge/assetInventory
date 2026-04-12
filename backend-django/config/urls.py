from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth
    path("api/v1/auth/", include("apps.users.urls")),

    # Módulos activos
    path("api/v1/custodians/", include("apps.custodians.urls")),
    path("api/v1/locations/",  include("apps.locations.urls")),
    path("api/v1/assets/",     include("apps.assets.urls")),
    path("api/v1/it/",         include("apps.it_module.urls")),
    path("api/v1/movements/",  include("apps.movements.urls")),
    path("api/v1/maintenance/",include("apps.maintenance.urls")),
    path("api/v1/reports/",    include("apps.reports.urls")),
    path("api/v1/documents/",  include("apps.documents.urls")),
    # apps.accounting / invoice_agent / alerts / compliance: eliminados del API
    # apps.audit: INSTALLED_APPS lo mantiene (AuditLog interno), pero sin endpoint público
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

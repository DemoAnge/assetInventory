from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve

from config.health import HealthView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthView.as_view(), name="health"),

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
    path("api/v1/settings/",   include("apps.user_settings.urls")),
    # apps.audit: INSTALLED_APPS lo mantiene (AuditLog interno), sin endpoint público
]

# django.conf.urls.static solo registra rutas si DEBUG=True.
# En compose/prod sin nginx de media, las fotos de factura deben seguir sirviéndose.
urlpatterns += [
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]

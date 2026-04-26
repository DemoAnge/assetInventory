"""Middleware que registra peticiones HTTP críticas automáticamente."""
import logging

logger = logging.getLogger("apps.audit")

AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
EXCLUDED_PATHS = {"/api/v1/auth/token/refresh/", "/admin/"}


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if (
            request.method in AUDITED_METHODS
            and request.path not in EXCLUDED_PATHS
            and hasattr(request, "user")
            and request.user.is_authenticated
            and response.status_code >= 400
        ):
            logger.warning(
                "Petición fallida: %s %s | Usuario: %s | Status: %s | IP: %s",
                request.method,
                request.path,
                request.user.email,
                response.status_code,
                request.META.get("REMOTE_ADDR"),
            )

        return response

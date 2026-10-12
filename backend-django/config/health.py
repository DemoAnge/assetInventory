"""GET /api/v1/health/ — liveness + chequeo de base de datos. Sin secretos."""
from django.conf import settings
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        db_ok = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            db_ok = False
        payload = {
            "status": "ok" if db_ok else "degraded",
            "service": "django",
            "version": getattr(settings, "SYSTEM_VERSION", ""),
            "db": "ok" if db_ok else "error",
        }
        return Response(payload, status=200 if db_ok else 503)

"""Utilidades compartidas del sistema."""
import hashlib
from django.http import HttpRequest


def get_client_ip(request: HttpRequest) -> str:
    """Obtiene la IP real del cliente considerando proxies."""
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "0.0.0.0")


def build_changed_fields(old_instance, new_instance, fields: list[str]) -> dict:
    """Compara campos de dos instancias y retorna un dict de cambios."""
    changes = {}
    for field in fields:
        old_val = getattr(old_instance, field, None)
        new_val = getattr(new_instance, field, None)
        if str(old_val) != str(new_val):
            changes[field] = {"before": str(old_val), "after": str(new_val)}
    return changes


def mask_sensitive(value: str, visible: int = 4) -> str:
    """Enmascara valores sensibles mostrando solo los últimos N caracteres."""
    if not value or len(value) <= visible:
        return "****"
    return f"{'*' * (len(value) - visible)}{value[-visible:]}"

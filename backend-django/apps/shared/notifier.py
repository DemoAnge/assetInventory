"""
Módulo para enviar notificaciones en tiempo real al servidor Node.js/Socket.IO.
Cada llamada se ejecuta en un hilo daemon separado (fire-and-forget).
Si el servidor Node no está disponible, solo se registra un warning y Django continúa.
"""
import json
import threading
import time
import logging
from typing import Literal, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError

from django.conf import settings

logger = logging.getLogger(__name__)

NotificationType = Literal["info", "warning", "error", "success"]


def _service_token() -> str:
    """JWT de servicio para autenticarse con el endpoint interno de Node.js."""
    import jwt as pyjwt
    secret = getattr(settings, "NODE_JWT_SECRET", settings.SECRET_KEY)
    payload = {
        "sub": "django-service",
        "role": "SERVICE",
        "iat": int(time.time()),
        "exp": int(time.time()) + 60,
    }
    return pyjwt.encode(payload, secret, algorithm="HS256")


def _post(payload: dict) -> None:
    node_url = getattr(settings, "NODE_URL", "http://localhost:4000")
    try:
        body = json.dumps(payload).encode("utf-8")
        req  = Request(
            f"{node_url}/api/notifications/broadcast",
            data=body,
            headers={
                "Content-Type":  "application/json",
                "Authorization": f"Bearer {_service_token()}",
            },
            method="POST",
        )
        with urlopen(req, timeout=2):
            pass
    except URLError as exc:
        logger.debug(f"[Notifier] Node no disponible: {exc.reason}")
    except Exception as exc:
        logger.warning(f"[Notifier] Error inesperado: {exc}")


def _fire(payload: dict) -> None:
    threading.Thread(target=_post, args=(payload,), daemon=True).start()


# ── API pública ────────────────────────────────────────────────────────────────

def notify_role(
    role: str,
    title: str,
    message: str,
    type_: NotificationType = "info",
    module: Optional[str] = None,
    link: Optional[str] = None,
) -> None:
    """Notificación push a todos los usuarios de un rol (ADMIN, TI, etc.)."""
    notification: dict = {"title": title, "message": message, "type": type_}
    if module: notification["module"] = module
    if link:   notification["link"]   = link
    _fire({"role": role, "notification": notification})


def notify_user(
    user_id: int,
    title: str,
    message: str,
    type_: NotificationType = "info",
    module: Optional[str] = None,
    link: Optional[str] = None,
) -> None:
    """Notificación push a un usuario específico."""
    notification: dict = {"title": title, "message": message, "type": type_}
    if module: notification["module"] = module
    if link:   notification["link"]   = link
    _fire({"userId": user_id, "notification": notification})


def notify_all(
    title: str,
    message: str,
    type_: NotificationType = "info",
    module: Optional[str] = None,
) -> None:
    """Broadcast a todos los usuarios conectados."""
    notification: dict = {"title": title, "message": message, "type": type_}
    if module: notification["module"] = module
    _fire({"notification": notification})

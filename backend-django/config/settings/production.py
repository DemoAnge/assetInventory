from .base import *
from decouple import config

DEBUG = False

ALLOWED_HOSTS = [
    h.strip() for h in config("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",") if h.strip()
]

MIDDLEWARE = list(MIDDLEWARE)
if "whitenoise.middleware.WhiteNoiseMiddleware" not in MIDDLEWARE:
    _sec = MIDDLEWARE.index("django.middleware.security.SecurityMiddleware")
    MIDDLEWARE.insert(_sec + 1, "whitenoise.middleware.WhiteNoiseMiddleware")

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

# TLS lo activa el proxy. En compose local queda en False.
SECURE_SSL_REDIRECT = config("DJANGO_SSL_REDIRECT", default=False, cast=bool)
SESSION_COOKIE_SECURE = SECURE_SSL_REDIRECT
CSRF_COOKIE_SECURE = SECURE_SSL_REDIRECT
SECURE_HSTS_SECONDS = 31536000 if SECURE_SSL_REDIRECT else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_SSL_REDIRECT
SECURE_HSTS_PRELOAD = SECURE_SSL_REDIRECT
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

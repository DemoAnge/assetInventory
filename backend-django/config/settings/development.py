from .base import *

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

INSTALLED_APPS += ["django_extensions"]

# En dev, mostrar emails en consola
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
